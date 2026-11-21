/**
 * threeGeometry.test.ts — P03-T02
 * Tests that each builder returns a valid geometry with correct bounding box.
 */
import { describe, it, expect } from "vitest";
import { buildThreeGeometry } from "./threeGeometry";
import { GEOMETRY_FIXTURES } from "@ai-classroom/geometry-core";
import type { SolidParams } from "@ai-classroom/geometry-core";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function approx(a: number, b: number, tol = 0.05): boolean {
  return Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// Bounding-box tests per solid
// ---------------------------------------------------------------------------

describe("buildThreeGeometry — cube", () => {
  it("bounding box dimensions equal side length", () => {
    const { dimensions } = buildThreeGeometry({ type: "cube", s: 4 });
    expect(approx(dimensions.width, 4)).toBe(true);
    expect(approx(dimensions.height, 4)).toBe(true);
    expect(approx(dimensions.depth, 4)).toBe(true);
  });
});

describe("buildThreeGeometry — cuboid", () => {
  it("bounding box matches l×h×w", () => {
    const { dimensions } = buildThreeGeometry({ type: "cuboid", l: 6, w: 3, h: 2 });
    expect(approx(dimensions.width, 6, 0.1)).toBe(true);
    expect(approx(dimensions.height, 2, 0.1)).toBe(true);
    expect(approx(dimensions.depth, 3, 0.1)).toBe(true);
  });
});

describe("buildThreeGeometry — sphere", () => {
  it("bounding box diameter = 2r", () => {
    const { dimensions } = buildThreeGeometry({ type: "sphere", r: 5 });
    expect(approx(dimensions.width, 10, 0.1)).toBe(true);
    expect(approx(dimensions.height, 10, 0.1)).toBe(true);
  });
});

describe("buildThreeGeometry — cylinder", () => {
  it("height matches, diameter = 2r", () => {
    const { dimensions } = buildThreeGeometry({ type: "cylinder", r: 3, h: 8 });
    expect(approx(dimensions.height, 8, 0.1)).toBe(true);
    expect(approx(dimensions.width, 6, 0.1)).toBe(true);
  });
});

describe("buildThreeGeometry — cone", () => {
  it("height matches", () => {
    const { dimensions } = buildThreeGeometry({ type: "cone", r: 4, h: 6 });
    expect(approx(dimensions.height, 6, 0.1)).toBe(true);
  });
});

describe("buildThreeGeometry — pyramid", () => {
  it("height matches", () => {
    const { dimensions } = buildThreeGeometry({ type: "pyramid", b: 4, h: 5 });
    expect(approx(dimensions.height, 5, 0.1)).toBe(true);
  });
});

describe("buildThreeGeometry — prism", () => {
  it("height (depth) matches h param for 3-4-5 triangle", () => {
    const { dimensions } = buildThreeGeometry({ type: "prism", a: 3, b: 4, c: 5, h: 10 });
    expect(approx(dimensions.height, 10, 0.5)).toBe(true);
  });
});

describe("buildThreeGeometry — torus", () => {
  it("bounding box roughly 2(R+r) wide", () => {
    const { dimensions } = buildThreeGeometry({ type: "torus", R: 5, r: 2 });
    expect(approx(dimensions.width, 2 * (5 + 2), 0.5)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// All fixtures produce non-empty geometries
// ---------------------------------------------------------------------------

describe("buildThreeGeometry — all GEOMETRY_FIXTURES produce valid geometry", () => {
  for (const fixture of GEOMETRY_FIXTURES) {
    it(`${fixture.params.type}: geometry has vertices`, () => {
      const { geometry } = buildThreeGeometry(fixture.params);
      const posAttr = geometry.getAttribute("position");
      expect(posAttr).toBeTruthy();
      expect(posAttr.count).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Bounding box is always finite
// ---------------------------------------------------------------------------

describe("buildThreeGeometry — bounding boxes are finite", () => {
  for (const fixture of GEOMETRY_FIXTURES) {
    it(`${fixture.params.type}: bbox is finite`, () => {
      const { boundingBox } = buildThreeGeometry(fixture.params);
      expect(boundingBox.min.x).not.toBeNaN();
      expect(boundingBox.max.x).not.toBeNaN();
      expect(Number.isFinite(boundingBox.min.x)).toBe(true);
      expect(Number.isFinite(boundingBox.max.x)).toBe(true);
    });
  }
});
