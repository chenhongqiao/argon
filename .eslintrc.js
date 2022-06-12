module.exports = {
  root: true,
  parserOptions: {
    project: ['./packages/*/tsconfig.json'],
  },
  rules: {
    'no-extra-boolean-cast': 'off',
  },
  extends: 'standard-with-typescript',
};
