const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,  // Serial execution — single SQLite DB
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },

  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,  // Server must start within 10 seconds (JRN-03.1 success measure)
    env: {
      PORT: '3000',
    },
  },
});
