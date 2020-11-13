// @flow
import type { Command } from '../options';
import ejs from 'ejs';
import path from 'path';
import cliui from 'cliui';

function formatDefault(value: mixed): string {
  if (Array.isArray(value)) {
    return value.map((v) => `"${String(v)}"`).join(', ');
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return String(value);
}

function optionsTable(options: $PropertyType<Command, 'options'>): string {
  return Object.keys(options).reduce((memo, key) => {
    const opt = options[key];
    const { alias, description, type } = opt;
    const choices = type === 'string' && 'choices' in opt && Array.isArray(opt.choices) ? opt.choices : void 0;
    // $FlowFixMe too hard to figure out if default for sure exists or not
    const defaultValue = 'default' in opt && typeof opt.default !== undefined ? opt['default'] : void 0;
    const required = 'required' in opt && typeof opt.required === 'boolean' && opt.required === true;

    return `${memo}  --${key}${typeof alias === 'string' ? `, -${alias}` : ''}\t    ${description}\t    [${
      choices ? choices.map((c) => `"${c}"`).join(', ') : type
    }]${typeof defaultValue !== 'undefined' ? `[default: ${formatDefault(defaultValue)}]` : ''}${
      required ? `[required]` : ''
    }\n`;
  }, '');
}

function positionalsTable(positionals: $PropertyType<Command, 'positionals'>): string {
  return Object.keys(positionals).reduce((memo, key) => {
    const pos = positionals[key];
    const { choices, description } = pos;
    const required = 'required' in pos && typeof pos.required === 'boolean' && pos.required === true;
    const greedy = 'greedy' in pos && typeof pos.greedy === 'boolean' && pos.greedy === true;

    return `${memo}  ${
      required ? `<${key}${greedy ? '...' : ''}>` : `[${key}${greedy ? '...' : ''}]`
    }\t    ${description}\t    ${choices ? `[${choices.map((c) => `"${c}"`).join(', ')}]` : ''}\n`;
  }, '');
}

export default async function stdoutFormatter(tree: Array<Command> | Command): Promise<string> {
  // $FlowFixMe columns exists on process.stdout
  const { columns = 80 } = process.stdout;
  const columnWidth = Math.floor(columns / 4);
  const ui = cliui({ width: Math.min(columns, 80) });

  const command = Array.isArray(tree) ? tree[0] : tree;

  ui.div(command.command);
  ui.div(`  ${command.description}\n`);

  if (Array.isArray(tree) && tree.length > 1) {
    ui.div(`Commands`);

    ui.div(
      tree
        .slice(1)
        .map(
          (command) =>
            `  ${command.command}${command.alias.map((a) => `, ${a}`).join('')}\t    ${command.description}\n`
        )
        .join('')
    );
  }

  if (Object.keys(command.positionals).length) {
    ui.div('Positionals');
    ui.div(positionalsTable(command.positionals));
  }

  if (Object.keys(command.options).length) {
    ui.div('Options');
    ui.div(optionsTable(command.options));
  }

  if (command.examples.length) {
    ui.div('Examples\n');
    command.examples.forEach((example) => {
      ui.div(example.description);
      ui.div(`    ${example.code}\n`);
    });
  }

  return ui.toString();
}
