// @flow
import { type YargsParserOptions } from 'yargs-parser';

type CommandOption = {|
  alias?: Array<string> | string,
  description: string,
  normalize?: boolean,
|};

type ArrayOption = {| ...CommandOption, type: 'array' |};
type ArrayOptionRequired = {| ...ArrayOption, required: true |};
type ArrayOptionDefault = {| ...ArrayOption, default: Array<string> |};

type BooleanOption = {| ...CommandOption, type: 'boolean' |};
type BooleanOptionRequired = {| ...BooleanOption, required: true |};
type BooleanOptionDefault = {| ...BooleanOption, default: boolean |};

type CountOption = {| ...CommandOption, type: 'count' |};
type CountOptionRequired = {| ...CountOption, required: true |};
type CountOptionDefault = {| ...CountOption, default: number |};

type NumberOption = {| ...CommandOption, type: 'number' |};
type NumberOptionRequired = {| ...NumberOption, required: true |};
type NumberOptionDefault = {| ...NumberOption, default: number |};

type StringOption = {| ...CommandOption, type: 'string', choices?: Array<string> |};
type StringOptionRequired = {| ...StringOption, required: true |};
type StringOptionDefault = {| ...StringOption, default: string |};

type ExtractArrayOption = ((ArrayOptionDefault) => Array<string>) &
  ((ArrayOptionRequired) => Array<string>) &
  ((ArrayOption) => Array<string> | void);
type ExtractBooleanOption = ((BooleanOptionDefault) => boolean) &
  ((BooleanOptionRequired) => boolean) &
  ((BooleanOption) => boolean);
type ExtractCountOption = ((CountOptionDefault) => number) &
  ((CountOptionRequired) => number) &
  ((CountOption) => number);
type ExtractNumberOption = ((NumberOptionDefault) => number) &
  ((NumberOptionRequired) => number) &
  ((NumberOption) => number | void);
type ExtractStringOption = ((StringOptionDefault) => string) &
  ((StringOptionRequired) => string) &
  ((StringOption) => string | void);

type ExtractOption = ExtractArrayOption &
  ExtractBooleanOption &
  ExtractCountOption &
  ExtractNumberOption &
  ExtractStringOption;

export type Options = {|
  [key: string]:
    | ArrayOption
    | ArrayOptionDefault
    | ArrayOptionRequired
    | BooleanOption
    | BooleanOptionDefault
    | BooleanOptionRequired
    | CountOption
    | CountOptionDefault
    | CountOptionRequired
    | NumberOption
    | NumberOptionDefault
    | NumberOptionRequired
    | StringOption
    | StringOptionDefault
    | StringOptionRequired,
|};

type Positional = {|
  description: string,
  choices?: Array<string>,
|};

type RequiredPositional = {| ...Positional, required: true |};
type GreedyPositional = {| ...Positional, greedy: true |};

type ExtractPlainPositional = (Positional) => string | void;
type ExtractRequiredPositional = (RequiredPositional) => string;
type ExtractGreedyPositional = (GreedyPositional) => Array<string>;

type ExtractPositional = ExtractRequiredPositional & ExtractGreedyPositional & ExtractPlainPositional;

export type Positionals = {|
  [key: string]: GreedyPositional | RequiredPositional | Positional,
|};

export type Argv<pos: Positionals, opts: Options> = {|
  ...$ObjMap<opts, ExtractOption>,
  _: $ObjMap<pos, ExtractPositional>,
|};

export type Examples = Array<{ code: string, description: string }>;
export type Middleware = (args: {}) => Promise<{}>;
export type Command = {
  alias?: string,
  command: string,
  description: string,
  examples: Examples,
  handler: <T>(args: T) => Promise<void>,
  middleware?: Array<Middleware>,
  options: Options,
  positionals: Positionals,
};

export default function parseOptions(options: Options): YargsParserOptions {
  const parserOptions = {
    alias: { help: 'h', verbosity: 'v' },
    array: [],
    boolean: ['help'],
    count: ['verbosity'],
    default: { verbosity: 0 },
    normalize: [],
    number: [],
    string: [],
  };

  Object.keys(options).forEach((argKey) => {
    const { alias, normalize, type, ...rest } = options[argKey];
    if (!(type in parserOptions)) {
      throw new Error(`Option "${argKey}" has invalid type "${type}"`);
    }
    parserOptions[type].push(argKey);

    if (Array.isArray(alias) || typeof alias === 'string') {
      parserOptions.alias[argKey] = alias;
    }

    if (rest.hasOwnProperty('default')) {
      // $FlowFixMe checking if property exists, which is entirely possible
      parserOptions.default[argKey] = rest.default;
    }

    if (type === 'string' && typeof normalize === 'boolean' && normalize) {
      parserOptions.normalize.push(argKey);
    }
  });

  return parserOptions;
}

function getRequiredOptions(options: Options | Positionals): Array<string> {
  return Object.keys(options).reduce((memo, argKey) => {
    if ('required' in options[argKey] && typeof options[argKey].required === 'boolean' && options[argKey].required) {
      memo.push(argKey);
    }
    return memo;
  }, []);
}

export function validate<P: Positionals, O: Options>(
  argv: Argv<P, O>,
  positionals: P,
  options: O
): { _isValid: boolean, _: { [key: string]: Array<Error> }, _unknown: Array<Error>, [key: string]: Array<Error> } {
  const errors = Object.keys(options).reduce(
    (memo, key) => {
      memo[key] = [];
      return memo;
    },
    {
      _isValid: true,
      _: Object.keys(positionals).reduce((memo, key) => {
        memo[key] = [];
        return memo;
      }, {}),
      _unknown: [],
    }
  );
  getRequiredOptions(options).forEach((requiredKey) => {
    if (!(requiredKey in argv)) {
      errors[requiredKey].push(new Error(`No value provided for required argument "--${requiredKey}"`));
      errors._isValid = false;
    }
  });

  getRequiredOptions(positionals).forEach((requiredPositional) => {
    if (!(requiredPositional in argv._)) {
      errors._[requiredPositional].push(
        new Error(`No value provided for required positional "<${requiredPositional}>"`)
      );
      errors._isValid = false;
    }
  });

  Object.entries(argv).forEach(([argKey, argValue]) => {
    if (argKey === '_') {
      return;
    }

    if (!Object.keys(options).includes(argKey)) {
      errors._unknown.push(new Error(`Received unknown argument "--${argKey}"`));
      errors._isValid = false;
      return;
    }

    const option = options[argKey];

    if (
      option.type === 'string' &&
      typeof argValue === 'string' &&
      'choices' in option &&
      Array.isArray(option.choices)
    ) {
      const { choices } = option;
      if (!choices.includes(argValue)) {
        errors[argKey].push(
          new Error(`Value "${argValue}" for "--${argKey}" failed to match one of "${choices.join('", "')}"`)
        );
        errors._isValid = false;
      }
    }
  });

  return errors;
}
