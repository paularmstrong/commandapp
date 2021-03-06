'use strict';

module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 10 } }], '@babel/preset-flow'],
  plugins: ['@babel/plugin-proposal-class-properties'],
  babelrcRoots: ['./packages/*'],
};
