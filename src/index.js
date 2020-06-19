import { CommandAppError } from './CommandError';
import glob from 'glob';
import parser from 'yargs-parser';
import path from 'path';
import parseOptions, { validate } from './options';
import type { Argv, CommandOptions, CommandPositionals } from './options';

export type { Argv } from './options';

export type Config = { ignoreCommands?: RegExp, rootDir?: string, subcommandDir?: string };
export type GlobalOptions = { verbose?: number };

const ignoreCommandRegex = /(\/__\w+__\/|\.test\.)/;

export default async function bootstrap(
  config?: Config,
  globalOptions?: GlobalOptions,
  inputArgs?: string = process.argv.slice(2).join(' ')
) {
  const { ignoreCommands = ignoreCommandRegex, rootDir = process.cwd(), subcommandDir } = config || {};
  const { verbose = 0 } = globalOptions || {};
  const { _: commands, help, ...argv } = parser(inputArgs, {
    alias: { help: 'h' },
    boolean: ['help'],
    configuration: yargsConfiguration,
    default: { help: false },
    string: ['help-format'],
  });

  const resolvedSubcommandDir =
    typeof subcommandDir === 'string' && subcommandDir.length ? path.join(rootDir, subcommandDir) : rootDir;

  if (Boolean(help) && commands.length === 0) {
    const commands = glob
      .sync(`${resolvedSubcommandDir}/**/*`, {
        nodir: true,
      })
      .filter((commandPath) => !ignoreCommands.test(commandPath))
      .map((commandPath) => ({
        command: path.relative(resolvedSubcommandDir, commandPath).replace('.js', '').split('/').join(' '),
        path: path.relative(rootDir, commandPath),
        source: require(commandPath),
      }));
    console.log(commands);
    return;
  }

  const { description, handler, options = {}, positionals = {}, middleware = [] } = resolveCommand(commands, {
    rootDir,
    subcommandDir,
    verbose,
  });

  if (Boolean(help)) {
    console.log(options);
    return;
  }

  const { _: parsedPositionals, ...parsedArgs } = parser(inputArgs, {
    ...parseOptions(options),
    configuration: yargsConfiguration,
  });
  const positionalKeys = Reflect.ownKeys(positionals);
  const finalArgs: Argv<CommandPositionals, CommandOptions> = {
    ...parsedArgs,
    _: parsedPositionals.reduce((memo, value, i) => {
      if (positionals[positionalKeys[i]].greedy) {
        memo[positionalKeys[i]] = [value];
      }
      memo[positionalKeys[i]] = value;
      return memo;
    }, {}),
  };

  try {
    validate(finalArgs, positionals, options);
  } catch (e) {
    console.error(e);
    return;
  }

  await handler(finalArgs);
}

export function resolveCommand(
  commands: Array<string>,
  { rootDir, subcommandDir, verbose }: { rootDir: string, subcommandDir?: string, verbose: number }
) {
  let command, commandPath;
  const commandDir = path.join(rootDir, subcommandDir || '');
  for (let i = commands.length; i > 0; i--) {
    const subcommand = commands.slice(0, i);
    commandPath = path.join(commandDir, subcommand.join(path.sep));
    try {
      if (verbose > 0) {
        console.log(`Looking for subcommand "${subcommand.join(' ')}" at ${commandPath}`);
      }
      return require(commandPath);
    } catch (e) {}
  }

  throw new CommandAppError(`Command not found "${commands.join(' ')}"\n`);
}

export type Middleware = (args: {}) => Promise<{}>;

export const yargsConfiguration = { 'camel-case-expansion': false, 'dot-notation': false, 'strip-aliased': true };
