// @flow
import type { Argv } from '@commandapp/commandapp';

export const description = 'This is the description for the command "foo"';

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

export const handler = async (argv: Argv<typeof positionals, {}>) => {
  console.log('hello from positionals command');
  console.log('argv', argv);
};
