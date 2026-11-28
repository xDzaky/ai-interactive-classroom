/**
 * SubjectHelperPartsA.tsx — Interactive Visual Builders (Horner, Matrix, Factor Tree, Number Line)
 */
import React, { useMemo, useState } from "react";
import {
  computeHornerScheme,
  computeMatrixAnalysis,
  computeFactorTreeAndGcdLcm,
  type FactorTreeNode,
} from "@ai-classroom/math-core";

export interface HelperBodyProps {
  config: Record<string, unknown>;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}

// ─── 1. Horner's Scheme ──────────────────────────────────────────────────────

export const HornerSchemeBody: React.FC<HelperBodyProps> = ({ config, onUpdateConfig }) => {
  const k = Number(config.k ?? 2);
  const coeffs = Array.isArray(config.coeffs)
    ? (config.coeffs as number[])
    : [1, -3, 2, -5];
  const [stepLimit, setStepLimit] = useState(coeffs.length);
  const res = useMemo(() => computeHornerScheme(coeffs, k), [coeffs, k]);

  const updateCoeff = (idx: number, val: string) => {
    const num = Number(val);
    const next = [...coeffs];
    next[idx] = Number.isFinite(num) ? num : 0;
    onUpdateConfig({ coeffs: next });
  };

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1 font-semibold text-slate-700">
          Pembagi x =
          <input
            type="number"
            value={k}
            onChange={(e) => onUpdateConfig({ k: Number(e.target.value) || 0 })}
            className="w-14 rounded-md border border-indigo-200 bg-indigo-50/50 px-1.5 py-0.5 text-center font-mono font-bold text-base sm:text-xs"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            onUpdateConfig({ coeffs: [...coeffs, 0] });
            setStepLimit(coeffs.length + 1);
          }}
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold hover:bg-indigo-50"
        >
          + Derajat
        </button>
        <button
          type="button"
          onClick={() => {
            if (coeffs.length > 2) onUpdateConfig({ coeffs: coeffs.slice(0, -1) });
          }}
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold hover:bg-red-50"
        >
          − Derajat
        </button>
        <button
          type="button"
          onClick={() => setStepLimit((s) => (s >= coeffs.length ? 1 : s + 1))}
          className="ml-auto rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-indigo-700"
        >
          {stepLimit >= coeffs.length ? "↺ Ulang Step" : `Langkah ${stepLimit}/${coeffs.length} →`}
        </button>
      </div>

      {/* Classic L-shaped Horner Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 font-mono">
        <div className="grid items-center gap-1" style={{ gridTemplateColumns: `56px repeat(${coeffs.length}, minmax(48px, 1fr))` }}>
          {/* Row 1: k | coefficients */}
          <div className="border-r-2 border-indigo-500 pr-2 text-right font-bold text-indigo-700">
            {k}
          </div>
          {coeffs.map((c, idx) => (
            <input
              key={idx}
              type="number"
              value={c}
              onChange={(e) => updateCoeff(idx, e.target.value)}
              className="rounded border border-slate-200 bg-white py-0.5 text-center font-bold text-base sm:text-xs"
            />
          ))}

          {/* Row 2: products */}
          <div className="border-r-2 border-b-2 border-indigo-500 pr-2 text-right text-[10px] text-slate-400">
            +
          </div>
          {res.products.map((p, idx) => (
            <div
              key={idx}
              className="border-b-2 border-indigo-500 py-1 text-center text-emerald-700 font-semibold"
            >
              {idx < stepLimit ? (p === null ? "↓" : p) : ""}
            </div>
          ))}

          {/* Row 3: results (quotient + remainder) */}
          <div />
          {res.results.map((r, idx) => {
            const isRem = idx === res.results.length - 1;
            return (
              <div
                key={idx}
                className={`mt-1 rounded py-1 text-center font-bold ${
                  idx < stepLimit
                    ? isRem
                      ? "border-2 border-amber-400 bg-amber-50 text-amber-800"
                      : "bg-indigo-50 text-indigo-800"
                    : "text-transparent"
                }`}
              >
                {r}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50/70 px-2.5 py-1.5 text-[11px]">
        <span>Hasil Bagi <b>H(x) = {res.quotientString}</b></span>
        <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
          Sisa S = {res.remainder}
        </span>
      </div>
    </div>
  );
};

// ─── 2. Matrix Grid ──────────────────────────────────────────────────────────

export const MatrixGridBody: React.FC<HelperBodyProps> = ({ config, onUpdateConfig }) => {
  const values: number[][] = Array.isArray(config.values)
    ? (config.values as number[][])
    : [
        [4, 2],
        [1, 3],
      ];
  const size = values.length === 3 ? 3 : 2;
  const [view, setView] = useState<"det" | "inv" | "trans">("det");
  const analysis = useMemo(() => computeMatrixAnalysis(values), [values]);

  const setSize = (n: 2 | 3) => {
    const next = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => values[r]?.[c] ?? (r === c ? 1 : 0)),
    );
    onUpdateConfig({ rows: n, cols: n, values: next });
  };

  const setCell = (r: number, c: number, raw: string) => {
    const next = values.map((row, ri) =>
      ri === r ? row.map((v, ci) => (ci === c ? Number(raw) || 0 : v)) : row,
    );
    onUpdateConfig({ values: next });
  };

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1">
          {([2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSize(n)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                size === n ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {n}×{n}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(
            [
              ["det", "Determinan"],
              ["inv", "Invers A⁻¹"],
              ["trans", "Transpose Aᵀ"],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                view === id ? "bg-emerald-600 text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Stretchable [ ] Matrix Input */}
      <div className="flex items-center justify-center gap-3 py-1">
        <span className="font-bold text-slate-600">A =</span>
        <div className="relative flex items-center px-2 py-1.5 border-x-2 border-slate-800 rounded-sm">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${size}, 48px)` }}
          >
            {values.map((row, r) =>
              row.map((v, c) => (
                <input
                  key={`${r}-${c}`}
                  type="number"
                  value={v}
                  onChange={(e) => setCell(r, c, e.target.value)}
                  className="rounded border border-slate-200 bg-slate-50 py-1 text-center font-mono font-bold text-base sm:text-xs"
                />
              )),
            )}
          </div>
        </div>
      </div>

      {/* Result Panel */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-[11px]">
        {view === "det" && (
          <div className="space-y-1">
            <div>
              det(A) = <b className="text-indigo-700 text-sm">{analysis.determinant}</b>
            </div>
            {analysis.sarrusPosTerms && analysis.sarrusNegTerms && (
              <div className="text-[10px] text-slate-600">
                Sarrus: ({analysis.sarrusPosTerms.join(" + ")}) − ({analysis.sarrusNegTerms.join(" + ")})
              </div>
            )}
          </div>
        )}
        {view === "inv" && (
          <div>
            {analysis.inverse ? (
              <div className="space-y-1">
                <div className="font-sans font-bold text-emerald-700">Invers A⁻¹:</div>
                {analysis.inverse.map((row, r) => (
                  <div key={r}>[ {row.join(" , ")} ]</div>
                ))}
              </div>
            ) : (
              <div className="text-red-600 font-sans font-semibold">
                Matriks singular (det(A) = 0), tidak memiliki invers.
              </div>
            )}
          </div>
        )}
        {view === "trans" && (
          <div className="space-y-1">
            <div className="font-sans font-bold text-indigo-700">Transpose Aᵀ:</div>
            {analysis.transpose.map((row, r) => (
              <div key={r}>[ {row.join(" , ")} ]</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 3. Factor Tree & Sengkedan (FPB & KPK) ──────────────────────────────────

const FactorTreeSvg: React.FC<{ node: FactorTreeNode }> = ({ node }) => {
  // Flatten into levels for crisp SVG rendering
  const nodes: Array<{ x: number; y: number; val: number; prime: boolean }> = [];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const walk = (n: FactorTreeNode, x: number, y: number, dx: number) => {
    nodes.push({ x, y, val: n.value, prime: n.isPrime });
    if (n.left && n.right) {
      edges.push({ x1: x, y1: y + 12, x2: x - dx, y2: y + 36 });
      edges.push({ x1: x, y1: y + 12, x2: x + dx, y2: y + 36 });
      walk(n.left, x - dx, y + 46, Math.max(20, dx * 0.65));
      walk(n.right, x + dx, y + 46, Math.max(20, dx * 0.65));
    }
  };
  walk(node, 95, 18, 38);
  const maxY = Math.max(70, ...nodes.map((n) => n.y + 22));
  return (
    <svg width={190} height={maxY} className="overflow-visible">
      {edges.map((e, i) => (
        <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#94a3b8" strokeWidth={1.6} />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r={13}
            fill={n.prime ? "#dcfce7" : "#eef2ff"}
            stroke={n.prime ? "#16a34a" : "#4f46e5"}
            strokeWidth={1.8}
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight="bold"
            fill={n.prime ? "#15803d" : "#3730a3"}
          >
            {n.val}
          </text>
        </g>
      ))}
    </svg>
  );
};

export const FactorTreeBody: React.FC<HelperBodyProps> = ({ config, onUpdateConfig }) => {
  const numbers: number[] = Array.isArray(config.numbers) ? (config.numbers as number[]) : [24, 36];
  const viewMode = String(config.viewMode ?? "tree");
  const [inputText, setInputText] = useState(numbers.join(", "));
  const analysis = useMemo(() => computeFactorTreeAndGcdLcm(numbers), [numbers]);

  const applyInput = (val: string) => {
    setInputText(val);
    const parsed = val
      .split(/[,;\s]+/)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n >= 2);
    if (parsed.length > 0) onUpdateConfig({ numbers: parsed.slice(0, 3) });
  };

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => applyInput(e.target.value)}
          placeholder="Contoh: 24, 36, 60"
          className="flex-1 rounded-md border border-slate-200 px-2 py-1 font-mono text-base sm:text-xs"
        />
        <button
          type="button"
          onClick={() => onUpdateConfig({ viewMode: viewMode === "tree" ? "sengkedan" : "tree" })}
          className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold text-white"
        >
          {viewMode === "tree" ? "Tabel Sengkedan" : "Pohon Faktor"}
        </button>
      </div>

      {viewMode === "tree" ? (
        <div className="flex flex-wrap justify-around gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2">
          {analysis.trees.map((t, i) => (
            <FactorTreeSvg key={i} node={t} />
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse text-center font-mono text-[11px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-2 py-1">Pembagi</th>
              {analysis.numbers.map((n, i) => (
                <th key={i} className="border border-slate-300 px-2 py-1">{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analysis.sengkedan.map((step, i) => (
              <tr key={i} className={step.dividesAll ? "bg-emerald-50 font-bold" : ""}>
                <td className="border border-slate-300 px-2 py-0.5 text-indigo-700">
                  {step.divisor} {step.dividesAll ? "★" : ""}
                </td>
                {step.valuesAfter.map((v, j) => (
                  <td key={j} className="border border-slate-300 px-2 py-0.5">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="rounded-lg bg-emerald-50/80 border border-emerald-200 p-2 space-y-1 text-[11px]">
        {analysis.factorizations.map((f) => (
          <div key={f.n} className="font-mono">
            <b>{f.n}</b> = {f.formatted}
          </div>
        ))}
        <div className="flex gap-3 pt-1 font-bold text-emerald-900">
          <span>FPB = {analysis.fpb}</span>
          <span>KPK = {analysis.kpk}</span>
        </div>
      </div>
    </div>
  );
};

// ─── 4. Number Line & Inequality Interval ────────────────────────────────────

export const NumberLineBody: React.FC<HelperBodyProps> = ({ config, onUpdateConfig }) => {
  const min = Number(config.min ?? -5);
  const max = Number(config.max ?? 7);
  const lower = Number(config.lower ?? -2);
  const upper = Number(config.upper ?? 4);
  const lowerInc = Boolean(config.lowerInclusive ?? true);
  const upperInc = Boolean(config.upperInclusive ?? false);

  const ticks = Array.from({ length: Math.max(2, max - min + 1) }, (_, i) => min + i);
  const toSvgX = (val: number) => 28 + ((val - min) / Math.max(1, max - min)) * 384;
  const lx = toSvgX(Math.max(min, Math.min(max, lower)));
  const ux = toSvgX(Math.max(min, Math.min(max, upper)));

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <label className="flex items-center gap-1">
          Batas Bawah:
          <input
            type="number"
            value={lower}
            onChange={(e) => onUpdateConfig({ lower: Number(e.target.value) })}
            className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center font-mono text-base sm:text-xs"
          />
        </label>
        <button
          type="button"
          onClick={() => onUpdateConfig({ lowerInclusive: !lowerInc })}
          className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700"
        >
          {lowerInc ? "● ≤" : "○ <"}
        </button>
        <span className="font-bold">x</span>
        <button
          type="button"
          onClick={() => onUpdateConfig({ upperInclusive: !upperInc })}
          className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-700"
        >
          {upperInc ? "≤ ●" : "< ○"}
        </button>
        <input
          type="number"
          value={upper}
          onChange={(e) => onUpdateConfig({ upper: Number(e.target.value) })}
          className="w-12 rounded border border-slate-200 px-1 py-0.5 text-center font-mono text-base sm:text-xs"
        />
      </div>

      <svg viewBox="0 0 440 84" className="w-full rounded-xl border border-slate-200 bg-slate-50/70">
        {/* Shaded interval bar */}
        <rect
          x={Math.min(lx, ux)}
          y={28}
          width={Math.max(2, Math.abs(ux - lx))}
          height={16}
          rx={4}
          fill="rgba(79,70,229,0.22)"
          stroke="#4f46e5"
          strokeWidth={1.5}
        />
        {/* Main axis */}
        <line x1={14} y1={44} x2={426} y2={44} stroke="#334155" strokeWidth={2} />
        <polygon points="426,44 418,39 418,49" fill="#334155" />
        <polygon points="14,44 22,39 22,49" fill="#334155" />
        {ticks.map((t) => {
          const tx = toSvgX(t);
          return (
            <g key={t}>
              <line x1={tx} y1={39} x2={tx} y2={49} stroke="#475569" strokeWidth={1.5} />
              <text x={tx} y={66} textAnchor="middle" fontSize={10} fill="#334155" fontWeight={t === 0 ? "bold" : "normal"}>
                {t}
              </text>
            </g>
          );
        })}
        {/* Endpoint dots */}
        <circle cx={lx} cy={44} r={5.5} fill={lowerInc ? "#4f46e5" : "#ffffff"} stroke="#4f46e5" strokeWidth={2.2} />
        <circle cx={ux} cy={44} r={5.5} fill={upperInc ? "#4f46e5" : "#ffffff"} stroke="#4f46e5" strokeWidth={2.2} />
      </svg>

      <div className="text-center font-mono text-[11px] font-bold text-indigo-800">
        HP = {"{"} x | {lower} {lowerInc ? "≤" : "<"} x {upperInc ? "≤" : "<"} {upper}, x ∈ ℝ {"}"}
      </div>
    </div>
  );
};
