const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npm run start",
    env: {
      ...process.env,
      ADMIN_SHARED_SECRET: "playwright-admin-secret",
      PLAYWRIGHT_TEST_MODE: "true",
      PLAYWRIGHT_TEST_SECRET: "playwright-reset-secret",
    },
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: devices["Desktop Chrome"],
    },
  ],
});
