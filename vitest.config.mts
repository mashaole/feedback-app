import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",

      reporter: ["text", "text-summary", "html"],

      reportsDirectory: "./coverage",

      /** Focus on authored source under `src/` (skip tests and generated output). */
      exclude: [
        "**/node_modules/**",
        "**/*.test.ts",
        "**/.next/**",
        "coverage/**",
        "**/postman/**",
        "*.config.{mjs,mts,ts,js}",
      ],
    },
  },
});
