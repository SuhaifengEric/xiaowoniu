module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react-hooks'],
  env: { browser: true, es2020: true, node: true, jest: true },
  rules: {
    'no-undef': 'off',
    'react-hooks/rules-of-hooks': 'error',
  },
}
