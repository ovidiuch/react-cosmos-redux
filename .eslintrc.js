module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module'
  },
  plugins: ['react-hooks'],
  extends: ['plugin:react/recommended'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
