/**
 * subjectHelpersEngine.ts — Deterministic Solvers for V9 Smart Subject Helpers
 *
 * Zero eval() / Function() — uses @ai-classroom/math-core safe AST evaluator.
 * Covers:
 * 1. Function Values Table
 * 2. Horner's Scheme (Polynomial Division)
 * 3. Interactive Matrix Ops (Det + Sarrus 3x3, Transpose, Inverse)
 * 4. Factor Tree & Sengkedan Table (Prime Factorization, FPB / GCD, KPK / LCM)
 * 5. Truth Table Evaluator (Tautology / Contradiction / Contingency)
 * 6. Sample Space (2 Dice 6x6, Coins, Pascal Triangle)
 * 7. Unit Conversion Stairs (Length km..mm, Mass kg..mg)
 */
import { safeEvaluate } from "./index.js";

// ─── 1. Function Values Table ────────────────────────────────────────────────

export interface FunctionTableRow {
  x: number;
  y: number | null;
  pairLabel: string;
}

export function computeFunctionTable(
  expr: string,
  xValues: number[],
): FunctionTableRow[] {
  return xValues.map((x) => {
    try {
      const y = safeEvaluate(expr, { x });
      const rounded = Math.round(y * 1000) / 1000;
      return { x, y: rounded, pairLabel: `(${x}, ${rounded})` };
    } catch {
      return { x, y: null, pairLabel: `(${x}, ?)` };
    }
  });
}

// ─── 2. Horner's Scheme (Pembagian Polinomial) ──────────────────────────────

export interface HornerResult {
  k: number;
  coeffs: number[];
  products: Array<number | null>;
  results: number[];
  quotientCoeffs: number[];
  remainder: number;
  quotientString: string;
}

export function computeHornerScheme(coeffs: number[], k: number): HornerResult {
  const clean = coeffs.length > 0 ? coeffs.map((c) => (Number.isFinite(c) ? c : 0)) : [1, 0];
  const products: Array<number | null> = [null];
  const results: number[] = [clean[0]];

  for (let i = 1; i < clean.length; i++) {
    const prod = Math.round(results[i - 1] * k * 1e6) / 1e6;
    products.push(prod);
    results.push(Math.round((clean[i] + prod) * 1e6) / 1e6);
  }

  const quotientCoeffs = results.slice(0, -1);
  const remainder = results[results.length - 1] ?? 0;

  const deg = Math.max(0, quotientCoeffs.length - 1);
  const terms: string[] = [];
  quotientCoeffs.forEach((c, idx) => {
    if (Math.abs(c) < 1e-9) return;
    const p = deg - idx;
    const sign = c < 0 ? " - " : terms.length > 0 ? " + " : "";
    const absC = Math.abs(c);
    const coeffStr = p > 0 && absC === 1 ? "" : String(absC);
    const varStr = p === 0 ? "" : p === 1 ? "x" : `x^${p}`;
    terms.push(`${sign}${coeffStr}${varStr}`);
  });

  return {
    k,
    coeffs: clean,
    products,
    results,
    quotientCoeffs,
    remainder,
    quotientString: terms.length > 0 ? terms.join("") : "0",
  };
}

// ─── 3. Matrix Operations (2x2 & 3x3 Det, Sarrus, Transpose, Inverse) ───────

export interface MatrixAnalysis {
  rows: number;
  cols: number;
  isSquare: boolean;
  determinant: number | null;
  sarrusPosTerms?: number[];
  sarrusNegTerms?: number[];
  transpose: number[][];
  inverse: number[][] | null;
}

export function computeMatrixAnalysis(m: number[][]): MatrixAnalysis {
  const rows = m.length;
  const cols = m[0]?.length ?? 0;
  const isSquare = rows > 0 && rows === cols;

  const transpose: number[][] = Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => m[r]?.[c] ?? 0),
  );

  let determinant: number | null = null;
  let sarrusPosTerms: number[] | undefined;
  let sarrusNegTerms: number[] | undefined;
  let inverse: number[][] | null = null;

  if (isSquare && rows === 2) {
    const [[a, b], [c, d]] = m;
    determinant = Math.round((a * d - b * c) * 1e6) / 1e6;
    if (Math.abs(determinant) > 1e-9) {
      inverse = [
        [Math.round((d / determinant) * 1000) / 1000, Math.round((-b / determinant) * 1000) / 1000],
        [Math.round((-c / determinant) * 1000) / 1000, Math.round((a / determinant) * 1000) / 1000],
      ];
    }
  } else if (isSquare && rows === 3) {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    sarrusPosTerms = [a * e * i, b * f * g, c * d * h];
    sarrusNegTerms = [c * e * g, a * f * h, b * d * i];
    determinant =
      Math.round(
        (sarrusPosTerms.reduce((s, v) => s + v, 0) - sarrusNegTerms.reduce((s, v) => s + v, 0)) * 1e6,
      ) / 1e6;
    if (Math.abs(determinant) > 1e-9) {
      const cof = [
        [e * i - f * h, -(d * i - f * g), d * h - e * g],
        [-(b * i - c * h), a * i - c * g, -(a * h - b * g)],
        [b * f - c * e, -(a * f - c * d), a * e - b * d],
      ];
      inverse = Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 3 }, (_, col) => Math.round((cof[col][r] / determinant!) * 1000) / 1000),
      );
    }
  }

  return { rows, cols, isSquare, determinant, sarrusPosTerms, sarrusNegTerms, transpose, inverse };
}

// ─── 4. Factor Tree & Sengkedan (FPB & KPK) ──────────────────────────────────

export interface FactorTreeNode {
  value: number;
  isPrime: boolean;
  left?: FactorTreeNode;
  right?: FactorTreeNode;
}

export interface SengkedanStep {
  divisor: number;
  valuesBefore: number[];
  valuesAfter: number[];
  dividesAll: boolean;
}

export interface FactorAnalysisResult {
  numbers: number[];
  trees: FactorTreeNode[];
  factorizations: Array<{ n: number; factors: Record<number, number>; formatted: string }>;
  sengkedan: SengkedanStep[];
  fpb: number;
  kpk: number;
}

function smallestPrimeFactor(n: number): number {
  if (n <= 1) return n;
  if (n % 2 === 0) return 2;
  for (let d = 3; d * d <= n; d += 2) {
    if (n % d === 0) return d;
  }
  return n;
}

function buildFactorTree(n: number): FactorTreeNode {
  const spf = smallestPrimeFactor(n);
  if (spf === n || n <= 1) {
    return { value: n, isPrime: n > 1 };
  }
  return {
    value: n,
    isPrime: false,
    left: { value: spf, isPrime: true },
    right: buildFactorTree(n / spf),
  };
}

function primeFactorsMap(n: number): Record<number, number> {
  const out: Record<number, number> = {};
  let cur = Math.max(1, Math.floor(Math.abs(n)));
  while (cur > 1) {
    const p = smallestPrimeFactor(cur);
    out[p] = (out[p] ?? 0) + 1;
    cur = Math.floor(cur / p);
  }
  return out;
}

function gcd2(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export function computeFactorTreeAndGcdLcm(rawNumbers: number[]): FactorAnalysisResult {
  const numbers = rawNumbers
    .map((n) => Math.max(2, Math.min(9999, Math.round(Math.abs(n)))))
    .filter((n) => Number.isFinite(n))
    .slice(0, 4);
  if (numbers.length === 0) numbers.push(24, 36);

  const trees = numbers.map((n) => buildFactorTree(n));
  const factorizations = numbers.map((n) => {
    const factors = primeFactorsMap(n);
    const formatted =
      Object.entries(factors)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([p, exp]) => (exp > 1 ? `${p}^${exp}` : p))
        .join(" × ") || String(n);
    return { n, factors, formatted };
  });

  // Sengkedan table
  const sengkedan: SengkedanStep[] = [];
  let cur = [...numbers];
  let guard = 0;
  while (cur.some((v) => v > 1) && guard++ < 40) {
    const active = cur.filter((v) => v > 1);
    const divisor = Math.min(...active.map(smallestPrimeFactor));
    const dividesAll = cur.every((v) => v % divisor === 0);
    const next = cur.map((v) => (v % divisor === 0 ? v / divisor : v));
    sengkedan.push({ divisor, valuesBefore: [...cur], valuesAfter: next, dividesAll });
    cur = next;
  }

  const fpb = numbers.reduce((acc, v) => gcd2(acc, v));
  const kpk = numbers.reduce((acc, v) => Math.round((acc * v) / gcd2(acc, v)));

  return { numbers, trees, factorizations, sengkedan, fpb, kpk };
}

// ─── 5. Safe Boolean Truth Table Evaluator ───────────────────────────────────

export interface TruthTableResult {
  vars: string[];
  expr: string;
  rows: Array<{ inputs: boolean[]; result: boolean }>;
  classification: "Tautologi" | "Kontradiksi" | "Kontingensi";
}

function evalBooleanExpr(expr: string, env: Record<string, boolean>): boolean {
  // Normalize Unicode logic symbols to safe tokens
  const norm = expr
    .replace(/¬|~/g, "!")
    .replace(/∧/g, "&")
    .replace(/∨/g, "|")
    .replace(/⇔|<->|<=>/g, "=")
    .replace(/⇒|->|=>/g, ">")
    .replace(/&&/g, "&")
    .replace(/\|\|/g, "|")
    .replace(/\s+/g, "");

  let pos = 0;
  const peek = () => norm[pos] ?? "";
  const consume = () => norm[pos++] ?? "";

  const parseIff = (): boolean => {
    let left = parseImplies();
    while (peek() === "=") {
      consume();
      const right = parseImplies();
      left = left === right;
    }
    return left;
  };

  const parseImplies = (): boolean => {
    let left = parseOr();
    while (peek() === ">") {
      consume();
      const right = parseOr();
      left = !left || right;
    }
    return left;
  };

  const parseOr = (): boolean => {
    let left = parseAnd();
    while (peek() === "|") {
      consume();
      const right = parseAnd();
      left = left || right;
    }
    return left;
  };

  const parseAnd = (): boolean => {
    let left = parseUnary();
    while (peek() === "&") {
      consume();
      const right = parseUnary();
      left = left && right;
    }
    return left;
  };

  const parseUnary = (): boolean => {
    if (peek() === "!") {
      consume();
      return !parseUnary();
    }
    if (peek() === "(") {
      consume();
      const val = parseIff();
      if (peek() === ")") consume();
      return val;
    }
    const ch = consume();
    if (ch === "1" || ch === "T" || ch === "B") return true;
    if (ch === "0" || ch === "F" || ch === "S") return false;
    return Boolean(env[ch]);
  };

  return parseIff();
}

export function computeTruthTable(vars: string[], expr: string): TruthTableResult {
  const cleanVars = vars.slice(0, 4);
  const rowCount = 1 << cleanVars.length;
  const rows: Array<{ inputs: boolean[]; result: boolean }> = [];

  for (let mask = 0; mask < rowCount; mask++) {
    const inputs: boolean[] = [];
    const env: Record<string, boolean> = {};
    for (let i = 0; i < cleanVars.length; i++) {
      // Standard textbook order: B, B, ..., S, S
      const bit = Boolean(((rowCount - 1 - mask) >> (cleanVars.length - 1 - i)) & 1);
      inputs.push(bit);
      env[cleanVars[i]] = bit;
    }
    rows.push({ inputs, result: evalBooleanExpr(expr, env) });
  }

  const allTrue = rows.every((r) => r.result);
  const allFalse = rows.every((r) => !r.result);
  const classification = allTrue ? "Tautologi" : allFalse ? "Kontradiksi" : "Kontingensi";

  return { vars: cleanVars, expr, rows, classification };
}

// ─── 6. Pascal Triangle & Unit Conversion Stairs ─────────────────────────────

export function computePascalTriangle(numRows: number): number[][] {
  const count = Math.max(1, Math.min(10, Math.floor(numRows)));
  const rows: number[][] = [];
  for (let r = 0; r < count; r++) {
    const row: number[] = [1];
    for (let c = 1; c < r; c++) {
      row.push(rows[r - 1][c - 1] + rows[r - 1][c]);
    }
    if (r > 0) row.push(1);
    rows.push(row);
  }
  return rows;
}

export const UNIT_STAIRS_SCALES = {
  length: ["km", "hm", "dam", "m", "dm", "cm", "mm"],
  mass: ["kg", "hg", "dag", "g", "dg", "cg", "mg"],
} as const;

export interface UnitConversionResult {
  category: "length" | "mass";
  fromUnit: string;
  toUnit: string;
  value: number;
  stepsDown: number; // positive = down (x10), negative = up (/10)
  factorLabel: string;
  result: number;
}

export function computeUnitConversion(
  category: "length" | "mass",
  fromUnit: string,
  toUnit: string,
  value: number,
): UnitConversionResult {
  const scale = UNIT_STAIRS_SCALES[category] as readonly string[];
  const fromIdx = Math.max(0, scale.indexOf(fromUnit));
  const toIdx = Math.max(0, scale.indexOf(toUnit));
  const stepsDown = toIdx - fromIdx;
  const result = value * 10 ** stepsDown;
  const absSteps = Math.abs(stepsDown);
  const factorLabel =
    stepsDown === 0
      ? "× 1 (tetap)"
      : stepsDown > 0
        ? `× 10^${absSteps} (turun ${absSteps} tangga)`
        : `÷ 10^${absSteps} (naik ${absSteps} tangga)`;

  return {
    category,
    fromUnit: scale[fromIdx],
    toUnit: scale[toIdx],
    value,
    stepsDown,
    factorLabel,
    result: Number(result.toPrecision(10)),
  };
}
