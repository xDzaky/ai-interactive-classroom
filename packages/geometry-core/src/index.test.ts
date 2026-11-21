/**
 * geometry-core tests (P03-T01)
 * Verifies formulas against GEOMETRY_FIXTURES and edge cases.
 */
import { describe, it, expect } from "vitest";
import { computeGeometry, GEOMETRY_FIXTURES, GeometryError } from "./index.js";

const PI = Math.PI;

// ---------------------------------------------------------------------------
// Fixture tests — shared with Python contract tests
// ---------------------------------------------------------------------------

describe("computeGeometry — GEOMETRY_FIXTURES", () => {
  for (const fixture of GEOMETRY_FIXTURES) {
    it(`${fixture.params.type} matches expected values`, () => {
      const result = computeGeometry(fixture.params);
      expect(Math.abs(result.volume - fixture.expected.volume)).toBeLessThanOrEqual(fixture.tolerance);
      expect(Math.abs(result.surface_area - fixture.expected.surface_area)).toBeLessThanOrEqual(fixture.tolerance);
    });
  }
});

// ---------------------------------------------------------------------------
// Individual solid correctness
// ---------------------------------------------------------------------------

describe("cube", () => {
  it("s=1: volume=1, SA=6", () => {
    const r = computeGeometry({ type: "cube", s: 1 });
    expect(r.volume).toBeCloseTo(1, 5);
    expect(r.surface_area).toBeCloseTo(6, 5);
  });
  it("has formula strings", () => {
    const r = computeGeometry({ type: "cube", s: 2 });
    expect(r.formula_volume).toContain("s^3");
    expect(r.formula_surface_area).toContain("6s^2");
  });
});

describe("cuboid", () => {
  it("l=1, w=1, h=1 is a unit cube", () => {
    const r = computeGeometry({ type: "cuboid", l: 1, w: 1, h: 1 });
    expect(r.volume).toBeCloseTo(1, 5);
    expect(r.surface_area).toBeCloseTo(6, 5);
  });
});

describe("sphere", () => {
  it("r=1: volume=4π/3, SA=4π", () => {
    const r = computeGeometry({ type: "sphere", r: 1 });
    expect(r.volume).toBeCloseTo((4 / 3) * PI, 4);
    expect(r.surface_area).toBeCloseTo(4 * PI, 4);
  });
});

describe("cylinder", () => {
  it("r=1, h=1: volume=π, SA=4π", () => {
    const r = computeGeometry({ type: "cylinder", r: 1, h: 1 });
    expect(r.volume).toBeCloseTo(PI, 4);
    expect(r.surface_area).toBeCloseTo(2 * PI * 2, 4);
  });
});

describe("cone", () => {
  it("r=3, h=4: slant=5, volume and SA", () => {
    const r = computeGeometry({ type: "cone", r: 3, h: 4 });
    expect(r.volume).toBeCloseTo((1 / 3) * PI * 9 * 4, 4);
    expect(r.surface_area).toBeCloseTo(PI * 3 * (3 + 5), 4);
  });
});

describe("pyramid (square base)", () => {
  it("b=4, h=3: slant from center", () => {
    const slant = Math.sqrt(4 + 9);
    const r = computeGeometry({ type: "pyramid", b: 4, h: 3 });
    expect(r.volume).toBeCloseTo((1 / 3) * 16 * 3, 4);
    expect(r.surface_area).toBeCloseTo(16 + 2 * 4 * slant, 4);
  });
});

describe("prism (triangular)", () => {
  it("3-4-5 right triangle, h=1: volume=6, SA=12+12=24", () => {
    const r = computeGeometry({ type: "prism", a: 3, b: 4, c: 5, h: 1 });
    expect(r.volume).toBeCloseTo(6, 4);
    expect(r.surface_area).toBeCloseTo(12 + 12, 4);
  });
  it("equilateral a=b=c=2, h=5", () => {
    const area = Math.sqrt(3) / 4 * 4; // = √3
    const r = computeGeometry({ type: "prism", a: 2, b: 2, c: 2, h: 5 });
    expect(r.volume).toBeCloseTo(area * 5, 3);
  });
});

describe("torus", () => {
  it("R=3, r=1: volume and SA", () => {
    const r = computeGeometry({ type: "torus", R: 3, r: 1 });
    expect(r.volume).toBeCloseTo(2 * PI ** 2 * 3 * 1, 4);
    expect(r.surface_area).toBeCloseTo(4 * PI ** 2 * 3 * 1, 4);
  });
});

// ---------------------------------------------------------------------------
// Validation — negative/zero/invalid inputs
// ---------------------------------------------------------------------------

describe("validation", () => {
  it("throws GeometryError for zero radius", () => {
    expect(() => computeGeometry({ type: "sphere", r: 0 })).toThrow(GeometryError);
  });
  it("throws for negative dimension", () => {
    expect(() => computeGeometry({ type: "cube", s: -1 })).toThrow(GeometryError);
  });
  it("throws for NaN", () => {
    expect(() => computeGeometry({ type: "cylinder", r: NaN, h: 1 })).toThrow(GeometryError);
  });
  it("throws for Infinity", () => {
    expect(() => computeGeometry({ type: "cone", r: Infinity, h: 1 })).toThrow(GeometryError);
  });
  it("throws for triangle inequality violation in prism", () => {
    expect(() => computeGeometry({ type: "prism", a: 1, b: 1, c: 10, h: 5 })).toThrow(GeometryError);
  });
});

// ---------------------------------------------------------------------------
// Result structure
// ---------------------------------------------------------------------------

describe("result structure", () => {
  it("all results have label fields", () => {
    for (const fixture of GEOMETRY_FIXTURES) {
      const r = computeGeometry(fixture.params);
      expect(r.label_volume).toBeTruthy();
      expect(r.label_surface_area).toBeTruthy();
    }
  });
  it("results are finite numbers", () => {
    for (const fixture of GEOMETRY_FIXTURES) {
      const r = computeGeometry(fixture.params);
      expect(Number.isFinite(r.volume)).toBe(true);
      expect(Number.isFinite(r.surface_area)).toBe(true);
    }
  });
});
