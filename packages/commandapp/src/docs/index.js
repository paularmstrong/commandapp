// @flow
import jsonFormatter from './json';
import markdownFormatter from './markdown';
import stdoutFormatter from './stdout';
import type { Command } from '../options';

type Formatter = (tree: Command | Array<Command>) => Promise<string>;

const formatters = {
  json: jsonFormatter,
  markdown: markdownFormatter,
  stdout: stdoutFormatter,
};

export const formatTypes: Array<string> = Object.keys(formatters);

function registerFormatter(name: string, formatter: Formatter): void {
  formatters[name] = formatter;
}

export default async function format(
  tree: Command | Array<Command>,
  formatterName?: string = 'stdout'
): Promise<string> {
  if (!(formatterName in formatters)) {
    throw new Error(`Cannot format documentation tree using unregistered formatter "${formatterName}"`);
  }

  return await formatters[formatterName](tree);
}
