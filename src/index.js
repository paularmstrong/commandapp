// @flow
import glob from 'glob';
import Logger from './logger';
import parser from 'yargs-parser';
import path from 'path';
import parseOptions, { validate } from './options';
import type { Argv, CommandOptions, CommandPositionals } from './options';

export type { Argv } from './options';
export type Middleware = (args: {}) => Promise<{}>;
export type Config = { ignoreCommands?: RegExp, rootDir?: string, subcommandDir?: string };
export type GlobalOptions = { verbose?: number };

type Command = {
  alias?: string,
  command: string,
  description: string,
  examples: Array<string>,
  handler: <T>(args: T) => Promise<void>,
  middleware: Middleware,
  options: CommandOptions,
  positionals: CommandPositionals,
};

const ignoreCommandRegex = /(\/__\w+__\/|\.test\.|\.spec\.)/;

const yargsConfiguration = { 'camel-case-expansion': false, 'dot-notation': false, 'strip-aliased': true };

export default async function bootstrap(
  config?: Config,
  globalOptions?: GlobalOptions,
  inputArgs: string = process.argv.slice(2).join(' '),
  commandRequire: typeof require = require
) {
  const { ignoreCommands = ignoreCommandRegex, rootDir = process.cwd(), subcommandDir } = config || {};
  const { verbose = 0 } = globalOptions || {};
  const { _: inputCommand, help, verbosity, ...argv } = parser(inputArgs, {
    alias: { help: 'h', verbosity: 'v' },
    boolean: ['help'],
    configuration: yargsConfiguration,
    count: ['verbosity'],
    default: { help: false, verbosity: verbose },
    string: ['help-format'],
  });

  const logger = new Logger({ verbosity: parseInt(verbosity, 10) });

  const resolvedSubcommandDir =
    typeof subcommandDir === 'string' && subcommandDir.length ? path.join(rootDir, subcommandDir) : rootDir;

  const commands: Array<Command> = glob
    .sync(`${resolvedSubcommandDir}/**/*`, {
      nodir: true,
    })
    .filter((commandPath) => !ignoreCommands.test(commandPath))
    .map((commandPath) => {
      const source = commandRequire(commandPath);
      const command = path
        .relative(resolvedSubcommandDir, commandPath)
        .replace('.js', '')
        .split('/')
        .join(' ')
        .replace(' index', '');

      if (!source.description) {
        throw new Error(`Missing description for "${command}"`);
      }

      if (!source.handler) {
        throw new Error(`Missing handler for "${command}"`);
      }

      return {
        examples: [],
        positionals: {},
        options: {},
        middleware: [],
        ...source,
        alias: source.alias ? command.replace(/[\w-]+$/, source.alias) : undefined,
        command,
        path: path.relative(rootDir, commandPath),
      };
    });

  const resolvedCommand = resolveCommand(commands, inputCommand);

  if (!resolvedCommand) {
    logger.error(JSON.stringify(commands, null, 2));
    return;
  }

  const {
    alias,
    command,
    description,
    handler,
    options = {},
    positionals = {},
    matchedAlias = false,
    middleware = [],
  } = resolvedCommand;

  if (Boolean(help)) {
    console.log(options);
    return;
  }

  const { _: parsedPositionals, ...parsedArgs } = parser(inputArgs, {
    ...parseOptions(options),
    configuration: yargsConfiguration,
  });
  const inputPositionals = parsedPositionals.slice(
    (typeof alias === 'string' && matchedAlias ? alias : command).split(' ').length
  );
  const positionalKeys = Reflect.ownKeys(positionals);
  const finalArgs: Argv<CommandPositionals, CommandOptions> = {
    ...parsedArgs,
    _: positionalKeys.reduce((memo, positionalKey, i) => {
      const opts = positionals[positionalKey];
      if (opts.greedy) {
        if (i + 1 !== positionalKeys.length) {
          throw new Error(
            `Positional "${positionalKey}" defined as "greedy", but cannot be because it is not the last positional option`
          );
        }
        memo[positionalKey] = inputPositionals.slice(i);
      } else {
        memo[positionalKey] = inputPositionals[i];
      }
      return memo;
    }, {}),
  };

  const errorReport = validate(finalArgs, positionals, {
    ...options,
    verbosity: { type: 'count', description: 'increase verbosity for more log output' },
  });
  if (!errorReport._isValid) {
    logger.error(JSON.stringify(errorReport, null, 2));
    return;
  }

  await handler(finalArgs);
}

export function resolveCommand(
  commands: Array<Command>,
  positionalInput: Array<string>
): { ...Command, matchedAlias: boolean } | void {
  for (let i = positionalInput.length; i > 0; i--) {
    const subcommand = positionalInput.slice(0, i).join(' ');
    const commandMatch = commands.find(({ command }) => subcommand === command);
    if (commandMatch) {
      return { ...commandMatch, matchedAlias: false };
    }

    const aliasMatch = commands.find(({ alias }) => subcommand === alias);
    if (aliasMatch) {
      return { ...aliasMatch, matchedAlias: true };
    }
  }
}
