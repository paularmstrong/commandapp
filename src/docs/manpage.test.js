// @flow
import manpageFormatter from './manpage';

const mockCommand = {
  description: 'mock command description',
  examples: [{ code: 'this is my example code', description: "this is my example code's description" }],
  command: 'mock-command',
  handler: async function <T>(args: T) {},
  positionals: {},
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

describe('manpage formatter', () => {
  test('just a test', async () => {
    expect(await manpageFormatter(mockCommand)).toMatchInlineSnapshot(`
      ".TH \\"mock-command\\" 1 \\"10/30/2020\\"
      .SH NAME
      mock-command
      .SH DESCRIPTION
      .B mock-command
      mock command description

      .SH OPTIONS

      .IP --tacos
      do you like tacos?

      .IP --churros
      do you like tacos?

      .IP --burritos
      do you like burritos?

      .SH EXAMPLES
      this is my example code&#39;s description

      .RS
      this is my example code
      .RE
      "
    `);
  });
});
