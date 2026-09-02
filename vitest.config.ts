import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: [
      "src/core/domain/**/*.test.ts",
      "src/core/application/**/*.test.ts",
      "src/core/performance/**/*.test.ts",
      "src/core/investment/**/*.test.ts",
      "src/legacy/adapters/domain/**/*.test.ts",
      "tests/migration/**/*.test.ts",
      "components/experience/**/*.test.ts",
      "app/investment/**/*.test.ts",
      "lib/investment/**/*.test.ts",
      "lib/backtesting/**/*.test.ts",
    ],
    exclude: ["src/core/delivery/**", "node_modules/**"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "test/shims/server-only.ts"),
    },
  },
});
