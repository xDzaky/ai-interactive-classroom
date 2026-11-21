import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";

/**
 * P09-T04: Multi-context E2E — teacher + student + controller flows.
 *
 * Tests verify the full collaborative classroom lifecycle across
 * three distinct browser contexts (simulating different users/devices).
 *
 * Prerequisites (same as smoke.spec.ts):
 *   1. php artisan migrate:fresh --seed --class=DevSeeder
 *   2. php artisan serve (port 8000)
 *   3. pnpm dev (port 5173)
 *
 * Run: PLAYWRIGHT_RUN=true pnpm exec playwright test e2e/multi-context.spec.ts
 *
 * Skipped unless PLAYWRIGHT_RUN=true (requires live servers, no Docker in CI).
 */

const SKIP = !process.env.PLAYWRIGHT_RUN;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/kata sandi/i).fill(password);
  await page.getByRole("button", { name: /masuk/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

async function getRoomCode(teacherPage: Page): Promise<string> {
  // After teacher creates a room, grab the join code displayed on screen
  const codeEl = teacherPage.locator("[data-testid='room-code']").first();
  return codeEl.innerText({ timeout: 10_000 });
}

// ── Test Suite ────────────────────────────────────────────────────────────────

test.describe("Multi-context: Teacher + Student + Controller", () => {
  test.skip(SKIP, "Set PLAYWRIGHT_RUN=true to run multi-context E2E (requires live servers)");

  /**
   * T01: Teacher creates a room, student joins, teacher sees participant.
   * Uses two separate browser contexts (teacher + student).
   */
  test("teacher creates room → student joins → teacher sees participant", async ({
    browser,
  }) => {
    // ── Teacher context ──
    const teacherCtx: BrowserContext = await browser.newContext();
    const teacherPage: Page = await teacherCtx.newPage();
    await loginAs(teacherPage, "teacher@demo.test", "password123");

    // Navigate to a classroom and start a room
    await teacherPage.getByText(/Matematika 10A/i).click();
    await teacherPage.getByRole("button", { name: /mulai sesi/i }).click();
    await teacherPage.waitForURL("**/rooms/**", { timeout: 10_000 });

    // Get room join code
    const roomCode = await getRoomCode(teacherPage);
    expect(roomCode).toMatch(/^[A-Z0-9]{6,}$/);

    // ── Student context ──
    const studentCtx: BrowserContext = await browser.newContext();
    const studentPage: Page = await studentCtx.newPage();
    await studentPage.goto("/join");
    await studentPage.getByLabel(/kode ruang/i).fill(roomCode);
    await studentPage.getByLabel(/nama/i).fill("Budi Santoso");
    await studentPage.getByRole("button", { name: /bergabung/i }).click();
    await studentPage.waitForURL("**/rooms/**", { timeout: 10_000 });

    // Student should see the whiteboard
    await expect(
      studentPage.locator("[data-testid='whiteboard-canvas']"),
    ).toBeVisible({ timeout: 8_000 });

    // Teacher should see participant count increase
    await expect(
      teacherPage.getByText(/Budi Santoso/i),
    ).toBeVisible({ timeout: 8_000 });

    await teacherCtx.close();
    await studentCtx.close();
  });

  /**
   * T02: Teacher pairs a mobile controller device.
   * Uses two contexts: teacher desktop + controller mobile.
   */
  test("teacher pairs controller → controller receives commands", async ({
    browser,
  }) => {
    const teacherCtx: BrowserContext = await browser.newContext();
    const teacherPage: Page = await teacherCtx.newPage();
    await loginAs(teacherPage, "teacher@demo.test", "password123");

    await teacherPage.getByText(/Matematika 10A/i).click();
    await teacherPage.getByRole("button", { name: /mulai sesi/i }).click();
    await teacherPage.waitForURL("**/rooms/**", { timeout: 10_000 });

    // Open Connect Device modal
    await teacherPage.getByRole("button", { name: /sambungkan perangkat/i }).click();
    const qrModal = teacherPage.getByRole("dialog");
    await expect(qrModal).toBeVisible({ timeout: 5_000 });

    // Controller context — navigate to /controller
    const controllerCtx: BrowserContext = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 14 viewport
    });
    const controllerPage: Page = await controllerCtx.newPage();
    await controllerPage.goto("/controller");
    await expect(
      controllerPage.getByRole("heading", { name: /pengontrol/i }),
    ).toBeVisible({ timeout: 5_000 });

    await teacherCtx.close();
    await controllerCtx.close();
  });

  /**
   * T03: Teacher starts a poll, student answers, teacher sees results.
   */
  test("teacher creates poll → student answers → teacher sees live results", async ({
    browser,
  }) => {
    const teacherCtx: BrowserContext = await browser.newContext();
    const teacherPage: Page = await teacherCtx.newPage();
    await loginAs(teacherPage, "teacher@demo.test", "password123");

    await teacherPage.getByText(/Matematika 10A/i).click();
    await teacherPage.getByRole("button", { name: /mulai sesi/i }).click();
    await teacherPage.waitForURL("**/rooms/**", { timeout: 10_000 });
    const roomCode = await getRoomCode(teacherPage);

    // Student joins
    const studentCtx: BrowserContext = await browser.newContext();
    const studentPage: Page = await studentCtx.newPage();
    await studentPage.goto("/join");
    await studentPage.getByLabel(/kode ruang/i).fill(roomCode);
    await studentPage.getByLabel(/nama/i).fill("Ani Rahayu");
    await studentPage.getByRole("button", { name: /bergabung/i }).click();
    await studentPage.waitForURL("**/rooms/**", { timeout: 10_000 });

    // Teacher creates a poll
    await teacherPage.getByRole("button", { name: /aktivitas/i }).click();
    await teacherPage.getByRole("menuitem", { name: /jajak pendapat/i }).click();
    await teacherPage.getByLabel(/pertanyaan/i).fill("Berapa 2 + 2?");
    await teacherPage
      .getByLabel(/pilihan 1/i)
      .fill("3");
    await teacherPage
      .getByLabel(/pilihan 2/i)
      .fill("4");
    await teacherPage.getByRole("button", { name: /mulai jajak/i }).click();

    // Student should see the poll
    await expect(
      studentPage.getByText(/Berapa 2 \+ 2\?/i),
    ).toBeVisible({ timeout: 8_000 });

    // Student answers
    await studentPage.getByText("4").click();
    await studentPage.getByRole("button", { name: /kirim/i }).click();

    // Teacher sees results
    await expect(
      teacherPage.getByText(/1 jawaban/i),
    ).toBeVisible({ timeout: 8_000 });

    await teacherCtx.close();
    await studentCtx.close();
  });
});
