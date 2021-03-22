'use strict';

module.exports = {
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 7,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true,
    },
    sourceType: 'module',
  },
  extends: ['plugin:jest/recommended', 'prettier'],
  plugins: ['prettier'],
  env: {
    es6: true,
    node: true,
  },

  rules: {
    'prettier/prettier': 'error',

    'jest/consistent-test-it': ['error', { fn: 'test' }],
    'jest/no-disabled-tests': 'error',
    'jest/no-test-prefixes': 'error',
    'jest/prefer-to-be-null': 'error',
    'jest/prefer-to-be-undefined': 'error',
    'jest/prefer-to-have-length': 'error',
    'jest/valid-describe': 'error',
    'jest/valid-expect': 'error',
    'jest/valid-expect-in-promise': 'error',
  },
};
