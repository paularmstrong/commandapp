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
  extends: ['plugin:flowtype/recommended', 'plugin:jest/recommended', 'prettier'],
  plugins: ['flowtype', 'prettier'],
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

    'flowtype/generic-spacing': 'off',
    'flowtype/boolean-style': ['error', 'boolean'],
    'flowtype/define-flow-type': 'warn',
    'flowtype/no-primitive-constructor-types': 'error',
    'flowtype/no-weak-types': 'off',
    'flowtype/require-parameter-type': 'off',
    'flowtype/require-return-type': 'off',
    'flowtype/require-valid-file-annotation': 'off',
    'flowtype/space-after-type-colon': ['error', 'always', { allowLineBreak: true }],
    'flowtype/use-flow-type': 'off',
    'flowtype/valid-syntax': 'error',
  },
};
