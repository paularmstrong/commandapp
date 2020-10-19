'use strict';

module.exports = {
  hooks: {
    'post-checkout': `if [[ $HUSKY_GIT_PARAMS =~ 1$ ]]; then yarn; fi`,
    'post-merge': 'yarn',
    'post-rewrite': 'yarn',
    'pre-commit': 'lint-staged',
  },
};
