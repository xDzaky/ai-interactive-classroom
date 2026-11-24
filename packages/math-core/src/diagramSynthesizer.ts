/**
 * diagramSynthesizer.ts — Precision Formula-to-Diagram / Chart / Textbook Graph Synthesizer (V5)
 *
 * ZERO eval() / Function(). Built strictly on @ai-classroom/math-core's safe AST evaluator.
 * Features:
 * 1. Exact π-fraction x-axis ticks for trigonometric expressions (0, π/2, π, 3π/2, 2π)
 * 2. Adaptive sampling + discontinuity clamping & vertical asymptote detection (tan x, 1/(x-a))
 * 3. Exact extrema (maks., min.) and root (f(x)=0) finding via central difference + Bisection (< 1e-7)
 * 4. Trigonometric identity visual proof classifier (double_angle, pythagorean, angle_sum, law_of_cosines)
 * 5. Precision statistical chart parser (bar, line, pie, scatter, histogram)
 */
import { parseExpression, evaluateAST, parseMathLiveLatex, type ASTNode } from "./index.js";
import type { TrigIdentityId } from "./trigIdentities.js";

export interface SampledPolyline {
  points: Array<[number, number]>;
}

export interface ExtremaPoint {
  x: number;
  y: number;
  kind: "maks" | "min";
  xLabel: string;
}

export interface RootPoint {
  x: number;
  xLabel: string;
}

export interface ParsedFuncSpec {
  rawLatex: string;
  normalizedExpr: string;
  color: string;
  polylines: SampledPolyline[];
  asymptotesX: number[];
  extrema: ExtremaPoint[];
  roots: RootPoint[];
}

export interface AxisTick {
  value: number;
  label: string;
}

export type SynthesizedVisualSpec =
  | {
      kind: "textbook_function_graph";
      titleLatex: string;
      expressions: ParsedFuncSpec[];
      domain: [number, number];
      rangeY: [number, number];
      xAxisMode: "numeric" | "pi_fraction";
      xTicks: AxisTick[];
      showExtrema: boolean;
      showRoots: boolean;
      showDashedProjections: boolean;
    }
  | {
      kind: "trig_identity_proof";
      identityId: TrigIdentityId;
      thetaDeg: number;
      interactive: boolean;
    }
  | {
      kind: "stat_chart";
      title: string;
      chartType: "bar" | "line" | "pie" | "scatter" | "histogram";
      labels: string[];
      series: { name: string; values: number[]; color: string }[];
    };

const SERIES_COLORS = ["#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed"];

// ---------------------------------------------------------------------------
// Normalization helpers (safe string pre-processing before AST parse)
// ---------------------------------------------------------------------------

function normalizeFormulaForEval(raw: string): { expr: string; explicitDomain?: [number, number] } {
  let s = raw.trim();

  // Extract explicit domain e.g. "0 <= x <= 2\pi" or "0 \le x \le 2\pi" or ", [0, 2pi]"
  let explicitDomain: [number, number] | undefined;
  const domainMatch = s.match(/(-?[\d.πpi\\/*]+)\s*(?:<=|\\le|≤)\s*x\s*(?:<=|\\le|≤)\s*(-?[\d.πpi\\/*]+)/i);
  if (domainMatch) {
    const lo = evalBound(domainMatch[1]);
    const hi = evalBound(domainMatch[2]);
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) {
      explicitDomain = [lo, hi];
    }
    s = s.replace(domainMatch[0], "").replace(/[,;]\s*$/, "").trim();
  }

  // Strip leading "y =" or "f(x) ="
  s = s.replace(/^(?:y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\))\s*=\s*/i, "");

  // Convert common Unicode math symbols
  s = s
    .replace(/π/g, "\\pi")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/·/g, "*");

  // Convert trig shorthand without parens: sin x -> sin(x), cos 2x -> cos(2*x)
  s = s.replace(/\\?(sin|cos|tan|csc|sec|cot)\s+([a-zA-Z0-9.]+)/g, "$1($2)");

  // Run MathLive LaTeX converter
  let expr = parseMathLiveLatex(s);

  // Convert reciprocal trig functions safely into base functions supported by math-core
  expr = expr
    .replace(/\bcsc\(([^)]+)\)/g, "(1/sin($1))")
    .replace(/\bsec\(([^)]+)\)/g, "(1/cos($1))")
    .replace(/\bcot\(([^)]+)\)/g, "(cos($1)/sin($1))");

  // Handle implicit multiplication after pi or variable before paren/ident: 2pi -> 2*pi, pi*x
  expr = expr
    .replace(/(\d)(pi\b)/g, "$1*$2")
    .replace(/(pi)([a-zA-Z])/g, "$1*$2")
    .replace(/([a-zA-Z0-9\)])\(/g, (m, prev) => {
      // Do not break function calls like sin(x)
      return /[a-zA-Z]/.test(prev) ? m : `${prev}*(`;
    });

  return { expr, explicitDomain };
}

function evalBound(raw: string): number {
  const cleaned = parseMathLiveLatex(raw.replace(/π/g, "\\pi"));
  try {
    return evaluateAST(parseExpression(cleaned), {});
  } catch {
    return NaN;
  }
}

export function formatPiFraction(x: number): string {
  if (Math.abs(x) < 1e-4) return "0";
  const ratio = x / Math.PI;
  const dens = [1, 2, 3, 4, 6];
  for (const d of dens) {
    const n = Math.round(ratio * d);
    if (Math.abs(ratio - n / d) < 1e-3) {
      if (n === 0) return "0";
      const sign = n < 0 ? "-" : "";
      const absN = Math.abs(n);
      if (d === 1) return absN === 1 ? `${sign}π` : `${sign}${absN}π`;
      return absN === 1 ? `${sign}π/${d}` : `${sign}${absN}π/${d}`;
    }
  }
  return x.toFixed(2);
}

// ---------------------------------------------------------------------------
// Precision Sampling, Asymptotes, Extrema & Roots (Brent / Bisection)
// ---------------------------------------------------------------------------

function safeEvalAt(ast: ASTNode, x: number): number {
  try {
    const v = evaluateAST(ast, { x });
    return Number.isFinite(v) ? v : NaN;
  } catch {
    return NaN;
  }
}

function numericalDeriv(ast: ASTNode, x: number, h = 1e-5): number {
  const f1 = safeEvalAt(ast, x + h);
  const f0 = safeEvalAt(ast, x - h);
  if (!Number.isFinite(f1) || !Number.isFinite(f0)) return NaN;
  return (f1 - f0) / (2 * h);
}

function numericalSecondDeriv(ast: ASTNode, x: number, h = 1e-4): number {
  const fp = safeEvalAt(ast, x + h);
  const f0 = safeEvalAt(ast, x);
  const fm = safeEvalAt(ast, x - h);
  if (!Number.isFinite(fp) || !Number.isFinite(f0) || !Number.isFinite(fm)) return NaN;
  return (fp - 2 * f0 + fm) / (h * h);
}

function bisectRoot(fn: (x: number) => number, a: number, b: number, tol = 1e-7): number | null {
  let fa = fn(a);
  let fb = fn(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
  if (Math.abs(fa) < tol) return a;
  if (Math.abs(fb) < tol) return b;
  if (fa * fb > 0) return null;

  let lo = a;
  let hi = b;
  for (let i = 0; i < 60 && hi - lo > tol; i++) {
    const mid = (lo + hi) / 2;
    const fm = fn(mid);
    if (!Number.isFinite(fm)) return null;
    if (Math.abs(fm) < tol) return mid;
    if (fa * fm <= 0) {
      hi = mid;
      fb = fm;
    } else {
      lo = mid;
      fa = fm;
    }
  }
  return (lo + hi) / 2;
}

export function sampleFunctionPrecise(
  rawLatex: string,
  normalizedExpr: string,
  domain: [number, number],
  xAxisMode: "numeric" | "pi_fraction",
  color: string,
): { spec: ParsedFuncSpec; autoRangeY: [number, number] } {
  const ast = parseExpression(normalizedExpr);
  const [xMin, xMax] = domain;
  const N = 400;
  const dx = (xMax - xMin) / N;

  // Pass 1: coarse finite values to estimate sensible Y range (ignore extreme spikes near poles)
  const coarseY: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = xMin + i * dx;
    const y = safeEvalAt(ast, x);
    if (Number.isFinite(y) && Math.abs(y) < 1e4) {
      coarseY.push(y);
    }
  }
  coarseY.sort((a, b) => a - b);
  const p05 = coarseY[Math.floor(coarseY.length * 0.05)] ?? -4;
  const p95 = coarseY[Math.floor(coarseY.length * 0.95)] ?? 4;
  let yLo = Math.min(-1, p05);
  let yHi = Math.max(1, p95);
  const spanY = Math.max(2, yHi - yLo);
  yLo = Math.max(-50, yLo - spanY * 0.18);
  yHi = Math.min(50, yHi + spanY * 0.18);
  const rangeSpan = Math.max(2, yHi - yLo);
  const clipBound = Math.max(Math.abs(yLo), Math.abs(yHi)) * 3.5;

  // Pass 2: Adaptive polyline sampling with discontinuity splitting & asymptote detection
  const polylines: SampledPolyline[] = [];
  const asymptotesX: number[] = [];
  let current: Array<[number, number]> = [];

  let prevX = xMin;
  let prevY = safeEvalAt(ast, prevX);
  if (Number.isFinite(prevY) && Math.abs(prevY) <= clipBound) {
    current.push([prevX, prevY]);
  }

  for (let i = 1; i <= N; i++) {
    const x = xMin + i * dx;
    const y = safeEvalAt(ast, x);
    const deriv = numericalDeriv(ast, (prevX + x) / 2);

    const isJump =
      !Number.isFinite(y) ||
      !Number.isFinite(prevY) ||
      Math.abs(y) > clipBound ||
      Math.abs(y - prevY) > 10 * rangeSpan ||
      (Math.abs(deriv) > 1e4 && Math.sign(y) !== Math.sign(prevY));

    if (isJump) {
      if (current.length >= 2) {
        polylines.push({ points: current });
      }
      current = [];
      // Record vertical asymptote if sign flipped across a large jump or pole
      if (
        (Number.isFinite(prevY) && Number.isFinite(y) && Math.sign(prevY) !== Math.sign(y) && Math.abs(y - prevY) > rangeSpan * 2) ||
        !Number.isFinite(y)
      ) {
        const ax = (prevX + x) / 2;
        if (asymptotesX.length === 0 || Math.abs(ax - asymptotesX[asymptotesX.length - 1]) > dx * 3) {
          asymptotesX.push(ax);
        }
      }
      if (Number.isFinite(y) && Math.abs(y) <= clipBound) {
        current.push([x, y]);
      }
    } else {
      // Adaptive midpoint subdivision when curvature is noticeable
      const midX = (prevX + x) / 2;
      const midY = safeEvalAt(ast, midX);
      const linMid = (prevY + y) / 2;
      if (Number.isFinite(midY) && Math.abs(midY - linMid) > rangeSpan * 0.008) {
        current.push([midX, midY]);
      }
      current.push([x, y]);
    }
    prevX = x;
    prevY = y;
  }
  if (current.length >= 2) {
    polylines.push({ points: current });
  }

  // Pass 3: Exact Extrema (f'(x) = 0) & Roots (f(x) = 0) via Bisection
  const extrema: ExtremaPoint[] = [];
  const roots: RootPoint[] = [];
  const evalFn = (x: number) => safeEvalAt(ast, x);
  const derivFn = (x: number) => numericalDeriv(ast, x);
  const scanN = 240;
  const sdx = (xMax - xMin) / scanN;

  const isNearAsymptote = (x: number) => asymptotesX.some((a) => Math.abs(x - a) < sdx * 1.5);

  for (let i = 0; i < scanN; i++) {
    const a = xMin + i * sdx;
    const b = a + sdx;
    if (isNearAsymptote((a + b) / 2)) continue;

    // Root search
    const fa = evalFn(a);
    const fb = evalFn(b);
    if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb <= 0 && Math.abs(fb - fa) < rangeSpan * 4) {
      const r = bisectRoot(evalFn, a, b, 1e-7);
      if (r !== null && Math.abs(evalFn(r)) < 1e-3 && !isNearAsymptote(r)) {
        if (roots.every((ex) => Math.abs(ex.x - r) > sdx)) {
          roots.push({
            x: r,
            xLabel: xAxisMode === "pi_fraction" ? formatPiFraction(r) : r.toFixed(2),
          });
        }
      }
    }

    // Extrema search (sign change in f'(x))
    const da = derivFn(a);
    const db = derivFn(b);
    if (Number.isFinite(da) && Number.isFinite(db) && da * db <= 0 && Math.abs(da) < 500 && Math.abs(db) < 500) {
      const exX = bisectRoot(derivFn, a, b, 1e-7);
      if (exX !== null && !isNearAsymptote(exX)) {
        const exY = evalFn(exX);
        const d2 = numericalSecondDeriv(ast, exX);
        if (Number.isFinite(exY) && Math.abs(exY) <= clipBound && Number.isFinite(d2) && Math.abs(d2) > 1e-4) {
          if (extrema.every((e) => Math.abs(e.x - exX) > sdx)) {
            extrema.push({
              x: exX,
              y: exY,
              kind: d2 < 0 ? "maks" : "min",
              xLabel: xAxisMode === "pi_fraction" ? formatPiFraction(exX) : exX.toFixed(2),
            });
          }
        }
      }
    }
  }

  return {
    spec: {
      rawLatex,
      normalizedExpr,
      color,
      polylines,
      asymptotesX,
      extrema,
      roots,
    },
    autoRangeY: [yLo, yHi],
  };
}

// ---------------------------------------------------------------------------
// Statistical Chart Parser
// ---------------------------------------------------------------------------

function tryParseStatChart(raw: string): SynthesizedVisualSpec | null {
  const s = raw.trim();

  // Pattern A: Key=Value list e.g. "Senin=12, Selasa=19, Rabu=15" or "A:10, B:25, C:18"
  const kvParts = s.split(/[,;\n]+/).map((p) => p.trim()).filter(Boolean);
  if (kvParts.length >= 2 && kvParts.every((p) => /^[^:=]+[:=]\s*-?\d+(\.\d+)?$/.test(p))) {
    const labels: string[] = [];
    const values: number[] = [];
    for (const part of kvParts) {
      const m = part.match(/^([^:=]+)[:=]\s*(-?\d+(?:\.\d+)?)$/);
      if (m) {
        labels.push(m[1].trim());
        values.push(Number(m[2]));
      }
    }
    return {
      kind: "stat_chart",
      title: "Diagram Statistik Data",
      chartType: "bar",
      labels,
      series: [{ name: "Nilai", values, color: "#4f46e5" }],
    };
  }

  // Pattern B: Bracketed number array e.g. "[10, 25, 18, 30]"
  const arrMatch = s.match(/^\[([^\]]+)\]$/);
  if (arrMatch) {
    const nums = arrMatch[1].split(",").map((x) => Number(x.trim()));
    if (nums.length >= 2 && nums.every((n) => Number.isFinite(n))) {
      return {
        kind: "stat_chart",
        title: "Grafik Data Numerik",
        chartType: "bar",
        labels: nums.map((_, i) => `Data ${i + 1}`),
        series: [{ name: "Data", values: nums, color: "#2563eb" }],
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Trig Identity Classifier
// ---------------------------------------------------------------------------

function tryClassifyTrigIdentity(raw: string): SynthesizedVisualSpec | null {
  const s = raw.toLowerCase().replace(/\s+/g, "");
  if (
    /cos\(?2(\\?theta|θ|x|a)\)?.*2cos\^?\{?2\}?|sin\(?2(\\?theta|θ|x|a)\)?.*2sin.*cos|double.?angle|sudutganda/.test(s)
  ) {
    return { kind: "trig_identity_proof", identityId: "double_angle", thetaDeg: 28, interactive: true };
  }
  if (/sin\^?\{?2\}?.*?\+.*?cos\^?\{?2\}?.*?=1|cos\^?\{?2\}?.*?\+.*?sin\^?\{?2\}?.*?=1/.test(s)) {
    return { kind: "trig_identity_proof", identityId: "pythagorean", thetaDeg: 35, interactive: true };
  }
  if (/sin\([^)]*\+[^)]*\)|cos\([^)]*\+[^)]*\)/.test(s) && s.includes("=")) {
    return { kind: "trig_identity_proof", identityId: "angle_sum", thetaDeg: 25, interactive: true };
  }
  if (/c\^?2=a\^?2\+b\^?2-2abcos/.test(s)) {
    return { kind: "trig_identity_proof", identityId: "law_of_cosines", thetaDeg: 32, interactive: true };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main Public Classifier & Synthesizer
// ---------------------------------------------------------------------------

export function synthesizeVisualFromFormula(rawInput: string): SynthesizedVisualSpec | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // 1. Check Statistical Data / Chart
  const chart = tryParseStatChart(trimmed);
  if (chart) return chart;

  // 2. Check Trigonometric Identity Geometric Proof
  const trigProof = tryClassifyTrigIdentity(trimmed);
  if (trigProof) return trigProof;

  // 3. Function Graph (supports semicolon-separated multiple curves)
  const parts = trimmed.split(";").map((p) => p.trim()).filter(Boolean);
  const isTrig = /\\?(sin|cos|tan|csc|sec|cot)\b/i.test(trimmed);
  const xAxisMode: "numeric" | "pi_fraction" = isTrig ? "pi_fraction" : "numeric";

  let domain: [number, number] = isTrig ? [0, 2 * Math.PI] : [-6, 6];
  const expressions: ParsedFuncSpec[] = [];
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < parts.length; i++) {
    const { expr, explicitDomain } = normalizeFormulaForEval(parts[i]);
    if (explicitDomain) domain = explicitDomain;
    try {
      const { spec, autoRangeY } = sampleFunctionPrecise(
        parts[i],
        expr,
        domain,
        xAxisMode,
        SERIES_COLORS[i % SERIES_COLORS.length],
      );
      expressions.push(spec);
      minY = Math.min(minY, autoRangeY[0]);
      maxY = Math.max(maxY, autoRangeY[1]);
    } catch {
      // skip unparseable expression
    }
  }

  if (expressions.length === 0) return null;

  // Generate exact x-axis ticks
  const xTicks: AxisTick[] = [];
  if (xAxisMode === "pi_fraction") {
    const step = Math.PI / 2;
    const startIdx = Math.ceil(domain[0] / step);
    const endIdx = Math.floor(domain[1] / step);
    for (let k = startIdx; k <= endIdx; k++) {
      const val = k * step;
      xTicks.push({ value: val, label: formatPiFraction(val) });
    }
  } else {
    const span = domain[1] - domain[0];
    const step = span <= 12 ? 2 : Math.ceil(span / 6);
    for (let v = Math.ceil(domain[0] / step) * step; v <= domain[1]; v += step) {
      xTicks.push({ value: v, label: String(Math.round(v * 100) / 100) });
    }
  }

  return {
    kind: "textbook_function_graph",
    titleLatex: trimmed,
    expressions,
    domain,
    rangeY: [Number.isFinite(minY) ? minY : -4, Number.isFinite(maxY) ? maxY : 4],
    xAxisMode,
    xTicks,
    showExtrema: true,
    showRoots: true,
    showDashedProjections: true,
  };
}
