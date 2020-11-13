// @flow
import chalk from 'chalk';
import glob from 'glob';
import formatHelp, { formatTypes } from './docs';
import Logger from './logger';
import path from 'path';
import optionsToParserOptions, { validate } from './options';
import parser, { type YargsParserOptions } from 'yargs-parser';
import type { Argv, Command, Options, Positionals } from './options';

export type { Argv, Command } from './options';
export { default as Logger } from './logger';
export type Config = {|
  ignoreCommands?: RegExp,
  description?: string,
  name?: string,
  options?: Options,
  rootDir?: string,
  subcommandDir?: string,
|};

export type GlobalOptions = {|
  verbose?: number,
  'logger-async'?: boolean,
  useColor?: boolean,
|};

const ignoreCommandRegex = /(\/__\w+__\/|\.test\.|\.spec\.)/;

const yargsConfiguration = { 'camel-case-expansion': false, 'dot-notation': false, 'strip-aliased': true };

export default async function bootstrap(
  config?: Config,
  globalOptions?: GlobalOptions,
  inputArgs: string = process.argv.slice(2).join(' '),
  commandRequire: typeof require = require
) {
  const { ignoreCommands = ignoreCommandRegex, rootDir = process.cwd(), subcommandDir } = config || {};
  const { verbose = 0, 'logger-async': defaultInterleave = false, useColor = chalk.supportsColor } =
    globalOptions || {};

  const globalCommandOptions = Object.freeze({
    help: { alias: 'h', description: 'Get help documentation', type: 'boolean' },
    'help-format': {
      description: 'Get help documentation in the given format',
      type: 'string',
      choices: formatTypes,
    },
    'logger-async': {
      type: 'boolean',
      description: 'Allow logger to interleave output of parallel asynchronous child loggers',
      default: false,
    },
    verbosity: {
      alias: 'v',
      type: 'count',
      description: "Increase the logger's verbosity",
      default: 0,
    },
  });

  const { _: inputCommand, help, 'help-format': helpFormatInput, 'logger-async': loggerAsync, verbosity } = parser(
    inputArgs,
    optionsToParserOptions(globalCommandOptions)
  );

  const helpFormat = typeof helpFormatInput === 'string' ? helpFormatInput : undefined;

  const logger = new Logger({ interleave: Boolean(loggerAsync), useColor, verbosity: parseInt(verbosity, 10) });

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
    if (Boolean(help)) {
      const { name = process.argv[1], description = '', options = {} } = config || {};
      logger.log(
        await formatHelp(
          [
            {
              command: name,
              description,
              handler: async () => {},
              options: {
                ...options,
                ...globalCommandOptions,
              },
              positionals: {},
              middleware: [],
              examples: [],
            },
            ...commands,
          ],
          helpFormat
        )
      );
      return;
    }
    logger.error(commands);
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
    const { matchedAlias, ...command } = resolvedCommand;
    logger.log(await formatHelp(command, helpFormat));
    return;
  }

  const { _: parsedPositionals, ...parsedArgs } = parser(inputArgs, {
    ...optionsToParserOptions({ ...options, ...globalCommandOptions }),
    configuration: yargsConfiguration,
  });
  const inputPositionals = parsedPositionals.slice(
    (typeof alias === 'string' && matchedAlias ? alias : command).split(' ').length
  );
  const positionalKeys = Reflect.ownKeys(positionals);
  const finalArgs: Argv<Positionals, Options> = {
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
    ...globalCommandOptions,
  });
  if (!errorReport._isValid) {
    console.log(errorReport);
    logger.error(errorReport);
    return;
  }

  await handler(finalArgs, logger);
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
