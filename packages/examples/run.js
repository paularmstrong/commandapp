#!/usr/bin/env node
// @flow
const path = require('path');

require('@babel/register')({
  cwd: __dirname,
  rootMode: 'upward',
  ignore: ['node_modules'],
});

const bootstrap = require('@commandapp/commandapp').default;

const description = 'My cool example CLI';

bootstrap({ name: 'example', description, rootDir: __dirname, subcommandDir: 'commands' }, {});
