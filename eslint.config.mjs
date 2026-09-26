import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "tmp/**", "versions/**", "neon.ts", "next-env.d.ts", "*.config.mjs"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // A leading underscore marks an intentionally unused binding, for example when omitting a field by destructuring.
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
