/**
 * gridSpec.test.ts — P10-T04
 */
import { describe, it, expect } from "vitest";
import { gridSpec } from "./gridSpec";

describe("gridSpec", () => {
  it("scale 1 → world 20, screen 20, visible true", () => {
    const res = gridSpec(1, 20);
    expect(res.worldSpacing).toBe(20);
    expect(res.screenSpacing).toBe(20);
    expect(res.visible).toBe(true);
  });

  it("scale 0.29 → world 100, screen 29, visible true", () => {
    const res = gridSpec(0.29, 20);
    expect(res.worldSpacing).toBe(100);
    expect(res.screenSpacing).toBeCloseTo(29, 5);
    expect(res.visible).toBe(true);
  });

  it("scale 3 → world 20, screen 60, visible true", () => {
    const res = gridSpec(3, 20);
    expect(res.worldSpacing).toBe(20);
    expect(res.screenSpacing).toBe(60);
    expect(res.visible).toBe(true);
  });

  it("scale 0.1 → visible false", () => {
    const res = gridSpec(0.1, 20);
    expect(res.visible).toBe(false);
  });

  it("scale 0.05 → expands spacing and visible is false", () => {
    const res = gridSpec(0.05, 20);
    expect(res.visible).toBe(false);
    expect(res.worldSpacing).toBe(500); // 20*0.05=1 < 14 -> 100*0.05=5 < 14 -> 500*0.05=25 >= 14
  });
});
