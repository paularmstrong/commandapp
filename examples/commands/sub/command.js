// @flow
import type { Argv } from '../../../src';

export const description = 'This is the description for the command "sub command"';

export const examples = [];

export const positionals = {};

export const options = {
  foo: {
    type: 'string',
    description: 'This is the description',
    default: 'foo',
  },
};

export const middleware = [];

export const handler = async (argv: Argv<typeof positionals, typeof options>) => {
  const { foo } = argv;
  console.log('Hello from sub command handler' + foo);
  console.log(argv);
};
