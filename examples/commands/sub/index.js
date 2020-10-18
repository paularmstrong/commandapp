import type { Argv } from '../../../src';

export const alias = 'foo';

export const description = 'This is the description for the command "sub command"';

export const options = {
  foo: {
    type: 'string',
    description: 'This is the description',
    default: 'foo',
  },
};

export const handler = async (argv: Argv<{}, typeof options>) => {
  const { foo } = argv;
  console.log('Hello from foo handler' + foo);
  console.log(argv);
};
