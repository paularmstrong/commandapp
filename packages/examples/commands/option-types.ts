import { Argv } from '@commandapp/commandapp';

export const description = 'This is the description for the command $0';

export const examples = [
  {
    description: 'Add items to an array type',
    code: 'node examples/run.js option-types --array=item0 --array=item1',
  },
];

export const options = {
  array: {
    type: 'array',
    description: 'This is an array option',
  },
  'array-defaulted': {
    type: 'array',
    description: 'This is an array option with a default',
    default: ['a', 'b'],
  },
  'array-required': {
    type: 'array',
    description: 'This is an array option that is required',
    required: true,
  },
  boolean: {
    type: 'boolean',
    description: 'This is an boolean option',
  },
  'boolean-defaulted': {
    type: 'boolean',
    description: 'This is an boolean option that is required',
    default: true,
  },
  'boolean-required': {
    type: 'boolean',
    description: 'This is an boolean option with a default',
    required: true,
  },
  count: {
    type: 'count',
    description: 'This is an count option',
  },
  'count-defaulted': {
    type: 'count',
    description: 'This is an count option that is required',
    default: 1,
  },
  'count-required': {
    type: 'count',
    description: 'This is an count option with a default',
    required: true,
  },
  number: {
    type: 'number',
    description: 'This is an number option',
  },
  'number-defaulted': {
    type: 'number',
    description: 'This is an number option that is required',
    default: 2,
  },
  'number-required': {
    type: 'number',
    description: 'This is an number option that is required',
    required: true,
  },
  string: {
    type: 'string',
    description: 'This is an string option',
  },
  'string-defaulted': {
    type: 'string',
    description: 'This is an string option that is required',
    default: 'the string default',
  },
  'string-required': {
    type: 'string',
    description: 'This is an string option with a default',
    required: true,
  },
  'string-choices': {
    type: 'string',
    description: 'This string must be one of the choices',
    choices: ['foo', 'bar'],
  },
} as const;

export const handler = async (argv: Argv<{}, typeof options>) => {
  const array: ReadonlyArray<string> | void = argv.array;
  const arrayDefaulted: ReadonlyArray<string> = argv['array-defaulted'];
  const arrayRequired: ReadonlyArray<string> = argv['array-required'];
  const boolean: boolean | void = argv.boolean;
  const booleanDefaulted: boolean = argv['boolean-defaulted'];
  const booleanRequired: boolean = argv['boolean-required'];
  const count: number | void = argv.count;
  const countDefaulted: number = argv['count-defaulted'];
  const countRequired: number = argv['count-required'];
  const number: number | void = argv.number;
  const numberDefaulted: number = argv['number-defaulted'];
  const numberRequired: number = argv['number-required'];
  const string: string | void = argv.string;
  const stringDefaulted: string = argv['string-defaulted'];
  const stringRequired: string = argv['string-required'];
  const stringChoices: string | void = argv['string-choices'];
};
