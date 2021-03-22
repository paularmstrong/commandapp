#!/usr/bin/env node
const path = require('path');

// NOTE: you can use @babel/register, but @swc-node/register is much faster
// require('@babel/register')({
//   cwd: path.resolve(__dirname, '..', '..'),
//   extensions: ['.ts', '.js'],
// });

require('@swc-node/register');

const bootstrap = require('@commandapp/commandapp').default;
const description = 'My cool example CLI';

bootstrap({ name: 'example', description, rootDir: __dirname, subcommandDir: 'commands' }, {});
