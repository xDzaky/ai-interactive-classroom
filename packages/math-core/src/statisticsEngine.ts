/**
 * statisticsEngine.ts — Deterministic Statistics Engine for V9 Smart Custom Table
 *
 * Computes exact Mean, Median, Mode (including multimodal), Quartiles (Q1..Q3),
 * Sample & Population Variance / StdDev, Textbook Callouts, and Reactive Chart Series
 * for both Grouped Data (Data Kelompok) and Ungrouped Data (Data Tunggal / Berbobot).
 */

export interface ParsedInterval {
  lower: number;
  upper: number;
  tb: number;
  ta: number;
  p: number;
  xi: number;
  decimals: number;
}

export interface GroupedClassRow {
  index: number;
  label: string;
  interval: ParsedInterval;
  fi: number;
  xi: number;
  fxi: number;
  fk: number;
}

export interface GroupedStatsResult {
  valid: boolean;
  rows: GroupedClassRow[];
  n: number;
  sumFx: number;
  mean: number;
  median: number;
  medianClassIndex: number;
  medianDetail: {
    tb: number;
    fkBefore: number;
    fm: number;
    p: number;
    halfN: number;
  };
  q1: number;
  q2: number;
  q3: number;
  mode: number;
  modalClassIndices: number[];
  modes: number[];
  modeDetail: {
    tb: number;
    d1: number;
    d2: number;
    p: number;
  };
  varianceSample: number;
  stdDevSample: number;
  variancePop: number;
  stdDevPop: number;
  stepsLatex: {
    mean: string[];
    median: string[];
    mode: string[];
  };
  chartSeries: {
    histogram: Array<{ label: string; tb: number; ta: number; value: number }>;
    polygon: Array<{ label: string; x: number; value: number }>;
    ogivePositive: Array<{ label: string; x: number; value: number }>;
    ogiveNegative: Array<{ label: string; x: number; value: number }>;
  };
}

export interface UngroupedEntry {
  x: number;
  f: number;
}

export interface UngroupedStatsResult {
  valid: boolean;
  entries: Array<{ x: number; f: number; fx: number; fk: number }>;
  n: number;
  sumFx: number;
  mean: number;
  median: number;
  medianPositionLabel: string;
  modes: number[];
  modeLabel: string;
  q1: number;
  q3: number;
  varianceSample: number;
  stdDevSample: number;
  stepsLatex: {
    mean: string[];
    median: string[];
    mode: string[];
  };
}

function roundNum(v: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export function formatIdNumber(v: number, maxDecimals = 2): string {
  if (!Number.isFinite(v)) return "-";
  const rounded = roundNum(v, maxDecimals);
  return rounded.toString().replace(".", ",");
}

/**
 * Parses class interval strings like "31 - 40", "31-40", "31–40", "31 s.d. 40", "1.5 - 2.4".
 */
export function parseClassInterval(raw: string): ParsedInterval | null {
  const cleaned = raw.trim().replace(/,/g, ".");
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|–|—|s\.?d\.?|sampai|to)\s*(-?\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  const lower = Number(match[1]);
  const upper = Number(match[2]);
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || upper < lower) return null;

  const dec1 = (match[1].split(".")[1] ?? "").length;
  const dec2 = (match[2].split(".")[1] ?? "").length;
  const decimals = Math.max(dec1, dec2);
  const halfStep = 0.5 / 10 ** decimals;

  const tb = roundNum(lower - halfStep, decimals + 2);
  const ta = roundNum(upper + halfStep, decimals + 2);
  const p = roundNum(ta - tb, decimals + 2);
  const xi = roundNum((lower + upper) / 2, decimals + 2);
  return { lower, upper, tb, ta, p, xi, decimals };
}

function computeGroupedQuantile(rows: GroupedClassRow[], n: number, fraction: number): { value: number; classIdx: number; fkBefore: number } {
  const target = n * fraction;
  let classIdx = rows.findIndex((r) => r.fk >= target);
  if (classIdx < 0) classIdx = rows.length - 1;
  const row = rows[classIdx];
  const fkBefore = classIdx > 0 ? rows[classIdx - 1].fk : 0;
  const val = row.fi > 0 ? row.interval.tb + ((target - fkBefore) / row.fi) * row.interval.p : row.xi;
  return { value: roundNum(val, 6), classIdx, fkBefore };
}

/**
 * Exact Grouped Data Statistics (Data Kelompok).
 */
export function computeGroupedStats(
  inputRows: Array<{ intervalLabel: string; frequency: number }>,
): GroupedStatsResult {
  const rows: GroupedClassRow[] = [];
  let fk = 0;
  let sumFx = 0;

  for (let i = 0; i < inputRows.length; i++) {
    const parsed = parseClassInterval(inputRows[i].intervalLabel);
    const fi = Number(inputRows[i].frequency);
    if (!parsed || !Number.isFinite(fi) || fi < 0) continue;
    fk += fi;
    const fxi = roundNum(fi * parsed.xi, 6);
    sumFx += fxi;
    rows.push({
      index: rows.length,
      label: inputRows[i].intervalLabel.trim(),
      interval: parsed,
      fi,
      xi: parsed.xi,
      fxi,
      fk,
    });
  }

  const n = fk;
  if (rows.length === 0 || n <= 0) {
    return {
      valid: false,
      rows: [],
      n: 0,
      sumFx: 0,
      mean: 0,
      median: 0,
      medianClassIndex: -1,
      medianDetail: { tb: 0, fkBefore: 0, fm: 0, p: 0, halfN: 0 },
      q1: 0,
      q2: 0,
      q3: 0,
      mode: 0,
      modalClassIndices: [],
      modes: [],
      modeDetail: { tb: 0, d1: 0, d2: 0, p: 0 },
      varianceSample: 0,
      stdDevSample: 0,
      variancePop: 0,
      stdDevPop: 0,
      stepsLatex: { mean: [], median: [], mode: [] },
      chartSeries: { histogram: [], polygon: [], ogivePositive: [], ogiveNegative: [] },
    };
  }

  const mean = roundNum(sumFx / n, 6);
  const q1Res = computeGroupedQuantile(rows, n, 0.25);
  const medRes = computeGroupedQuantile(rows, n, 0.5);
  const q3Res = computeGroupedQuantile(rows, n, 0.75);
  const medRow = rows[medRes.classIdx];

  const maxF = Math.max(...rows.map((r) => r.fi));
  const modalClassIndices = rows.filter((r) => r.fi === maxF && maxF > 0).map((r) => r.index);
  const modes = modalClassIndices.map((idx) => {
    const r = rows[idx];
    const fPrev = idx > 0 ? rows[idx - 1].fi : 0;
    const fNext = idx < rows.length - 1 ? rows[idx + 1].fi : 0;
    const d1 = r.fi - fPrev;
    const d2 = r.fi - fNext;
    const denom = d1 + d2;
    const mo = denom > 0 ? r.interval.tb + (d1 / denom) * r.interval.p : r.xi;
    return roundNum(mo, 6);
  });

  const primaryModIdx = modalClassIndices[0] ?? 0;
  const modRow = rows[primaryModIdx];
  const d1 = modRow.fi - (primaryModIdx > 0 ? rows[primaryModIdx - 1].fi : 0);
  const d2 = modRow.fi - (primaryModIdx < rows.length - 1 ? rows[primaryModIdx + 1].fi : 0);
  const mode = modes[0] ?? 0;

  let sumSqDev = 0;
  for (const r of rows) {
    sumSqDev += r.fi * (r.xi - mean) ** 2;
  }
  const variancePop = roundNum(sumSqDev / n, 6);
  const stdDevPop = roundNum(Math.sqrt(variancePop), 6);
  const varianceSample = n > 1 ? roundNum(sumSqDev / (n - 1), 6) : 0;
  const stdDevSample = n > 1 ? roundNum(Math.sqrt(varianceSample), 6) : 0;

  // Build reactive chart series
  const histogram = rows.map((r) => ({
    label: `${formatIdNumber(r.interval.tb, 1)}–${formatIdNumber(r.interval.ta, 1)}`,
    tb: r.interval.tb,
    ta: r.interval.ta,
    value: r.fi,
  }));
  const polygon = rows.map((r) => ({
    label: formatIdNumber(r.xi, 1),
    x: r.xi,
    value: r.fi,
  }));
  const ogivePositive = [
    { label: formatIdNumber(rows[0].interval.tb, 1), x: rows[0].interval.tb, value: 0 },
    ...rows.map((r) => ({
      label: formatIdNumber(r.interval.ta, 1),
      x: r.interval.ta,
      value: r.fk,
    })),
  ];
  let rem = n;
  const ogiveNegative = [
    ...rows.map((r) => {
      const pt = { label: formatIdNumber(r.interval.tb, 1), x: r.interval.tb, value: rem };
      rem -= r.fi;
      return pt;
    }),
    { label: formatIdNumber(rows[rows.length - 1].interval.ta, 1), x: rows[rows.length - 1].interval.ta, value: 0 },
  ];

  const stepsLatex = {
    mean: [
      `\\bar{x} = \\frac{\\sum f_i x_i}{\\sum f_i}`,
      `\\bar{x} = \\frac{${formatIdNumber(sumFx, 2)}}{${n}} = ${formatIdNumber(mean, 2)}`,
    ],
    median: [
      `\\text{Kelas Median: } \\frac{1}{2}n = ${formatIdNumber(n / 2, 1)} \\Rightarrow \\text{kelas } ${medRow.label}`,
      `Me = T_b + \\left(\\frac{\\frac{1}{2}n - f_k}{f_m}\\right) \\cdot p`,
      `Me = ${formatIdNumber(medRow.interval.tb, 2)} + \\left(\\frac{${formatIdNumber(n / 2, 1)} - ${medRes.fkBefore}}{${medRow.fi}}\\right) \\cdot ${formatIdNumber(medRow.interval.p, 2)} = ${formatIdNumber(medRes.value, 2)}`,
    ],
    mode: [
      `\\text{Kelas Modus: } f_{\\max} = ${modRow.fi} \\Rightarrow \\text{kelas } ${modRow.label}`,
      `Mo = T_b + \\left(\\frac{d_1}{d_1 + d_2}\\right) \\cdot p`,
      `Mo = ${formatIdNumber(modRow.interval.tb, 2)} + \\left(\\frac{${d1}}{${d1} + ${d2}}\\right) \\cdot ${formatIdNumber(modRow.interval.p, 2)} = ${formatIdNumber(mode, 2)}`,
    ],
  };

  return {
    valid: true,
    rows,
    n,
    sumFx: roundNum(sumFx, 6),
    mean,
    median: medRes.value,
    medianClassIndex: medRes.classIdx,
    medianDetail: {
      tb: medRow.interval.tb,
      fkBefore: medRes.fkBefore,
      fm: medRow.fi,
      p: medRow.interval.p,
      halfN: n / 2,
    },
    q1: q1Res.value,
    q2: medRes.value,
    q3: q3Res.value,
    mode,
    modalClassIndices,
    modes,
    modeDetail: {
      tb: modRow.interval.tb,
      d1,
      d2,
      p: modRow.interval.p,
    },
    varianceSample,
    stdDevSample,
    variancePop,
    stdDevPop,
    stepsLatex,
    chartSeries: { histogram, polygon, ogivePositive, ogiveNegative },
  };
}

/**
 * Exact Ungrouped / Weighted Frequency Data Statistics (Data Tunggal).
 */
export function computeUngroupedStats(inputEntries: UngroupedEntry[]): UngroupedStatsResult {
  // Merge duplicate x values and sort ascending
  const map = new Map<number, number>();
  for (const e of inputEntries) {
    if (!Number.isFinite(e.x) || !Number.isFinite(e.f) || e.f <= 0) continue;
    map.set(e.x, (map.get(e.x) ?? 0) + e.f);
  }
  const sorted = [...map.entries()].sort((a, b) => a[0] - b[0]);

  let fk = 0;
  let sumFx = 0;
  const entries = sorted.map(([x, f]) => {
    fk += f;
    const fx = roundNum(x * f, 6);
    sumFx += fx;
    return { x, f, fx, fk };
  });

  const n = fk;
  if (entries.length === 0 || n <= 0) {
    return {
      valid: false,
      entries: [],
      n: 0,
      sumFx: 0,
      mean: 0,
      median: 0,
      medianPositionLabel: "-",
      modes: [],
      modeLabel: "Tidak ada data",
      q1: 0,
      q3: 0,
      varianceSample: 0,
      stdDevSample: 0,
      stepsLatex: { mean: [], median: [], mode: [] },
    };
  }

  const mean = roundNum(sumFx / n, 6);

  const datumAt = (pos1Based: number): number => {
    for (const e of entries) {
      if (pos1Based <= e.fk) return e.x;
    }
    return entries[entries.length - 1].x;
  };

  let median: number;
  let medianPositionLabel: string;
  if (n % 2 === 1) {
    const pos = (n + 1) / 2;
    median = datumAt(pos);
    medianPositionLabel = `Datum ke-${pos}`;
  } else {
    const p1 = n / 2;
    const p2 = p1 + 1;
    median = roundNum((datumAt(p1) + datumAt(p2)) / 2, 6);
    medianPositionLabel = `Rata-rata datum ke-${p1} & ke-${p2}`;
  }

  const q1Pos = (n + 1) * 0.25;
  const q3Pos = (n + 1) * 0.75;
  const q1 = roundNum((datumAt(Math.max(1, Math.floor(q1Pos))) + datumAt(Math.min(n, Math.ceil(q1Pos)))) / 2, 6);
  const q3 = roundNum((datumAt(Math.max(1, Math.floor(q3Pos))) + datumAt(Math.min(n, Math.ceil(q3Pos)))) / 2, 6);

  const maxF = Math.max(...entries.map((e) => e.f));
  const minF = Math.min(...entries.map((e) => e.f));
  const modes = maxF === minF && entries.length > 1 ? [] : entries.filter((e) => e.f === maxF).map((e) => e.x);
  const modeLabel =
    modes.length === 0 ? "Tidak ada modus" : modes.map((m) => formatIdNumber(m, 2)).join(", ");

  let sumSq = 0;
  for (const e of entries) sumSq += e.f * (e.x - mean) ** 2;
  const varianceSample = n > 1 ? roundNum(sumSq / (n - 1), 6) : 0;
  const stdDevSample = n > 1 ? roundNum(Math.sqrt(varianceSample), 6) : 0;

  return {
    valid: true,
    entries,
    n,
    sumFx: roundNum(sumFx, 6),
    mean,
    median,
    medianPositionLabel,
    modes,
    modeLabel,
    q1,
    q3,
    varianceSample,
    stdDevSample,
    stepsLatex: {
      mean: [
        `\\bar{x} = \\frac{\\sum f_i x_i}{n} = \\frac{${formatIdNumber(sumFx, 2)}}{${n}} = ${formatIdNumber(mean, 2)}`,
      ],
      median: [
        `n = ${n} \\Rightarrow \\text{${medianPositionLabel}}`,
        `Me = ${formatIdNumber(median, 2)}`,
      ],
      mode: [
        `Mo = \\text{${modeLabel}} \\quad (f_{\\max} = ${maxF})`,
      ],
    },
  };
}

/**
 * Parses clipboard text pasted from Excel / Google Sheets / CSV into a 2D string grid.
 */
export function parseSpreadsheetPaste(text: string): string[][] {
  const trimmed = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!trimmed) return [];
  const lines = trimmed.split("\n");
  const hasTabs = lines.some((l) => l.includes("\t"));
  const sep = hasTabs ? "\t" : lines.some((l) => l.includes(";")) ? ";" : ",";
  return lines.map((line) => line.split(sep).map((cell) => cell.trim()));
}
