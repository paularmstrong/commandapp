// @flow
import type { Command } from '../options';
import ejs from 'ejs';
import path from 'path';

export default async function manpageFormatter(tree: Array<Command> | Command): Promise<string> {
  const data = {
    commands: Array.isArray(tree) ? tree : [tree],
    name: 'NAME',
    description: 'todo: we need global name/desc',
  };
  return ejs.renderFile(path.join(__dirname, './manpage.ejs'), data, { async: true });
}
