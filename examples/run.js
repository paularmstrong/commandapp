// @flow
const path = require('path');

require('@babel/register')({
  cwd: path.join(__dirname, '..'),
});

const bootstrap = require('../src').default;

const description = 'My cool example CLI';

bootstrap({ name: 'example', description, rootDir: __dirname, subcommandDir: 'commands' }, {});
