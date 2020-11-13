// @flow
import markdownFormatter from './markdown';

const mockCommand = {
  alias: [],
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

describe('markdown formatter', () => {
  test('just a test', async () => {
    expect(await markdownFormatter(mockCommand)).toMatchInlineSnapshot(`
      "
      ## \`mock-command\`

      mock command description

      ### Options

      | key | description | type | default | required |
      | --- | ----------- | ---- | ------- | -------- |
      | \`tacos\` | do you like tacos? | \`string\` (choices: \`yes\`, \`no\`) | \`yes\` |  |
      | \`churros\` | do you like tacos? | \`string\` |  | ✅ |
      | \`burritos\` | do you like burritos? | \`boolean\` |  |  |

      ### Examples

      this is my example code's description
      \`\`\`
      this is my example code
      \`\`\`
      "
    `);
  });
});
