import type { Argv } from '../../src';

export const description = 'This is the description for the command "foo"';

export const alias = 'pos itional';

export const examples = [];

export const positionals = {
  'first-positional': {
    description: 'This is a required first positional',
    required: true,
    choices: ['foo', 'bar', 'baz'],
  },
  rest: {
    greedy: true,
    description: 'Any number of other positionals are accepted using an infinite count',
  },
};

export const options = {};

export const middleware = [];

export const handler = async (argv: Argv<typeof positionals, typeof options>) => {
  console.log('hello from positionals command');
  console.log('argv', argv);
};
