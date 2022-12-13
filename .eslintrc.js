module.exports = {
  root: true,
  parserOptions: {
    project: ['./packages/*/tsconfig.json']
  },
  rules: {
    'no-extra-boolean-cast': 'off',
    '@typescript-eslint/naming-convention': 'off'
  },
  extends: 'standard-with-typescript',
};
