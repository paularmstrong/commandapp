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

  const requireCommand = (commandPath) => {
    const source = commandRequire(commandPath);
    const command = _mapPathToCommandString(commandPath, resolvedSubcommandDir);
    return {
      alias: [],
      examples: [],
      options: {},
      positionals: {},
      ...source,
      command,
      path: path.relative(rootDir, commandPath),
    };
  };

  const commandPaths: Array<string> = glob
    .sync(`${resolvedSubcommandDir}/**/*`, {
      nodir: true,
    })
    .filter((commandPath) => !ignoreCommands.test(commandPath));

  const resolvedCommandPath = resolveCommandPath(commandPaths, inputCommand, resolvedSubcommandDir);

  if (typeof resolvedCommandPath !== 'string') {
    if (Boolean(help)) {
      const aliasMap: { [key: string]: Array<string> } = {};
      const commands = commandPaths
        .reduce((memo, commandPath) => {
          const source = requireCommand(commandPath);

          if (source.aliasof) {
            const { alias, command } = _resolveAlias(source.aliasof, commandPath, resolvedSubcommandDir);
            if (!Array.isArray(aliasMap[command])) {
              aliasMap[command] = [];
            }
            aliasMap[command].push(alias);
            return memo;
          }

          memo.push(source);
          return memo;
        }, [])
        .map((command) => {
          if (command.command in aliasMap) {
            command.alias.push(...aliasMap[command.command]);
          }
          return command;
        });

      const { name = process.argv[1], description = '', options = {} } = config || {};
      logger.plain(
        await formatHelp(
          [
            {
              command: name,
              alias: [],
              description,
              handler: async () => {},
              options: {
                ...options,
                ...globalCommandOptions,
              },
              positionals: {},
              examples: [],
            },
            ...commands,
          ],
          helpFormat
        )
      );
      return;
    }
    return;
  }

  let { aliasof, ...resolvedCommand } = requireCommand(resolvedCommandPath);
  let alias: string | void;

  if (aliasof) {
    const resolved = _resolveAlias(aliasof, resolvedCommandPath, resolvedSubcommandDir);
    alias = resolved.alias;
    resolvedCommand = requireCommand(resolved.commandPath);
  }
  const { command, description, handler, options = {}, positionals = {}, middleware = [] } = resolvedCommand;

  if (!description) {
    throw new Error(`Missing description for "${command}"`);
  }

  if (!handler) {
    throw new Error(`Missing handler for "${command}"`);
  }

  if (Boolean(help)) {
    logger.plain(await formatHelp(resolvedCommand, helpFormat));
    return;
  }

  const { _: parsedPositionals, ...parsedArgs } = parser(inputArgs, {
    ...optionsToParserOptions({ ...options, ...globalCommandOptions }),
    configuration: yargsConfiguration,
  });
  const inputPositionals = parsedPositionals.slice((typeof alias === 'string' ? alias : command).split(' ').length);
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

function _resolveAlias(
  aliasof: string,
  filepath: string,
  resolvedSubcommandDir: string
): {| alias: string, command: string, commandPath: string |} {
  const commandPath = path.resolve(path.dirname(filepath), aliasof);
  const alias = _mapPathToCommandString(filepath, resolvedSubcommandDir);
  const command = _mapPathToCommandString(commandPath, resolvedSubcommandDir);
  return { alias, command, commandPath };
}

function _mapPathToCommandString(commandPath: string, resolvedSubcommandDir: string): string {
  return path
    .relative(resolvedSubcommandDir, commandPath)
    .replace('.js', '')
    .split('/')
    .join(' ')
    .replace(' index', '');
}

export function resolveCommandPath(
  commandPaths: Array<string>,
  positionalInput: Array<string>,
  resolvedSubcommandDir: string
): string | void {
  for (let i = positionalInput.length; i > 0; i--) {
    const subcommand = positionalInput.slice(0, i).join(' ');
    const commandMatch = commandPaths.find(
      (command) => subcommand === _mapPathToCommandString(command, resolvedSubcommandDir)
    );
    if (typeof commandMatch === 'string' && commandMatch.length > 0) {
      return commandMatch;
    }
  }
}
