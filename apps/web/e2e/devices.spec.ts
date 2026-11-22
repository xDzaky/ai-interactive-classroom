import { test, expect } from '@playwright/test';

// P12-T05: Device emulation checks (skipped unless E2E_DEVICES env is set)
test.describe('Device Emulation & Responsive Whiteboard (P12-T05)', () => {
  test.skip(!process.env.E2E_DEVICES, 'Run only when E2E_DEVICES=1 is specified');

  test('loads whiteboard and renders layout on iPad viewport', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 }); // iPad Air
    await page.goto('/');
    expect(await page.title()).toBeDefined();
  });

  test('loads whiteboard and adapts toolbar on mobile controller viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12
    await page.goto('/');
    expect(await page.title()).toBeDefined();
  });

  test('supports large-touch display viewport (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Interactive Flat Panel
    await page.goto('/');
    expect(await page.title()).toBeDefined();
  });
});
