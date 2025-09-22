import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "analyze-*.ts",
      "benchmark-*.ts",
      "debug-*.ts",
      "test-*.ts",
      "check-*.ts",
      "cleanup-*.ts",
      "generate-*.ts",
      "migrate-*.ts",
      "fix-*.ts",
      "*-backup.tsx",
      "*-backup.ts",
    ],
  },
];

export default eslintConfig;