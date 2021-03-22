import { Command } from '../options';
import ejs from 'ejs';
import path from 'path';

export default async function markdownFormatter(tree: Array<Command> | Command): Promise<string> {
  const data = { commands: Array.isArray(tree) ? tree : [tree] };
  return ejs.renderFile(path.join(__dirname, './markdown.ejs'), data, { async: true });
}
