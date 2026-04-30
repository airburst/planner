import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["build/**", "out/**", "node_modules/**", "public/db.js", "public/engine.js"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["public/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  }
];