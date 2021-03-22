import { Argv } from '@commandapp/commandapp';

export const description = 'This is the description for the command "foo"';

export const alias = 'pos itional';

export const positionals = {
  'first-positional': {
    description: 'This is a required first positional',
    required: true,
    choices: ['foo', 'bar', 'baz'],
  },
  rest: {
    fart: true,
    greedy: true,
    description: 'Any number of other positionals are accepted using an infinite count',
  },
} as const;

export const handler = async (argv: Argv<typeof positionals, {}>) => {
  const { rest } = argv;
  console.log('hello from positionals command');
  console.log('argv', argv);
};
