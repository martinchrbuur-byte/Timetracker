import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node tests/e2e/server.mjs",
    url: "http://127.0.0.1:4173/public/index.html",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
