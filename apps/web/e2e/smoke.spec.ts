import { test, expect } from "@playwright/test";

/**
 * P01-T07 smoke test: login → dashboard → see classroom list.
 *
 * Prerequisites (run before test):
 *   1. php artisan migrate:fresh --seed --class=DevSeeder (in apps/api)
 *   2. php artisan serve (port 8000)
 *   3. pnpm dev (port 5173, in apps/web)
 *
 * Run: pnpm exec playwright test --headed  (or pnpm exec playwright test)
 *
 * NOTE: This test is skipped in CI unless PLAYWRIGHT_RUN=true is set,
 * because it requires a live server (no docker in this environment).
 */

const SKIP = !process.env.PLAYWRIGHT_RUN;

test.describe("Auth + Dashboard smoke", () => {
  test.skip(SKIP, "Set PLAYWRIGHT_RUN=true to run E2E tests (requires live server)");

  test("login page renders login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /masuk/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/kata sandi/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /masuk/i })).toBeVisible();
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("teacher@demo.test");
    await page.getByLabel(/kata sandi/i).fill("wrongpassword");
    await page.getByRole("button", { name: /masuk/i }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5_000 });
  });

  test("login → navigate to dashboard → see school name", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("teacher@demo.test");
    await page.getByLabel(/kata sandi/i).fill("password123");
    await page.getByRole("button", { name: /masuk/i }).click();

    // Should redirect to /dashboard
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    await expect(page.getByText(/SMA Demo Nusantara/i)).toBeVisible();

    // Should see at least one classroom
    await expect(page.getByText(/Matematika 10A/i)).toBeVisible();
  });

  test("logout clears session and redirects to login", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("teacher@demo.test");
    await page.getByLabel(/kata sandi/i).fill("password123");
    await page.getByRole("button", { name: /masuk/i }).click();
    await page.waitForURL("**/dashboard");

    // Logout
    await page.getByRole("button", { name: /keluar/i }).click();
    await page.waitForURL("**/login");
    await expect(page.getByRole("heading", { name: /masuk/i })).toBeVisible();
  });
});
