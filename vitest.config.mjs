import { defineConfig } from "vitest/config";

const MINUTE_MS = 60_000;

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/*.test.mjs", "tooling/*.test.mjs", "lint-staged.config.test.mjs"],
    testTimeout: MINUTE_MS,
    hookTimeout: MINUTE_MS,
  },
});
