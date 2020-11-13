// @flow
import formatter from './stdout';

const mockCommand = {
  alias: [],
  description: 'mock command description',
  examples: [{ code: 'this is my example code', description: "this is my example code's description" }],
  command: 'mock-command',
  handler: async function <T>(args: T) {},
  positionals: {
    'foo-positional': { description: 'the foo positional is this one', required: true },
    'optional-positional': { description: 'this positional is optional' },
    'greedy-positional': { description: 'allows a positional to take 1 or more', greedy: true },
  },
  options: {
    tacos: {
      type: 'string',
      default: 'yes',
      description: 'do you like tacos?',
      choices: ['yes', 'no'],
    },
    churros: {
      type: 'string',
      required: true,
      description: 'do you like tacos?',
    },
    burritos: {
      type: 'boolean',
      default: false,
      description: 'do you like burritos?',
    },
  },
};

describe('stdout formatter', () => {
  test('single command', async () => {
    expect(await formatter(mockCommand)).toMatchInlineSnapshot(`
      "mock-command
        mock command description

      Positionals
        <foo-positional>          the foo positional is
                                  this one
        [optional-positional]     this positional is
                                  optional
        [greedy-positional...]    allows a positional to
                                  take 1 or more

      Options
        --tacos       do you like tacos?                [\\"yes\\", \\"no\\"][default: \\"yes\\"]
        --churros     do you like tacos?                [string][required]
        --burritos    do you like burritos?             [boolean][default: false]

      Examples

      this is my example code's description
          this is my example code
      "
    `);
  });

  test('multiple commands', async () => {
    expect(await formatter([mockCommand, mockCommand, mockCommand])).toMatchInlineSnapshot(`
      "mock-command
        mock command description

      Commands
        mock-command    mock command description
        mock-command    mock command description

      Positionals
        <foo-positional>          the foo positional is
                                  this one
        [optional-positional]     this positional is
                                  optional
        [greedy-positional...]    allows a positional to
                                  take 1 or more

      Options
        --tacos       do you like tacos?                [\\"yes\\", \\"no\\"][default: \\"yes\\"]
        --churros     do you like tacos?                [string][required]
        --burritos    do you like burritos?             [boolean][default: false]

      Examples

      this is my example code's description
          this is my example code
      "
    `);
  });
});
