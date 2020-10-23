declare module 'yargs-parser' {
  declare export type YargsParserOptions = {|
    alias?: { [key: string]: Array<string> | string },
    array?: Array<string>,
    boolean?: Array<string>,
    configuration?: {
      'camel-case-expansion': boolean,
      'strip-aliased': boolean,
      'dot-notation': boolean,
    },
    count?: Array<string>,
    default?: { [key: string]: string | boolean | number },
    normalize?: Array<string>,
    number?: Array<string>,
    string?: Array<string>,
  |};

  declare export default {
    (input: string, opts?: YargsParserOptions): { _: Array<string>, [key: string]: mixed }
  };
}
