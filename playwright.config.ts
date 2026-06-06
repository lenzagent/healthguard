import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // HealthGuard is mobile-first — test at 390px baseline
  // Using Chromium for all projects (WebKit unavailable on Windows)
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["iPhone 14 Pro"],
        defaultBrowserType: "chromium",
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["iPad Mini"],
        defaultBrowserType: "chromium",
      },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start Next.js dev server before tests
  webServer: {
    command: "pnpm dev --port 3000",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  timeout: 60000,
  expect: {
    timeout: 15000,
  },
});
