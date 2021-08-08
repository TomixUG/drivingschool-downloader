const prettierConfig = require('./.prettierrc')

module.exports = {
  extends: ['airbnb-base', 'prettier'],
  plugins: ['import', 'prettier'],
  rules: {
    'prettier/prettier': ['error', prettierConfig]
  }
}
