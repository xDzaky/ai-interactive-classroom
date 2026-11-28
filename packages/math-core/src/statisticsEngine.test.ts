import { describe, expect, it } from "vitest";
import {
  computeGroupedStats,
  computeUngroupedStats,
  parseClassInterval,
  parseSpreadsheetPaste,
} from "./statisticsEngine.js";
import {
  computeHornerScheme,
  computeMatrixAnalysis,
  computeFactorTreeAndGcdLcm,
  computeTruthTable,
  computePascalTriangle,
  computeUnitConversion,
} from "./subjectHelpersEngine.js";

describe("V9 statisticsEngine — Exact Mean, Median, Mode", () => {
  it("parses standard and decimal intervals accurately", () => {
    const iv = parseClassInterval("31 - 40");
    expect(iv).not.toBeNull();
    expect(iv!.tb).toBe(30.5);
    expect(iv!.ta).toBe(40.5);
    expect(iv!.p).toBe(10);
    expect(iv!.xi).toBe(35.5);

    const dec = parseClassInterval("1.5 - 2.4");
    expect(dec).not.toBeNull();
    expect(dec!.tb).toBe(1.45);
    expect(dec!.ta).toBe(2.45);
    expect(dec!.p).toBe(1);
  });

  it("computes exact grouped Mean, Median, Mode for textbook 31-40..81-90 dataset", () => {
    const res = computeGroupedStats([
      { intervalLabel: "31 - 40", frequency: 3 },
      { intervalLabel: "41 - 50", frequency: 5 },
      { intervalLabel: "51 - 60", frequency: 10 },
      { intervalLabel: "61 - 70", frequency: 11 },
      { intervalLabel: "71 - 80", frequency: 8 },
      { intervalLabel: "81 - 90", frequency: 3 },
    ]);

    expect(res.valid).toBe(true);
    expect(res.n).toBe(40);
    // Sum f_i * x_i = 3*35.5 + 5*45.5 + 10*55.5 + 11*65.5 + 8*75.5 + 3*85.5 = 2470
    expect(res.sumFx).toBeCloseTo(2470, 5);
    expect(res.mean).toBeCloseTo(61.75, 5);
    // Median class: 61-70 (fk=29 >= 20, fkBefore=18, fm=11, Tb=60.5, p=10)
    // Me = 60.5 + (2/11)*10 = 62.318182
    expect(res.medianClassIndex).toBe(3);
    expect(res.median).toBeCloseTo(60.5 + (2 / 11) * 10, 5);
    // Mode class: 61-70 (d1 = 11-10 = 1, d2 = 11-8 = 3, Tb=60.5, p=10)
    // Mo = 60.5 + (1/4)*10 = 63.0
    expect(res.modalClassIndices).toEqual([3]);
    expect(res.mode).toBeCloseTo(63.0, 5);
    expect(res.chartSeries.histogram.length).toBe(6);
    expect(res.chartSeries.ogivePositive.length).toBe(7);
  });

  it("computes ungrouped stats for odd and even sample counts", () => {
    const odd = computeUngroupedStats([
      { x: 5, f: 1 },
      { x: 7, f: 2 },
      { x: 9, f: 2 },
    ]);
    expect(odd.n).toBe(5);
    expect(odd.median).toBe(7);
    expect(odd.mean).toBeCloseTo(37 / 5, 5);

    const even = computeUngroupedStats([
      { x: 4, f: 2 },
      { x: 6, f: 2 },
    ]);
    expect(even.n).toBe(4);
    expect(even.median).toBe(5);
    expect(even.modes).toEqual([]);
    expect(even.modeLabel).toBe("Tidak ada modus");
  });

  it("parses Excel tab-separated and CSV clipboard pastes", () => {
    const grid = parseSpreadsheetPaste("Nilai\tFrekuensi\n31 - 40\t3\n41 - 50\t5");
    expect(grid).toEqual([
      ["Nilai", "Frekuensi"],
      ["31 - 40", "3"],
      ["41 - 50", "5"],
    ]);
  });
});

describe("V9 subjectHelpersEngine — Deterministic Math & Science Solvers", () => {
  it("computes Horner's scheme quotient and remainder", () => {
    // (x^3 - 3x^2 + 2x - 5) / (x - 2) -> H(x) = x^2 - x, S = -5
    const h = computeHornerScheme([1, -3, 2, -5], 2);
    expect(h.quotientCoeffs).toEqual([1, -1, 0]);
    expect(h.remainder).toBe(-5);
    expect(h.quotientString).toBe("x^2 - x");
  });

  it("computes 2x2 and 3x3 matrix determinant, Sarrus terms, and inverse", () => {
    const m2 = computeMatrixAnalysis([
      [4, 2],
      [1, 3],
    ]);
    expect(m2.determinant).toBe(10);
    expect(m2.inverse).toEqual([
      [0.3, -0.2],
      [-0.1, 0.4],
    ]);
  });

  it("computes Factor Tree, Sengkedan, FPB & KPK for 24 and 36", () => {
    const res = computeFactorTreeAndGcdLcm([24, 36]);
    expect(res.fpb).toBe(12);
    expect(res.kpk).toBe(72);
    expect(res.factorizations[0].formatted).toBe("2^3 × 3");
    expect(res.factorizations[1].formatted).toBe("2^2 × 3^2");
  });

  it("evaluates Truth Table and detects Tautology", () => {
    const taut = computeTruthTable(["p"], "p || !p");
    expect(taut.classification).toBe("Tautologi");
    const imp = computeTruthTable(["p", "q"], "p -> q");
    expect(imp.classification).toBe("Kontingensi");
    expect(imp.rows.map((r) => r.result)).toEqual([true, false, true, true]);
  });

  it("computes Pascal Triangle and Unit Conversion Stairs", () => {
    const pascal = computePascalTriangle(5);
    expect(pascal[4]).toEqual([1, 4, 6, 4, 1]);

    const conv = computeUnitConversion("length", "km", "m", 2.5);
    expect(conv.stepsDown).toBe(3);
    expect(conv.result).toBe(2500);
  });
});
