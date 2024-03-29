module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser'
  },
  extends: [
    'prettier-standard',
    '@nuxtjs/eslint-config-typescript',
    'plugin:prettier/recommended'
  ],
  plugins: [],
  rules: {
    'vue/multi-word-component-names': 0,
    'prettier/prettier': 1
  }
}
