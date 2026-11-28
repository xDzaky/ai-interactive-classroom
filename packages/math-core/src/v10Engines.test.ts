/**
 * v10Engines.test.ts — Verification suite for V10:
 * - Sprint 1: integerOpsEngine (-1+3, -1-3, 3-(-2), 2-5+4, 3*(-2), zero-pair chips)
 * - Sprint 2: linearInequalityEngine (all 3 textbook SPtLDV examples, objective Z, student check)
 * - Sprint 3: selectionAnalyzer (SPtLDV, SPLDV, SPtLSV, integer_ops, intercept table extraction)
 */
import { describe, it, expect } from "vitest";
import { parseIntegerExpression } from "./integerOpsEngine.js";
import { analyzeLinearSystem } from "./linearInequalityEngine.js";
import { analyzeSelectionContent } from "./selectionAnalyzer.js";

function expectHasCorner(corners: Array<{ pt: [number, number] }>, x: number, y: number) {
  const found = corners.some(
    (c) => Math.abs(c.pt[0] - x) < 1e-3 && Math.abs(c.pt[1] - y) < 1e-3,
  );
  expect(found, `Expected corner (${x}, ${y}) in ${JSON.stringify(corners.map((c) => c.pt))}`).toBe(true);
}

describe("V10 Sprint 1 — integerOpsEngine", () => {
  it("computes -1 + 3 = 2 with 1 rightward step of +3 and zero-pair chips", () => {
    const res = parseIntegerExpression("-1 + 3");
    expect(res.valid).toBe(true);
    expect(res.start).toBe(-1);
    expect(res.result).toBe(2);
    expect(res.steps).toHaveLength(1);
    expect(res.steps[0]).toMatchObject({ from: -1, delta: 3, to: 2 });
    expect(res.chips.zeroPairs).toBe(1);
    expect(res.chips.remainingSign).toBe("+");
    expect(res.chips.remainingCount).toBe(2);
  });

  it("computes -1 - 3 = -4 with 1 leftward step of -3", () => {
    const res = parseIntegerExpression("-1 - 3");
    expect(res.valid).toBe(true);
    expect(res.start).toBe(-1);
    expect(res.result).toBe(-4);
    expect(res.steps[0]).toMatchObject({ from: -1, delta: -3, to: -4 });
  });

  it("simplifies double negative 3 - (-2) = 5 with sign rule note", () => {
    const res = parseIntegerExpression("3 - (-2)");
    expect(res.valid).toBe(true);
    expect(res.result).toBe(5);
    expect(res.steps[0]).toMatchObject({ from: 3, delta: 2, to: 5 });
    expect(res.signSimplificationNotes.length).toBeGreaterThan(0);
  });

  it("handles chained operations 2 - 5 + 4 = 1", () => {
    const res = parseIntegerExpression("2 - 5 + 4");
    expect(res.valid).toBe(true);
    expect(res.start).toBe(2);
    expect(res.steps).toHaveLength(2);
    expect(res.steps[0]).toMatchObject({ from: 2, delta: -5, to: -3 });
    expect(res.steps[1]).toMatchObject({ from: -3, delta: 4, to: 1 });
    expect(res.result).toBe(1);
  });

  it("translates integer multiplication 3 * (-2) = -6 into 3 repeated jumps of -2", () => {
    const res = parseIntegerExpression("3 * (-2)");
    expect(res.valid).toBe(true);
    expect(res.isMultiplication).toBe(true);
    expect(res.result).toBe(-6);
    expect(res.steps).toHaveLength(3);
    expect(res.steps.map((s) => s.to)).toEqual([-2, -4, -6]);
  });
});

describe("V10 Sprint 2 — linearInequalityEngine (Exact SPtLDV)", () => {
  it("Example 1: {x + 2y <= 10, x + y <= 7, x >= 0, y >= 0} -> corners (0,0), (7,0), (4,3), (0,5)", () => {
    const res = analyzeLinearSystem("x + 2y <= 10\nx + y <= 7\nx >= 0\ny >= 0", {
      objectiveExpr: "Z = 3x + 4y",
    });
    expect(res.isEmpty).toBe(false);
    expect(res.isBounded).toBe(true);
    expect(res.cornerPoints).toHaveLength(4);
    expectHasCorner(res.cornerPoints, 0, 0);
    expectHasCorner(res.cornerPoints, 7, 0);
    expectHasCorner(res.cornerPoints, 4, 3);
    expectHasCorner(res.cornerPoints, 0, 5);
    // Max of Z = 3x + 4y is at (4, 3) => 24
    expect(res.objective?.maxCorner).toBeDefined();
    expect(res.cornerPoints[res.objective!.maxCorner!].objectiveValue).toBeCloseTo(24, 4);
  });

  it("Example 2: {2x + 3y <= 12, x >= 1, y >= 1} -> corners (1,1), (4.5,1), (1, 10/3)", () => {
    const res = analyzeLinearSystem("2x + 3y <= 12\nx >= 1\ny >= 1");
    expect(res.isEmpty).toBe(false);
    expect(res.isBounded).toBe(true);
    expect(res.cornerPoints).toHaveLength(3);
    expectHasCorner(res.cornerPoints, 1, 1);
    expectHasCorner(res.cornerPoints, 4.5, 1);
    expectHasCorner(res.cornerPoints, 1, 10 / 3);
  });

  it("Example 3 (chained inequalities): {x + y <= 7, 2 <= x <= 6, 0 <= y <= 8} -> corners (2,0), (6,0), (6,1), (2,5)", () => {
    const res = analyzeLinearSystem("x + y <= 7\n2 <= x <= 6\n0 <= y <= 8");
    expect(res.isEmpty).toBe(false);
    expect(res.isBounded).toBe(true);
    expect(res.cornerPoints).toHaveLength(4);
    expectHasCorner(res.cornerPoints, 2, 0);
    expectHasCorner(res.cornerPoints, 6, 0);
    expectHasCorner(res.cornerPoints, 6, 1);
    expectHasCorner(res.cornerPoints, 2, 5);
  });

  it("flags student intercept table mismatch accurately", () => {
    const res = analyzeLinearSystem("x + 2y <= 10\nx >= 0\ny >= 0", {
      studentTablePoints: [[0, 5], [10, 0], [3, 9]],
    });
    expect(res.studentCheck?.isConsistent).toBe(false);
    expect(res.studentCheck?.warnings).toHaveLength(1);
    expect(res.studentCheck?.warnings[0]).toContain("(3, 9)");
  });
});

describe("V10 Sprint 3 — selectionAnalyzer", () => {
  it("classifies multi-object SPtLDV + intercept table selection", () => {
    const res = analyzeSelectionContent([
      { id: "1", objectType: "math_block", latex: "x + 2y \\le 10" },
      { id: "2", objectType: "math_block", latex: "x + y \\le 7" },
      { id: "3", objectType: "text", text: "x >= 0, y >= 0" },
      {
        id: "4",
        objectType: "smart_table",
        tableCells: [
          [{ raw: "x" }, { raw: "y" }],
          [{ raw: "0" }, { raw: "5" }],
          [{ raw: "10" }, { raw: "0" }],
        ],
      },
    ]);
    expect(res.kind).toBe("sptldv");
    expect(res.detectedCount).toBe(4);
    expect(res.studentTablePoints).toEqual([[0, 5], [10, 0]]);
  });

  it("classifies simple integer expression selection into integer_ops", () => {
    const res = analyzeSelectionContent([
      { id: "1", objectType: "text", text: "-1 + 3 = 2" },
    ]);
    expect(res.kind).toBe("integer_ops");
    expect(res.integerExpression).toBe("-1 + 3");
  });
});
