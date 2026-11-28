/**
 * integerOpsEngine.ts — V10 Deterministic Integer Operations Engine
 * Safe parser & step-by-step generator (NEVER uses eval / Function).
 *
 * Supports:
 * - Single & chained add/sub: "-1 + 3", "-1 - 3", "3 - (-2)", "2 - 5 + 4", "4 + (-6) - (-3)"
 * - Repeated-jump integer multiplication: "3 * (-2)", "3 × (-2)", "(-2) * 3"
 * - Sign simplification notes ("- (-2) → + 2", "+ (-6) → - 6")
 * - Auto-fit number line tick range with ±2 padding
 * - Zero-pair integer chips model (+ / − cancellation)
 */

export interface IntegerOpStep {
  from: number;
  delta: number;
  to: number;
  label: string;
  rawOperator?: string;
}

export interface IntegerChipsModel {
  positiveCount: number;
  negativeCount: number;
  zeroPairs: number;
  remainingSign: "+" | "-" | "0";
  remainingCount: number;
}

export interface ParsedIntegerOps {
  valid: boolean;
  rawExpression: string;
  simplifiedExpression: string;
  signSimplificationNotes: string[];
  start: number;
  steps: IntegerOpStep[];
  result: number;
  minTick: number;
  maxTick: number;
  totalUnitHops: number;
  isMultiplication: boolean;
  chips: IntegerChipsModel;
  error?: string;
}

function normalizeIntegerRaw(raw: string): string {
  // Strip optional trailing "= 2" or "= ?" so expressions from student work parse cleanly
  const beforeEq = raw.split("=")[0] ?? raw;
  return beforeEq
    .replace(/\\times|\\cdot|×|·/g, "*")
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildChipsModel(start: number, steps: IntegerOpStep[], result: number): IntegerChipsModel {
  // Count total positive and negative unit chips contributed by start + each step
  let pos = start > 0 ? Math.round(start) : 0;
  let neg = start < 0 ? Math.round(Math.abs(start)) : 0;
  for (const st of steps) {
    if (st.delta > 0) pos += Math.round(st.delta);
    else if (st.delta < 0) neg += Math.round(Math.abs(st.delta));
  }
  const zeroPairs = Math.min(pos, neg);
  const remainingCount = Math.abs(Math.round(result));
  const remainingSign: "+" | "-" | "0" = result > 0 ? "+" : result < 0 ? "-" : "0";
  return {
    positiveCount: pos,
    negativeCount: neg,
    zeroPairs,
    remainingSign,
    remainingCount,
  };
}

function computeTickRange(start: number, steps: IntegerOpStep[]): { minTick: number; maxTick: number } {
  let lo = Math.min(0, start);
  let hi = Math.max(0, start);
  for (const st of steps) {
    lo = Math.min(lo, st.from, st.to);
    hi = Math.max(hi, st.from, st.to);
  }
  const minTick = Math.min(-5, Math.floor(lo) - 2);
  const maxTick = Math.max(5, Math.ceil(hi) + 2);
  return { minTick, maxTick };
}

export function parseIntegerExpression(raw: string): ParsedIntegerOps {
  const cleaned = normalizeIntegerRaw(raw);
  if (!cleaned) {
    return {
      valid: false,
      rawExpression: raw,
      simplifiedExpression: "",
      signSimplificationNotes: [],
      start: 0,
      steps: [],
      result: 0,
      minTick: -6,
      maxTick: 6,
      totalUnitHops: 0,
      isMultiplication: false,
      chips: { positiveCount: 0, negativeCount: 0, zeroPairs: 0, remainingSign: "0", remainingCount: 0 },
      error: "Ekspresi kosong",
    };
  }

  // 1. Check for simple integer multiplication: a * b (e.g. "3 * (-2)" or "(-3) * 2")
  const mulMatch = cleaned.match(/^\(?\s*([+-]?\d+)\s*\)?\s*\*\s*\(?\s*([+-]?\d+)\s*\)?$/);
  if (mulMatch) {
    const a = parseInt(mulMatch[1], 10);
    const b = parseInt(mulMatch[2], 10);
    const repeatCount = Math.min(Math.abs(a), 12);
    const stepDelta = a >= 0 ? b : -b;
    const steps: IntegerOpStep[] = [];
    let cur = 0;
    for (let i = 0; i < repeatCount; i++) {
      const next = cur + stepDelta;
      steps.push({
        from: cur,
        delta: stepDelta,
        to: next,
        label: stepDelta >= 0 ? `+${stepDelta}` : `${stepDelta}`,
        rawOperator: `${a} × (${b})`,
      });
      cur = next;
    }
    const result = a * b;
    const { minTick, maxTick } = computeTickRange(0, steps);
    const signNote =
      a < 0 && b < 0
        ? `(${a}) × (${b}) = +${Math.abs(result)} (negatif × negatif = positif)`
        : a < 0 || b < 0
          ? `${a} × (${b}) = ${result} (${repeatCount} lompatan sebesar ${stepDelta})`
          : `${a} × ${b} = ${result}`;
    return {
      valid: true,
      rawExpression: raw,
      simplifiedExpression: `${a} × ${b < 0 ? `(${b})` : b}`,
      signSimplificationNotes: [signNote],
      start: 0,
      steps,
      result,
      minTick,
      maxTick,
      totalUnitHops: steps.reduce((acc, s) => acc + Math.abs(s.delta), 0),
      isMultiplication: true,
      chips: buildChipsModel(0, steps, result),
    };
  }

  // 2. Parse single or chained addition/subtraction:
  //    First term: optional leading "(" sign number ")"
  //    Subsequent terms: op ("+" | "-") followed by optional "(" sign number ")"
  let idx = 0;
  const skipWs = () => {
    while (idx < cleaned.length && cleaned[idx] === " ") idx++;
  };

  const readSignedInt = (): { val: number; rawToken: string; hadInnerSign: boolean } | null => {
    skipWs();
    const startIdx = idx;
    let wrapped = false;
    if (cleaned[idx] === "(") {
      wrapped = true;
      idx++;
      skipWs();
    }
    let sign = 1;
    let hadInnerSign = false;
    if (cleaned[idx] === "+") {
      hadInnerSign = true;
      idx++;
      skipWs();
    } else if (cleaned[idx] === "-") {
      sign = -1;
      hadInnerSign = true;
      idx++;
      skipWs();
    }
    const numStart = idx;
    while (idx < cleaned.length && /[0-9]/.test(cleaned[idx])) idx++;
    if (idx === numStart) return null;
    const mag = parseInt(cleaned.slice(numStart, idx), 10);
    if (wrapped) {
      skipWs();
      if (cleaned[idx] !== ")") return null;
      idx++;
    }
    return { val: sign * mag, rawToken: cleaned.slice(startIdx, idx), hadInnerSign };
  };

  const first = readSignedInt();
  if (!first) {
    return {
      valid: false,
      rawExpression: raw,
      simplifiedExpression: cleaned,
      signSimplificationNotes: [],
      start: 0,
      steps: [],
      result: 0,
      minTick: -6,
      maxTick: 6,
      totalUnitHops: 0,
      isMultiplication: false,
      chips: { positiveCount: 0, negativeCount: 0, zeroPairs: 0, remainingSign: "0", remainingCount: 0 },
      error: "Format operasi tidak dikenali (contoh: -1 + 3, 3 - (-2), 3 * (-2))",
    };
  }

  let cur = first.val;
  const steps: IntegerOpStep[] = [];
  const signNotes: string[] = [];
  const simplifiedParts: string[] = [String(first.val)];

  while (idx < cleaned.length) {
    skipWs();
    if (idx >= cleaned.length) break;
    const op = cleaned[idx];
    if (op !== "+" && op !== "-") {
      return {
        valid: false,
        rawExpression: raw,
        simplifiedExpression: cleaned,
        signSimplificationNotes: [],
        start: first.val,
        steps: [],
        result: first.val,
        minTick: -6,
        maxTick: 6,
        totalUnitHops: 0,
        isMultiplication: false,
        chips: { positiveCount: 0, negativeCount: 0, zeroPairs: 0, remainingSign: "0", remainingCount: 0 },
        error: `Operator '${op}' tidak didukung`,
      };
    }
    idx++;
    const operand = readSignedInt();
    if (!operand) {
      return {
        valid: false,
        rawExpression: raw,
        simplifiedExpression: cleaned,
        signSimplificationNotes: [],
        start: first.val,
        steps: [],
        result: first.val,
        minTick: -6,
        maxTick: 6,
        totalUnitHops: 0,
        isMultiplication: false,
        chips: { positiveCount: 0, negativeCount: 0, zeroPairs: 0, remainingSign: "0", remainingCount: 0 },
        error: "Angka setelah operator tidak lengkap",
      };
    }

    const delta = op === "+" ? operand.val : -operand.val;
    const rawOpStr = `${op} ${operand.rawToken}`;
    if (op === "-" && operand.val < 0) {
      signNotes.push(`- (${operand.val}) → + ${Math.abs(operand.val)}`);
    } else if (op === "+" && operand.val < 0) {
      signNotes.push(`+ (${operand.val}) → - ${Math.abs(operand.val)}`);
    } else if (op === "-" && operand.hadInnerSign && operand.val > 0) {
      signNotes.push(`- (+${operand.val}) → - ${operand.val}`);
    }

    const next = cur + delta;
    steps.push({
      from: cur,
      delta,
      to: next,
      label: delta >= 0 ? `+${delta}` : `${delta}`,
      rawOperator: rawOpStr,
    });
    simplifiedParts.push(delta >= 0 ? `+ ${delta}` : `- ${Math.abs(delta)}`);
    cur = next;
  }

  const { minTick, maxTick } = computeTickRange(first.val, steps);
  return {
    valid: true,
    rawExpression: raw,
    simplifiedExpression: simplifiedParts.join(" "),
    signSimplificationNotes: signNotes,
    start: first.val,
    steps,
    result: cur,
    minTick,
    maxTick,
    totalUnitHops: steps.reduce((acc, s) => acc + Math.abs(s.delta), 0),
    isMultiplication: false,
    chips: buildChipsModel(first.val, steps, cur),
  };
}
