import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL } from "./tests/test-db";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // Tests run against their own embedded PostgreSQL instance (started by
    // global-setup.ts) so the development demo database is never touched.
    // GEMINI_API_KEY is forced empty so the deterministic mock client is
    // always the one under test.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      GEMINI_API_KEY: "",
    },
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
