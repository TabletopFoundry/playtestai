import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "**/node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-generated artifacts:
    "coverage/**",
    "website/.docusaurus/**",
    "website/build/**",
  ]),
  {
    rules: {
      // Enforce consistent code quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "no-throw-literal": "error",
      "no-unused-expressions": "error",
    },
  },
]);

export default eslintConfig;
