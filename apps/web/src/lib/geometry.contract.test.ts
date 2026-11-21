/**
 * geometry.contract.test.ts — P08-T02
 * Contract tests: TypeScript geometry-core vs expected values from shared fixture.
 * These expected values must stay in sync with apps/ai-service/tests/fixtures/geometry_cases.json.
 */
import { describe, it, expect } from "vitest";
import { computeGeometry, GEOMETRY_FIXTURES } from "@ai-classroom/geometry-core";
import type { SolidParams } from "@ai-classroom/geometry-core";

// ---------------------------------------------------------------------------
// Canonical fixture — keep in sync with geometry_cases.json
// ---------------------------------------------------------------------------

const PI = Math.PI;

interface ContractCase {
  id: string;
  params: SolidParams;
  expected: { volume: number; surface_area: number };
  tolerance: number;
}

const CONTRACT_CASES: ContractCase[] = [
  { id: "cube-s3",       params: { type: "cube",     s: 3 },                    expected: { volume: 27,                     surface_area: 54              }, tolerance: 1e-4 },
  { id: "cuboid-4x3x2",  params: { type: "cuboid",   l: 4, w: 3, h: 2 },        expected: { volume: 24,                     surface_area: 52              }, tolerance: 1e-4 },
  { id: "sphere-r5",     params: { type: "sphere",   r: 5 },                    expected: { volume: (4/3)*PI*125,            surface_area: 4*PI*25         }, tolerance: 1e-3 },
  { id: "cylinder-r3h7", params: { type: "cylinder", r: 3, h: 7 },              expected: { volume: PI*9*7,                  surface_area: 2*PI*3*(3+7)    }, tolerance: 1e-3 },
  { id: "cone-r4h3",     params: { type: "cone",     r: 4, h: 3 },              expected: { volume: (1/3)*PI*16*3,           surface_area: PI*4*(4+5)      }, tolerance: 1e-3 },
  { id: "pyramid-b6h4",  params: { type: "pyramid",  b: 6, h: 4 },              expected: { volume: (1/3)*36*4,              surface_area: 36+2*6*Math.sqrt(9+16) }, tolerance: 1e-3 },
  { id: "prism-3-4-5",   params: { type: "prism",    a: 3, b: 4, c: 5, h: 10 }, expected: { volume: 60,                     surface_area: 132             }, tolerance: 1e-3 },
  { id: "torus-R5r2",    params: { type: "torus",    R: 5, r: 2 },              expected: { volume: 2*PI**2*5*4,             surface_area: 4*PI**2*5*2     }, tolerance: 1e-3 },
];

// ---------------------------------------------------------------------------
// 1. Each contract case matches computeGeometry output
// ---------------------------------------------------------------------------

describe("geometry-core contract: JSON fixture cases", () => {
  for (const c of CONTRACT_CASES) {
    it(`${c.id} — volume and surface_area within tolerance`, () => {
      const result = computeGeometry(c.params);
      const tol = c.tolerance;
      expect(
        Math.abs(result.volume - c.expected.volume),
        `Volume: got ${result.volume}, expected ${c.expected.volume}`
      ).toBeLessThanOrEqual(tol + Math.abs(c.expected.volume) * tol);
      expect(
        Math.abs(result.surface_area - c.expected.surface_area),
        `SA: got ${result.surface_area}, expected ${c.expected.surface_area}`
      ).toBeLessThanOrEqual(tol + Math.abs(c.expected.surface_area) * tol);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. GEOMETRY_FIXTURES (from geometry-core) are self-consistent
// ---------------------------------------------------------------------------

describe("geometry-core: GEOMETRY_FIXTURES self-consistency", () => {
  for (const fixture of GEOMETRY_FIXTURES) {
    it(`${fixture.params.type} result matches fixture expected`, () => {
      const result = computeGeometry(fixture.params);
      const tol = fixture.tolerance;
      expect(Math.abs(result.volume - fixture.expected.volume)).toBeLessThanOrEqual(
        tol + Math.abs(fixture.expected.volume) * tol
      );
      expect(Math.abs(result.surface_area - fixture.expected.surface_area)).toBeLessThanOrEqual(
        tol + Math.abs(fixture.expected.surface_area) * tol
      );
    });
  }
});

// ---------------------------------------------------------------------------
// 3. All 8 solid types in CONTRACT_CASES are covered
// ---------------------------------------------------------------------------

it("CONTRACT_CASES covers all 8 solid types", () => {
  const types = new Set(CONTRACT_CASES.map((c) => c.params.type));
  for (const t of ["cube", "cuboid", "sphere", "cylinder", "cone", "pyramid", "prism", "torus"] as const) {
    expect(types.has(t), `Missing solid type: ${t}`).toBe(true);
  }
});
