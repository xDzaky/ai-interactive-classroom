/**
 * linearInequalityEngine.ts — V10 Exact Geometry Engine for SPtLDV, SPLDV & Program Linear
 *
 * 100% deterministic, zero-eval:
 * - Chained inequality splitting ("2 <= x <= 6" -> "x >= 2" & "x <= 6")
 * - Arbitrary linear form parsing ("ax + by <= c", "y <= -x + 7", "2x <= 12 - 3y")
 * - Sutherland–Hodgman half-plane clipping for exact convex feasible polygon (DP)
 * - Cramer's rule pairwise intersections & corner point extraction (A, B, C, ...)
 * - Objective function Z = px + qy optimization across corner points
 * - Half-plane band clipping for textbook "DP adalah daerah yang bersih" rendering
 * - Student intercept-table verification
 */

export type InequalityOp = "<=" | ">=" | "<" | ">";

export interface LinearInequality {
  id: string;
  rawLatex: string;
  /** Canonical form: a*x + b*y [op] c */
  a: number;
  b: number;
  c: number;
  op: InequalityOp;
  strict: boolean;
  color: string;
}

export interface LinearEquation {
  id: string;
  rawLatex: string;
  a: number;
  b: number;
  c: number;
  color: string;
}

export interface InterceptTableEntry {
  inequalityId: string;
  equationLatex: string;
  xIntercept: [number, number] | null;
  yIntercept: [number, number] | null;
  testPoint: {
    pt: [number, number];
    satisfied: boolean;
    substitutionText: string;
  };
}

export interface CornerPointResult {
  pt: [number, number];
  label: string;
  objectiveValue?: number;
}

export interface ViewportBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface AnalyzedLinearSystem {
  inequalities: LinearInequality[];
  equations: LinearEquation[];
  interceptTables: InterceptTableEntry[];
  feasiblePolygon: [number, number][];
  isBounded: boolean;
  isEmpty: boolean;
  dpLabelPoint: [number, number] | null;
  cornerPoints: CornerPointResult[];
  objective?: {
    latex: string;
    p: number;
    q: number;
    maxCorner?: number;
    minCorner?: number;
  };
  viewportBounds: ViewportBounds;
  studentCheck?: {
    warnings: string[];
    isConsistent: boolean;
  };
}

const BAND_PALETTE = [
  "#FDE68A", // soft yellow
  "#93C5FD", // soft blue
  "#BBF7D0", // soft green
  "#FDBA74", // soft orange
  "#C4B5FD", // soft violet
  "#FDA4AF", // soft rose
  "#94A3B8", // slate
];

const EPS = 1e-7;
const WORLD_EXTENT = 1e4;

function normalizeMathLine(raw: string): string {
  return raw
    .replace(/\\left|\\right|\$|\\{|\\}|\\begin\{cases\}|\\end\{cases\}/g, " ")
    .replace(/\\leq|\\le|≤/g, "<=")
    .replace(/\\geq|\\ge|≥/g, ">=")
    .replace(/\\lt/g, "<")
    .replace(/\\gt/g, ">")
    .replace(/[−–—]/g, "-")
    .replace(/\\cdot|×|·/g, "*")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse a linear side like "2x - 3y + 5" into { a (coeff x), b (coeff y), k (constant) } */
function parseLinearSide(side: string): { a: number; b: number; k: number } | null {
  const s = side.replace(/\s+/g, "").replace(/\*/g, "");
  if (!s) return null;
  // Reject quadratic/higher powers or unsupported variables
  if (/\^|x2|y2|x²|y²/i.test(s)) return null;

  let a = 0;
  let b = 0;
  let k = 0;

  // Tokenize into signed terms: e.g. "+2x", "-3y", "+12", "-x", "1/2y"
  const termRegex = /([+-]?)(?:(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?)?([xy])?/gi;
  let idx = 0;
  let matchedAny = false;

  while (idx < s.length) {
    termRegex.lastIndex = idx;
    const m = termRegex.exec(s);
    if (!m || m.index !== idx || m[0].length === 0) {
      return null;
    }
    const signStr = m[1];
    const numStr = m[2];
    const denStr = m[3];
    const varStr = m[4]?.toLowerCase();

    if (!numStr && !varStr) return null;

    const sign = signStr === "-" ? -1 : 1;
    let val = numStr ? parseFloat(numStr) : 1;
    if (denStr) {
      const den = parseFloat(denStr);
      if (den === 0) return null;
      val = val / den;
    }
    val *= sign;

    if (varStr === "x") a += val;
    else if (varStr === "y") b += val;
    else k += val;

    matchedAny = true;
    idx += m[0].length;
  }

  return matchedAny ? { a, b, k } : null;
}

function flipOp(op: InequalityOp): InequalityOp {
  if (op === "<=") return ">=";
  if (op === ">=") return "<=";
  if (op === "<") return ">";
  return "<";
}

function formatCoeffTerm(coeff: number, variable: string, isFirst: boolean): string {
  if (Math.abs(coeff) < EPS) return "";
  const abs = Math.abs(coeff);
  const absStr = Math.abs(abs - 1) < EPS ? "" : Number.isInteger(abs) ? String(abs) : String(Number(abs.toFixed(2)));
  const sign = coeff < 0 ? (isFirst ? "-" : " - ") : isFirst ? "" : " + ";
  return `${sign}${absStr}${variable}`;
}

export function formatLinearEquation(a: number, b: number, c: number): string {
  const parts: string[] = [];
  if (Math.abs(a) >= EPS) parts.push(formatCoeffTerm(a, "x", parts.length === 0));
  if (Math.abs(b) >= EPS) parts.push(formatCoeffTerm(b, "y", parts.length === 0));
  const lhs = parts.join("") || "0";
  const rhs = Number.isInteger(c) ? String(c) : String(Number(c.toFixed(2)));
  return `${lhs} = ${rhs}`;
}

export function formatLinearInequality(a: number, b: number, op: InequalityOp, c: number): string {
  const eq = formatLinearEquation(a, b, c);
  const prettyOp = op === "<=" ? "≤" : op === ">=" ? "≥" : op;
  return eq.replace(" = ", ` ${prettyOp} `);
}

export function parseObjectiveFunction(raw: string): { latex: string; p: number; q: number } | null {
  const line = normalizeMathLine(raw);
  const m = line.match(/^(?:(?:f\s*\(\s*x\s*,\s*y\s*\)|z)\s*=\s*)(.+)$/i);
  if (!m) return null;
  const parsed = parseLinearSide(m[1]);
  if (!parsed || (Math.abs(parsed.a) < EPS && Math.abs(parsed.b) < EPS)) return null;
  return { latex: line, p: parsed.a, q: parsed.b };
}

/**
 * Parse multi-line text / LaTeX into canonical LinearInequality[], LinearEquation[],
 * and optional objective function Z = px + qy.
 * Supports chained inequalities like "2 <= x <= 6" and "0 <= y <= 8".
 */
export function parseLinearSystemText(rawText: string): {
  inequalities: LinearInequality[];
  equations: LinearEquation[];
  objective?: { latex: string; p: number; q: number };
} {
  const rawChunks = rawText
    .replace(/\\\\/g, "\n")
    .split(/[\n;,]/)
    .map((s) => normalizeMathLine(s))
    .filter(Boolean);

  const inequalities: LinearInequality[] = [];
  const equations: LinearEquation[] = [];
  let objective: { latex: string; p: number; q: number } | undefined;

  let colorIdx = 0;

  const pushRelation = (lhsStr: string, opStr: string, rhsStr: string) => {
    const lhs = parseLinearSide(lhsStr);
    const rhs = parseLinearSide(rhsStr);
    if (!lhs || !rhs) return;

    // Move variables to LHS, constants to RHS: (lhs.a - rhs.a)x + (lhs.b - rhs.b)y [op] (rhs.k - lhs.k)
    let a = lhs.a - rhs.a;
    let b = lhs.b - rhs.b;
    let c = rhs.k - lhs.k;
    if (Math.abs(a) < EPS && Math.abs(b) < EPS) return;

    // Normalize leading negative sign on single-variable bounds (e.g. "-x <= -2" -> "x >= 2")
    let op = opStr as InequalityOp | "=";
    if (Math.abs(a) < EPS && b < -EPS) {
      b = -b;
      c = -c;
      if (op !== "=") op = flipOp(op);
    } else if (Math.abs(b) < EPS && a < -EPS) {
      a = -a;
      c = -c;
      if (op !== "=") op = flipOp(op);
    }

    const color = BAND_PALETTE[colorIdx % BAND_PALETTE.length];
    colorIdx++;

    if (op === "=") {
      equations.push({
        id: `eq-${equations.length + 1}`,
        rawLatex: formatLinearEquation(a, b, c),
        a,
        b,
        c,
        color,
      });
    } else {
      inequalities.push({
        id: `ineq-${inequalities.length + 1}`,
        rawLatex: formatLinearInequality(a, b, op, c),
        a,
        b,
        c,
        op,
        strict: op === "<" || op === ">",
        color,
      });
    }
  };

  for (const chunk of rawChunks) {
    // Check objective function first: Z = 3x + 4y or f(x,y) = 3x + 4y
    const obj = parseObjectiveFunction(chunk);
    if (obj) {
      objective = obj;
      continue;
    }

    // Split by comparison operators while keeping the operators
    const parts = chunk.split(/(<=|>=|<|>|=)/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 3 && /^(<=|>=|<|>|=)$/.test(parts[1])) {
      pushRelation(parts[0], parts[1], parts[2]);
    } else if (
      parts.length === 5 &&
      /^(<=|>=|<|>)$/.test(parts[1]) &&
      /^(<=|>=|<|>)$/.test(parts[3])
    ) {
      // Chained inequality: e.g. "2 <= x <= 6" -> "2 <= x" and "x <= 6"
      pushRelation(parts[0], parts[1], parts[2]);
      pushRelation(parts[2], parts[3], parts[4]);
    }
  }

  return { inequalities, equations, objective };
}

/**
 * Sutherland–Hodgman half-plane clipping.
 * Keeps all points (x, y) satisfying: a*x + b*y <= c.
 */
export function clipPolygonByHalfPlane(
  polygon: [number, number][],
  a: number,
  b: number,
  c: number,
): [number, number][] {
  if (polygon.length === 0) return [];
  const evalFn = (pt: [number, number]) => a * pt[0] + b * pt[1] - c;
  const inside = (pt: [number, number]) => evalFn(pt) <= EPS;

  const out: [number, number][] = [];
  for (let i = 0; i < polygon.length; i++) {
    const curr = polygon[i];
    const prev = polygon[(i + polygon.length - 1) % polygon.length];
    const currIn = inside(curr);
    const prevIn = inside(prev);

    if (currIn !== prevIn) {
      const fPrev = evalFn(prev);
      const fCurr = evalFn(curr);
      const denom = fPrev - fCurr;
      if (Math.abs(denom) > 1e-12) {
        const t = fPrev / denom;
        out.push([prev[0] + t * (curr[0] - prev[0]), prev[1] + t * (curr[1] - prev[1])]);
      }
    }
    if (currIn) {
      out.push(curr);
    }
  }
  return out;
}

/**
 * Returns the polygon inside `viewport` representing the UNSATISFIED half-plane
 * of `ineq` (used for "DP adalah daerah yang bersih" textbook shading).
 */
export function getUnsatisfiedHalfPlanePolygon(
  viewport: ViewportBounds,
  ineq: LinearInequality,
): [number, number][] {
  const box: [number, number][] = [
    [viewport.xMin, viewport.yMin],
    [viewport.xMax, viewport.yMin],
    [viewport.xMax, viewport.yMax],
    [viewport.xMin, viewport.yMax],
  ];
  // If ineq is a*x + b*y <= c, unsatisfied side is a*x + b*y >= c  <=>  -a*x - b*y <= -c
  if (ineq.op === "<=" || ineq.op === "<") {
    return clipPolygonByHalfPlane(box, -ineq.a, -ineq.b, -ineq.c);
  }
  // If ineq is a*x + b*y >= c, unsatisfied side is a*x + b*y <= c
  return clipPolygonByHalfPlane(box, ineq.a, ineq.b, ineq.c);
}

function dedupePolygon(pts: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const pt of pts) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) > 1e-4) {
      out.push(pt);
    }
  }
  if (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) <= 1e-4) {
      out.pop();
    }
  }
  return out;
}

function polygonCentroid(pts: [number, number][]): [number, number] | null {
  if (pts.length === 0) return null;
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const cross = x0 * y1 - x1 * y0;
    area2 += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(area2) < 1e-6) {
    const sx = pts.reduce((s, p) => s + p[0], 0);
    const sy = pts.reduce((s, p) => s + p[1], 0);
    return [sx / pts.length, sy / pts.length];
  }
  return [cx / (3 * area2), cy / (3 * area2)];
}

export function formatCoordNumber(n: number): string {
  if (Math.abs(n) < 1e-6) return "0";
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) < 1e-4) return String(rounded);
  return String(Number(n.toFixed(2)));
}

export function analyzeLinearSystem(
  rawText: string,
  opts?: {
    objectiveExpr?: string;
    studentTablePoints?: [number, number][];
  },
): AnalyzedLinearSystem {
  const parsed = parseLinearSystemText(rawText);
  const inequalities = parsed.inequalities;
  const equations = parsed.equations;
  const objective =
    (opts?.objectiveExpr ? parseObjectiveFunction(opts.objectiveExpr) ?? undefined : undefined) ??
    parsed.objective;

  // 1. Build intercept tables & test points for every inequality
  const interceptTables: InterceptTableEntry[] = inequalities.map((ineq) => {
    const xInt: [number, number] | null =
      Math.abs(ineq.a) >= EPS ? [ineq.c / ineq.a, 0] : null;
    const yInt: [number, number] | null =
      Math.abs(ineq.b) >= EPS ? [0, ineq.c / ineq.b] : null;

    // Test point: use (0, 0) unless boundary passes through (0, 0), in which case use (1, 0) or (0, 1)
    const testPt: [number, number] =
      Math.abs(ineq.c) >= EPS ? [0, 0] : Math.abs(ineq.a) >= EPS ? [1, 0] : [0, 1];
    const lhsVal = ineq.a * testPt[0] + ineq.b * testPt[1];
    const satisfied =
      ineq.op === "<="
        ? lhsVal <= ineq.c + EPS
        : ineq.op === "<"
          ? lhsVal < ineq.c - EPS
          : ineq.op === ">="
            ? lhsVal >= ineq.c - EPS
            : lhsVal > ineq.c + EPS;

    const prettyOp = ineq.op === "<=" ? "≤" : ineq.op === ">=" ? "≥" : ineq.op;
    return {
      inequalityId: ineq.id,
      equationLatex: formatLinearEquation(ineq.a, ineq.b, ineq.c),
      xIntercept: xInt,
      yIntercept: yInt,
      testPoint: {
        pt: testPt,
        satisfied,
        substitutionText: `Uji (${testPt[0]}, ${testPt[1]}): ${formatCoordNumber(lhsVal)} ${prettyOp} ${formatCoordNumber(ineq.c)} (${satisfied ? "Benar" : "Salah"})`,
      },
    };
  });

  // 2. Sutherland–Hodgman clipping on huge world box to find exact feasible polygon
  let poly: [number, number][] = [
    [-WORLD_EXTENT, -WORLD_EXTENT],
    [WORLD_EXTENT, -WORLD_EXTENT],
    [WORLD_EXTENT, WORLD_EXTENT],
    [-WORLD_EXTENT, WORLD_EXTENT],
  ];

  for (const ineq of inequalities) {
    if (ineq.op === "<=" || ineq.op === "<") {
      poly = clipPolygonByHalfPlane(poly, ineq.a, ineq.b, ineq.c);
    } else {
      poly = clipPolygonByHalfPlane(poly, -ineq.a, -ineq.b, -ineq.c);
    }
  }
  poly = dedupePolygon(poly);

  const isEmpty = inequalities.length > 0 && poly.length < 3;
  const isBounded =
    !isEmpty &&
    poly.every(
      ([x, y]) => Math.abs(x) < WORLD_EXTENT * 0.9 && Math.abs(y) < WORLD_EXTENT * 0.9,
    );

  // Extract genuine corner points (excluding artificial world-boundary vertices)
  const rawCorners = isEmpty
    ? []
    : poly.filter(
        ([x, y]) => Math.abs(x) < WORLD_EXTENT * 0.9 && Math.abs(y) < WORLD_EXTENT * 0.9,
      );

  // Also include SPLDV pairwise intersection points when equations >= 2 and inequalities === 0
  const spldvPoints: [number, number][] = [];
  if (inequalities.length === 0 && equations.length >= 2) {
    for (let i = 0; i < equations.length; i++) {
      for (let j = i + 1; j < equations.length; j++) {
        const e1 = equations[i];
        const e2 = equations[j];
        const det = e1.a * e2.b - e2.a * e1.b;
        if (Math.abs(det) > EPS) {
          spldvPoints.push([
            (e1.c * e2.b - e2.c * e1.b) / det,
            (e1.a * e2.c - e2.a * e1.c) / det,
          ]);
        }
      }
    }
  }

  // 3. Auto-compute smart textbook viewport bounds
  const keyPts: [number, number][] = [[0, 0], ...rawCorners, ...spldvPoints];
  for (const t of interceptTables) {
    if (t.xIntercept && Math.abs(t.xIntercept[0]) < 500) keyPts.push(t.xIntercept);
    if (t.yIntercept && Math.abs(t.yIntercept[1]) < 500) keyPts.push(t.yIntercept);
  }
  for (const eq of equations) {
    if (Math.abs(eq.a) >= EPS) keyPts.push([eq.c / eq.a, 0]);
    if (Math.abs(eq.b) >= EPS) keyPts.push([0, eq.c / eq.b]);
  }

  let xMin = 0, xMax = 6, yMin = 0, yMax = 6;
  if (keyPts.length > 0) {
    xMin = Math.min(...keyPts.map((p) => p[0]));
    xMax = Math.max(...keyPts.map((p) => p[0]));
    yMin = Math.min(...keyPts.map((p) => p[1]));
    yMax = Math.max(...keyPts.map((p) => p[1]));
  }
  const spanX = Math.max(4, xMax - xMin);
  const spanY = Math.max(4, yMax - yMin);
  const padX = Math.max(1.5, Math.ceil(spanX * 0.22));
  const padY = Math.max(1.5, Math.ceil(spanY * 0.22));

  const viewportBounds: ViewportBounds = {
    xMin: xMin >= 0 ? -Math.max(1.5, Math.min(3, padX * 0.6)) : Math.floor(xMin - padX),
    xMax: Math.ceil(xMax + padX),
    yMin: yMin >= 0 ? -Math.max(1.5, Math.min(3, padY * 0.6)) : Math.floor(yMin - padY),
    yMax: Math.ceil(yMax + padY),
  };

  // Clip feasible polygon to viewport for clean rendering & DP label placement
  let visibleFeasible = [...poly];
  if (!isEmpty) {
    visibleFeasible = clipPolygonByHalfPlane(visibleFeasible, 1, 0, viewportBounds.xMax);
    visibleFeasible = clipPolygonByHalfPlane(visibleFeasible, -1, 0, -viewportBounds.xMin);
    visibleFeasible = clipPolygonByHalfPlane(visibleFeasible, 0, 1, viewportBounds.yMax);
    visibleFeasible = clipPolygonByHalfPlane(visibleFeasible, 0, -1, -viewportBounds.yMin);
    visibleFeasible = dedupePolygon(visibleFeasible);
  }

  const dpLabelPoint = !isEmpty ? polygonCentroid(visibleFeasible) : null;

  // 4. Label corner points A, B, C... and evaluate objective Z = px + qy
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const allCornersSource = rawCorners.length > 0 ? rawCorners : spldvPoints;
  const cornerPoints: CornerPointResult[] = allCornersSource.map((pt, idx) => ({
    pt,
    label: letters[idx % letters.length],
    objectiveValue: objective ? objective.p * pt[0] + objective.q * pt[1] : undefined,
  }));

  let objectiveResult: AnalyzedLinearSystem["objective"];
  if (objective) {
    let maxCorner: number | undefined;
    let minCorner: number | undefined;
    let bestMax = -Infinity;
    let bestMin = Infinity;
    cornerPoints.forEach((cp, idx) => {
      if (cp.objectiveValue === undefined) return;
      if (cp.objectiveValue > bestMax) {
        bestMax = cp.objectiveValue;
        maxCorner = idx;
      }
      if (cp.objectiveValue < bestMin) {
        bestMin = cp.objectiveValue;
        minCorner = idx;
      }
    });
    objectiveResult = {
      ...objective,
      maxCorner,
      minCorner,
    };
  }

  // 5. Optional student intercept-table consistency check
  let studentCheck: AnalyzedLinearSystem["studentCheck"];
  if (opts?.studentTablePoints && opts.studentTablePoints.length > 0 && inequalities.length > 0) {
    const warnings: string[] = [];
    for (const [sx, sy] of opts.studentTablePoints) {
      const liesOnAny = inequalities.some(
        (ineq) => Math.abs(ineq.a * sx + ineq.b * sy - ineq.c) <= 1e-2,
      );
      if (!liesOnAny) {
        warnings.push(
          `Titik (${formatCoordNumber(sx)}, ${formatCoordNumber(sy)}) pada tabel tidak cocok dengan garis batas mana pun.`,
        );
      }
    }
    studentCheck = {
      warnings,
      isConsistent: warnings.length === 0,
    };
  }

  return {
    inequalities,
    equations,
    interceptTables,
    feasiblePolygon: isEmpty ? [] : visibleFeasible,
    isBounded,
    isEmpty,
    dpLabelPoint,
    cornerPoints,
    objective: objectiveResult,
    viewportBounds,
    studentCheck,
  };
}
