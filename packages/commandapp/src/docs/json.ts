import { Command } from '../options';

export default function jsonFormatter(tree: Array<Command> | Command): Promise<string> {
  return Promise.resolve(JSON.stringify(tree, null, 2));
}
