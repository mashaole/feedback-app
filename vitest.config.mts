import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    pool: "threads",
    environment: "node",
    environmentMatchGlobs: [
      ["src/**/*.test.tsx", "happy-dom"],
    ],
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        inline: ["@asamuzakjp/css-color", "@csstools/css-calc"],
      },
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",

      reporter: ["text", "text-summary", "html"],

      reportsDirectory: "./coverage",

      /** Focus on authored source under `src/` (skip tests and generated output). */
      exclude: [
        "**/node_modules/**",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/.next/**",
        "coverage/**",
        "**/postman/**",
        "*.config.{mjs,mts,ts,js}",
      ],
    },
  },
});
