module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/", "src-tauri/"],
  rules: {
    // Dynamic GitHub payloads and native bridges are progressively typed. Keep
    // explicit any available; strict tsc still rejects accidental implicit any.
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-expressions": [
      "error",
      { allowTernary: true },
    ],
    "no-constant-condition": ["error", { checkLoops: false }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrors: "none",
      },
    ],
  },
};
