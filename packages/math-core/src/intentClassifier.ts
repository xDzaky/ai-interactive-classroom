/**
 * @ai-classroom/math-core — Intent Classifier & Safe LaTeX/Auto-Format Evaluator
 *
 * Converts MathLive LaTeX or natural keyboard input (`8^2`, `1/2`, `sqrt(16)`,
 * `y = x^2 - 3`, `z = sin(x)*cos(y)`, `kubus s=5`) into safe AST evaluations
 * and automatic 2D/3D visual intents. Zero eval()/Function().
 */
import { parseExpression, evaluateAST } from './index.js';

export type MathVisualIntent =
  | { kind: 'arithmetic'; plain: string; result: number; exactLabel: string; steps: string[] }
  | { kind: 'function_2d'; plain: string; expression: string }
  | { kind: 'surface_3d'; plain: string; formula3d: string }
  | {
      kind: 'solid_3d';
      solidType: 'cube' | 'cuboid' | 'cylinder' | 'cone' | 'sphere' | 'pyramid' | 'prism';
      params: Record<string, number | string>;
      label: string;
    };

/**
 * Converts LaTeX string (e.g. from MathLive) into clean ASCII math parseable by math-core.
 */
export function latexToPlainMath(latex: string): string {
  let s = latex.trim();
  // Remove \left, \right, \mathrm{...}, \text{...}, spacing commands
  s = s.replace(/\\left|\\right|\\,|\\;|\\!|\\quad|\\qquad/g, '');
  s = s.replace(/\\(?:text|mathrm)\{([^}]*)\}/g, '$1');

  // Convert nested \frac{a}{b} iteratively (up to 4 levels)
  for (let pass = 0; pass < 4; pass++) {
    const next = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
    if (next === s) break;
    s = next;
  }

  // Convert \sqrt[n]{x} and \sqrt{x}
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, '(($2)^(1/($1)))');
  for (let pass = 0; pass < 3; pass++) {
    const next = s.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
    if (next === s) break;
    s = next;
  }

  // Operators & constants
  s = s.replace(/\\cdot|\\times/g, '*');
  s = s.replace(/\\div/g, '/');
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/\\(sin|cos|tan|asin|acos|atan|log|exp|abs)\b/g, '$1');

  // Braced exponents x^{2} -> x^(2)
  s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');
  s = s.replace(/[{}]/g, '');

  // Implicit multiplication: 2x -> 2*x, 2(x) -> 2*(x), )x -> )*x, )( -> )*(
  s = s.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
  s = s.replace(/\)(\d|[a-zA-Z(])/g, ')*$1');

  return s.trim();
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Formats a finite number cleanly, detecting simple exact fractions like 5/4 */
export function formatExactNumber(val: number): string {
  if (!Number.isFinite(val)) return String(val);
  if (Math.abs(val - Math.round(val)) < 1e-9) {
    return String(Math.round(val));
  }
  // Check denominators 2..24 for clean rational representation
  for (let denom = 2; denom <= 24; denom++) {
    const numer = val * denom;
    if (Math.abs(numer - Math.round(numer)) < 1e-7) {
      const n = Math.round(numer);
      const g = gcd(n, denom);
      return `${n / g}/${denom / g} (= ${parseFloat(val.toFixed(4))})`;
    }
  }
  return String(parseFloat(val.toFixed(6)));
}

/**
 * Classifies a LaTeX or plain math input into its best interactive visual representation.
 */
export function classifyMathIntent(rawInput: string): MathVisualIntent | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // 1. Natural Indonesian/English 3D geometry commands
  const numMatch = (key: string, fallback: number): number => {
    const m = lower.match(new RegExp(`${key}\\s*=\\s*([0-9]+(?:\\.[0-9]+)?)`));
    return m ? Math.max(0.5, parseFloat(m[1])) : fallback;
  };
  if (/\b(kubus|cube)\b/.test(lower)) {
    const s = numMatch('s', 4);
    return { kind: 'solid_3d', solidType: 'cube', params: { type: 'cube', s }, label: `Kubus (s=${s})` };
  }
  if (/\b(balok|cuboid)\b/.test(lower)) {
    const l = numMatch('p', numMatch('l', 5));
    const w = numMatch('l', 3);
    const h = numMatch('t', numMatch('h', 3));
    return { kind: 'solid_3d', solidType: 'cuboid', params: { type: 'cuboid', l, w, h }, label: `Balok (${l}×${w}×${h})` };
  }
  if (/\b(tabung|silinder|cylinder)\b/.test(lower)) {
    const r = numMatch('r', 2);
    const h = numMatch('t', numMatch('h', 5));
    return { kind: 'solid_3d', solidType: 'cylinder', params: { type: 'cylinder', r, h }, label: `Tabung (r=${r}, t=${h})` };
  }
  if (/\b(kerucut|cone)\b/.test(lower)) {
    const r = numMatch('r', 2.5);
    const h = numMatch('t', numMatch('h', 5));
    return { kind: 'solid_3d', solidType: 'cone', params: { type: 'cone', r, h }, label: `Kerucut (r=${r}, t=${h})` };
  }
  if (/\b(bola|sphere)\b/.test(lower)) {
    const r = numMatch('r', 3);
    return { kind: 'solid_3d', solidType: 'sphere', params: { type: 'sphere', r }, label: `Bola (r=${r})` };
  }

  const plain = latexToPlainMath(trimmed);

  // 2. 3D Surface: z = f(x, y) or expression containing both x and y
  const zMatch = plain.match(/^z\s*=\s*(.+)$/i);
  if (zMatch) {
    return { kind: 'surface_3d', plain, formula3d: zMatch[1].trim() };
  }

  // 3. 2D Function: y = f(x) or f(x) = ...
  const yMatch = plain.match(/^(?:y|f\(x\))\s*=\s*(.+)$/i);
  if (yMatch) {
    return { kind: 'function_2d', plain, expression: yMatch[1].trim() };
  }

  // Check variables inside expression
  const hasX = /\bx\b/.test(plain);
  const hasY = /\by\b/.test(plain);
  if (hasX && hasY) {
    return { kind: 'surface_3d', plain, formula3d: plain };
  }
  if (hasX) {
    return { kind: 'function_2d', plain, expression: plain };
  }

  // 4. Arithmetic / Numeric evaluation (zero eval!)
  try {
    const ast = parseExpression(plain);
    const val = evaluateAST(ast, {});
    const exactLabel = formatExactNumber(val);
    const steps = [
      `Ekspresi: ${plain}`,
      `Evaluasi AST aman: ${exactLabel}`,
    ];
    return { kind: 'arithmetic', plain, result: val, exactLabel, steps };
  } catch {
    return null;
  }
}
