// @flow
const path = require('path');

require('@babel/register')({
  cwd: path.join(__dirname, '..'),
});

const bootstrap = require('../src').default;

bootstrap({ rootDir: __dirname, subcommandDir: 'commands' });
