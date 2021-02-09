#!/usr/bin/env node
// @flow
const path = require('path');

console.time('startup');
require('@babel/register')({
  cwd: __dirname,
  rootMode: 'upward',
  ignore: ['node_modules'],
  // cache: true,
});

const bootstrap = require('@commandapp/commandapp').default;
console.timeEnd('startup');
const description = 'My cool example CLI';

bootstrap({ name: 'example', description, rootDir: __dirname, subcommandDir: 'commands' }, {});
