'use strict';

function isBabelRegister(caller) {
  return !!(caller && caller.name === '@babel/register');
}

module.exports = (api) => {
  // api.cache(false);

  const modules = api.caller(isBabelRegister) ? 'commonjs' : false;

  return {
    presets: [['@babel/preset-env', { modules, targets: { node: 'current' } }], '@babel/preset-typescript'],
    plugins: ['@babel/plugin-proposal-class-properties'],
    babelrcRoots: ['./packages/*'],
    sourceType: 'unambiguous',
  };
};
