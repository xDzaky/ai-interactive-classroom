/**
 * selectionAnalyzer.ts — V10 Selection-to-Visual Analyzer Bridge
 *
 * Aggregates content from selected Whiteboard / Notes objects (math_block, text,
 * smart_table, annotation, recognized handwriting LaTeX) and auto-classifies:
 * - "sptldv" (2D linear inequality system / linear programming)
 * - "spldv" (2D linear equation system)
 * - "quadratic_ineq" (quadratic inequality in x, y)
 * - "sptlsv" (1D linear inequality in x only)
 * - "integer_ops" (integer arithmetic expression e.g. "-1 + 3")
 */

import { parseIntegerExpression } from "./integerOpsEngine.js";
import { parseLinearSystemText } from "./linearInequalityEngine.js";

export interface SelectionContentItem {
  id: string;
  objectType: string;
  text?: string;
  latex?: string;
  tableCells?: Array<Array<{ raw: string }>>;
}

export type SelectionAnalysisKind =
  | "sptldv"
  | "spldv"
  | "quadratic_ineq"
  | "sptlsv"
  | "integer_ops"
  | "none";

export interface SelectionAnalysisResult {
  kind: SelectionAnalysisKind;
  actionLabel: string;
  rawExpressions: string;
  objectiveExpr?: string;
  studentTablePoints: [number, number][];
  integerExpression?: string;
  detectedCount: number;
}

function extractPointsFromTableCells(cells: Array<Array<{ raw: string }>>): [number, number][] {
  const pts: [number, number][] = [];
  if (!cells || cells.length < 2) return pts;

  // Pattern A: 2-column or 3-column table with header "x" and "y"
  const header = cells[0].map((c) => c.raw.trim().toLowerCase());
  const xCol = header.findIndex((h) => h === "x");
  const yCol = header.findIndex((h) => h === "y");
  if (xCol >= 0 && yCol >= 0) {
    for (let r = 1; r < cells.length; r++) {
      const xv = Number((cells[r][xCol]?.raw ?? "").replace(",", "."));
      const yv = Number((cells[r][yCol]?.raw ?? "").replace(",", "."));
      if (Number.isFinite(xv) && Number.isFinite(yv)) {
        pts.push([xv, yv]);
      }
    }
    return pts;
  }

  // Pattern B: horizontal intercept table (row 0 starts with "x", row 1 starts with "y")
  if (header[0] === "x" && cells[1]?.[0]?.raw.trim().toLowerCase() === "y") {
    const cols = Math.min(cells[0].length, cells[1].length);
    for (let c = 1; c < cols; c++) {
      const xv = Number((cells[0][c]?.raw ?? "").replace(",", "."));
      const yv = Number((cells[1][c]?.raw ?? "").replace(",", "."));
      if (Number.isFinite(xv) && Number.isFinite(yv)) {
        pts.push([xv, yv]);
      }
    }
    return pts;
  }

  // Pattern C: explicit "(x, y)" cells anywhere in table
  for (const row of cells) {
    for (const c of row) {
      const m = c.raw.match(/\(\s*([+-]?\d+(?:[.,]\d+)?)\s*,\s*([+-]?\d+(?:[.,]\d+)?)\s*\)/);
      if (m) {
        const xv = Number(m[1].replace(",", "."));
        const yv = Number(m[2].replace(",", "."));
        if (Number.isFinite(xv) && Number.isFinite(yv)) {
          pts.push([xv, yv]);
        }
      }
    }
  }

  return pts;
}

export function analyzeSelectionContent(items: SelectionContentItem[]): SelectionAnalysisResult {
  const lines: string[] = [];
  const studentTablePoints: [number, number][] = [];

  for (const item of items) {
    if (item.latex && item.latex.trim()) lines.push(item.latex.trim());
    if (item.text && item.text.trim()) lines.push(item.text.trim());
    if (item.tableCells && item.tableCells.length > 0) {
      studentTablePoints.push(...extractPointsFromTableCells(item.tableCells));
      // Also inspect cells that contain inequalities/equations
      for (const row of item.tableCells) {
        for (const c of row) {
          if (/[<>≤≥=]/.test(c.raw) && /[xy]/i.test(c.raw)) {
            lines.push(c.raw.trim());
          }
        }
      }
    }
  }

  const combined = lines.join("\n").trim();
  if (!combined) {
    return {
      kind: "none",
      actionLabel: "",
      rawExpressions: "",
      studentTablePoints,
      detectedCount: 0,
    };
  }

  // 1. Check Quadratic Inequality (has x^2 or y^2 AND an inequality sign)
  const hasQuad = /(?:x\^2|y\^2|x²|y²)/i.test(combined);
  const hasIneqSign = /(<=|>=|<|>|≤|≥|\\le|\\ge)/.test(combined);
  if (hasQuad && hasIneqSign) {
    return {
      kind: "quadratic_ineq",
      actionLabel: "Analisis & Gambar Grafik (DP)",
      rawExpressions: combined,
      studentTablePoints,
      detectedCount: lines.length,
    };
  }

  // 2. Parse Linear System (SPtLDV / SPLDV / SPtLSV)
  const parsed = parseLinearSystemText(combined);

  if (parsed.inequalities.length >= 1) {
    // Check if ALL inequalities only use variable x (1D SPtLSV)
    const hasY = parsed.inequalities.some((iq) => Math.abs(iq.b) > 1e-7);
    if (!hasY && parsed.inequalities.length <= 2 && !parsed.objective) {
      return {
        kind: "sptlsv",
        actionLabel: "Visualisasikan Garis Bilangan",
        rawExpressions: parsed.inequalities.map((i) => i.rawLatex).join("\n"),
        studentTablePoints,
        detectedCount: parsed.inequalities.length,
      };
    }

    return {
      kind: "sptldv",
      actionLabel: "Analisis & Gambar Grafik (DP)",
      rawExpressions: parsed.inequalities.map((i) => i.rawLatex).join("\n"),
      objectiveExpr: parsed.objective?.latex,
      studentTablePoints,
      detectedCount: parsed.inequalities.length,
    };
  }

  if (parsed.equations.length >= 2) {
    return {
      kind: "spldv",
      actionLabel: "Analisis & Gambar Grafik (SPLDV)",
      rawExpressions: parsed.equations.map((e) => e.rawLatex).join("\n"),
      studentTablePoints,
      detectedCount: parsed.equations.length,
    };
  }

  // 3. Check simple integer arithmetic expression (e.g. "-1 + 3", "3 - (-2) = 5", "3 * (-2)")
  if (lines.length === 1 && !/[a-zA-Z]/.test(combined.replace(/\\times|\\cdot/g, ""))) {
    const intParsed = parseIntegerExpression(combined);
    if (intParsed.valid && intParsed.steps.length >= 1) {
      return {
        kind: "integer_ops",
        actionLabel: "Visualisasikan Garis Bilangan",
        rawExpressions: combined,
        integerExpression: combined.split("=")[0].trim(),
        studentTablePoints: [],
        detectedCount: 1,
      };
    }
  }

  return {
    kind: "none",
    actionLabel: "",
    rawExpressions: combined,
    studentTablePoints,
    detectedCount: 0,
  };
}
