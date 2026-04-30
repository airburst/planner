import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/tests/**/*.test.ts", "src/main/**/*.test.ts"],
    setupFiles: ["src/tests/integration/setup.ts"]
  }
});
