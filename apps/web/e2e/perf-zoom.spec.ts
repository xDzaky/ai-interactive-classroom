import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test("zoom performance benchmark", async ({ page }) => {
  test.skip(!process.env.PERF, "Skipping perf test unless PERF=1");

  await page.goto("/whiteboard?perf=300x100");
  await page.waitForSelector("[data-testid='konva-stage'], canvas, [role='toolbar']", { timeout: 10000 });

  // Inject rAF performance collector
  await page.evaluate(() => {
    (window as any).__perfFrameDeltas = [];
    let last = performance.now();
    function tick(now: number) {
      (window as any).__perfFrameDeltas.push(now - last);
      last = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  const stage = page.locator("canvas").first();
  const box = await stage.boundingBox();
  const cx = box ? box.x + box.width / 2 : 400;
  const cy = box ? box.y + box.height / 2 : 300;

  // Run 60 wheel events: 30 zoom out, 30 zoom in
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(16);
  }
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(16);
  }

  const results = await page.evaluate(() => {
    const deltas: number[] = (window as any).__perfFrameDeltas || [];
    const valid = deltas.filter((d) => d > 0 && d < 1000);
    if (!valid.length) return { avg: 0, p95: 0, count: 0 };
    valid.sort((a, b) => a - b);
    const sum = valid.reduce((a, b) => a + b, 0);
    const avg = sum / valid.length;
    const p95 = valid[Math.floor(valid.length * 0.95)];
    return { avg, p95, count: valid.length };
  });

  console.log(`[PERF] 300x100: avg = ${results.avg.toFixed(2)}ms, p95 = ${results.p95.toFixed(2)}ms (${results.count} frames)`);

  const outDir = path.resolve(__dirname, "../../../docs/perf");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(outDir, "last-run.json"),
    JSON.stringify({ timestamp: new Date().toISOString(), ...results }, null, 2),
  );

  expect(results.count).toBeGreaterThan(20);
});
