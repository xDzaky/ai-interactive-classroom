import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — smoke tests only (CI-safe, no browser download needed in dev).
 * Run: pnpm exec playwright test
 * Requires: pnpm dev (web) + php artisan serve (api) to be running.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
