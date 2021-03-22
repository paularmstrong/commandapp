import yargsParser from 'yargs-parser';
import Logger from './logger';

interface CommandOption {
  alias?: ReadonlyArray<string> | string;
  choices?: ReadonlyArray<string>;
  default?: unknown;
  description: string;
  normalize?: boolean;
  required?: boolean;
  type?: 'array' | 'boolean' | 'count' | 'number' | 'string';
}

type RequiredOption<O extends CommandOption> = O extends { type: 'array'; required: true }
  ? ReadonlyArray<string>
  : O extends { type: 'boolean'; required: true }
  ? boolean
  : O extends { type: 'count'; required: true }
  ? number
  : O extends { type: 'number'; required: true }
  ? number
  : O extends { type: 'string'; required: true }
  ? string
  : undefined;

type DefaultOption<O extends CommandOption> = O extends {
  type: 'array';
  default: ReadonlyArray<string>;
}
  ? ReadonlyArray<string>
  : O extends { type: 'boolean'; default: boolean }
  ? boolean
  : O extends { type: 'count'; default: number }
  ? number
  : O extends { type: 'number'; default: number }
  ? number
  : O extends { type: 'string'; default: string }
  ? string
  : undefined;

type InferredOption<O extends CommandOption> = O extends { required: true }
  ? RequiredOption<O>
  : O extends { default: ReadonlyArray<string> | boolean | number | string }
  ? DefaultOption<O>
  : O extends { type: 'array' }
  ? ReadonlyArray<string> | undefined
  : O extends { type: 'boolean' }
  ? boolean
  : O extends { type: 'count' }
  ? number | undefined
  : O extends { type: 'number' }
  ? number | undefined
  : O extends { type: 'string'; choices: ReadonlyArray<infer C> }
  ? C | undefined
  : O extends { type: 'string' }
  ? string | undefined
  : undefined;

export type Options<O extends OptionRecord = OptionRecord> = { [key in keyof O]: InferredOption<O[key]> };
export type OptionRecord = Record<string, CommandOption>;

interface CommandPositional {
  description: string;
  choices?: ReadonlyArray<string>;
  greedy?: boolean;
  required?: boolean;
}

type RequiredPositional<P extends CommandPositional> = P extends { greedy: true }
  ? ReadonlyArray<string>
  : P extends { choices: ReadonlyArray<infer C> }
  ? C
  : string;

type InferredPositional<P extends CommandPositional> = P extends { required: true }
  ? RequiredPositional<P>
  : P extends { greedy: true }
  ? ReadonlyArray<string> | undefined
  : P extends { choices: ReadonlyArray<infer C> }
  ? C | undefined
  : string | undefined;

export type Positionals<P extends PositionalRecord = PositionalRecord> = {
  [key in keyof P]: InferredPositional<P[key]>;
};

export type PositionalRecord = Record<string, CommandPositional>;

export type Argv<pos extends PositionalRecord, opts extends OptionRecord> = Options<opts> & Positionals<pos>;

export type Examples = Array<{ code: string; description: string }>;
export type Middleware = <T>(args: T) => Promise<T>;
export type Command = {
  alias?: string;
  command: string;
  description: string;
  examples: Examples;
  handler: <T>(args: T, logger: Logger) => Promise<void>;
  middleware?: Array<Middleware>;
  options: OptionRecord;
  positionals: PositionalRecord;
};

interface YargsParserOptions {
  alias: { [key: string]: string | string[] };
  array: Array<string>;
  boolean: Array<string>;
  count: Array<string>;
  default: { [key: string]: any };
  normalize: Array<string>;
  number: Array<string>;
  string: Array<string>;
}

export default function optionsToParserOptions(options: OptionRecord): YargsParserOptions {
  const parserOptions: YargsParserOptions = {
    alias: {},
    array: [],
    boolean: [],
    count: [],
    default: {},
    normalize: [],
    number: [],
    string: [],
  };

  Object.keys(options).forEach((argKey) => {
    const { alias, normalize, type, default: defaultValue } = options[argKey];
    if (!type || !(type in parserOptions)) {
      throw new Error(`Option "${argKey}" has invalid type "${type}"`);
    }
    parserOptions[type].push(argKey);

    if (Array.isArray(alias) || typeof alias === 'string') {
      parserOptions.alias[argKey] = alias;
    }

    if (typeof defaultValue !== 'undefined') {
      parserOptions.default[argKey] = defaultValue;
    }

    if (type === 'string' && typeof normalize === 'boolean' && normalize) {
      parserOptions.normalize.push(argKey);
    }
  });

  return parserOptions;
}

function getRequiredOptions(options: OptionRecord | PositionalRecord): Array<string> {
  return Object.keys(options).reduce((memo, argKey) => {
    // @ts-ignore fuck you
    if ('required' in options[argKey] && typeof options[argKey].required === 'boolean' && options[argKey].required) {
      // @ts-ignore fuck you
      memo.push(argKey);
    }
    return memo;
  }, []);
}

type OptionResult = { [key: string]: Array<Error> };
type ValidationResult = {
  _isValid: boolean;
  _unknown: Array<Error>;
};
type CombinedResult = OptionResult & ValidationResult;

export function validate<P extends PositionalRecord, O extends OptionRecord>(
  argv: Argv<P, O>,
  positionals: P,
  options: O
): CombinedResult {
  const empty: ValidationResult = {
    _isValid: true,
    _unknown: [],
  };

  const optKeys = Object.keys({ ...options, ...positionals });

  const errors = optKeys.reduce((memo, key) => {
    memo[key] = [];
    return memo;
  }, empty as CombinedResult);

  getRequiredOptions(options).forEach((requiredKey) => {
    if (!(requiredKey in argv)) {
      errors[requiredKey].push(new Error(`No value provided for required argument "--${requiredKey}"`));
      errors._isValid = false;
    }
  });

  getRequiredOptions(positionals).forEach((requiredPositional) => {
    if (!(requiredPositional in argv)) {
      errors[requiredPositional].push(new Error(`No value provided for required positional "<${requiredPositional}>"`));
      errors._isValid = false;
    }
  });

  Object.entries(argv).forEach(([argKey, argValue]) => {
    if (!optKeys.includes(argKey)) {
      errors._unknown.push(new Error(`Received unknown argument "--${argKey}"`));
      errors._isValid = false;
      return;
    }

    const option = options[argKey];

    if (
      option &&
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
