module.exports = {
  extends: [
    'eslint-config-airbnb-base',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  settings: {
    "import/resolver": { typescript: {} },
  },
  rules: {
    "quotes": ["error", "double"],
    "class-methods-use-this": [
      "error", { exceptMethods: ["render", "connectedCallback"] },
    ],
    "object-curly-newline": [
      "error", { "ImportDeclaration": "never", }
    ],
    "no-return-assign": [
      "error", "except-parens"
    ],
    "indent": [
      "error", 2, { "FunctionDeclaration": {"parameters": "first"} }
    ],
    "@typescript-eslint/type-annotation-spacing": [
      "error", { "before": false, "after": true }
    ],
    "no-plusplus": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "max-len": [ "error", { "code": 120, "ignoreTemplateLiterals": true, "ignoreStrings": true } ],
    "no-restricted-syntax": "off",
    "no-console": "off",
    "no-cond-assign": "off",
    "no-unused-vars": "off",
    "no-param-reassign": "off",
    "@typescript-eslint/no-unused-vars": "error",
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/no-inferrable-types": "off",
    "import/no-duplicates": "off",
    "curly": ["error", "multi"],
    "arrow-parens": ["error", "as-needed"],
    "no-extend-native": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "radix": "off",
    "nonblock-statement-body-position": "off",
    "no-use-before-define": "off",
    "lines-between-class-members": "off",
    "import/extensions": "off",
    "no-nested-ternary": "off",
  },
};
