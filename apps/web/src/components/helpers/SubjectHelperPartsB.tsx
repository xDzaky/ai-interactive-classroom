/**
 * SubjectHelperPartsB.tsx — Interactive Visual Builders (Venn Diagram, Sample Space / Pascal, Unit Stairs)
 */
import React, { useMemo, useState } from "react";
import {
  computePascalTriangle,
  computeUnitConversion,
  UNIT_STAIRS_SCALES,
} from "@ai-classroom/math-core";
import type { HelperBodyProps } from "./SubjectHelperPartsA";

// ─── 5. Interactive Venn Diagram ─────────────────────────────────────────────

export const VennDiagramBody: React.FC<HelperBodyProps> = ({ config, onUpdateConfig }) => {
  const counts = (config.counts as Record<string, number>) ?? { onlyA: 8, onlyB: 6, ab: 4, outside: 2 };
  const shaded: string[] = Array.isArray(config.shaded) ? (config.shaded as string[]) : ["ab"];

  const toggleRegion = (reg: string) => {
    const next = shaded.includes(reg) ? shaded.filter((r) => r !== reg) : [...shaded, reg];
    onUpdateConfig({ shaded: next });
  };

  const setPreset = (regs: string[]) => onUpdateConfig({ shaded: regs });
  const totalS = (counts.onlyA ?? 0) + (counts.onlyB ?? 0) + (counts.ab ?? 0) + (counts.outside ?? 0);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap gap-1">
        {(
          [
            ["A ∩ B", ["ab"]],
            ["A ∪ B", ["onlyA", "ab", "onlyB"]],
            ["A \\ B", ["onlyA"]],
            ["(A ∪ B)ᶜ", ["outside"]],
          ] as Array<[string, string[]]>
        ).map(([lbl, regs]) => (
          <button
            key={lbl}
            type="button"
            onClick={() => setPreset(regs)}
            className="rounded-md border border-indigo-200 bg-indigo-50/70 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
          >
            {lbl}
          </button>
        ))}
        <span className="ml-auto text-[11px] font-bold text-slate-600">n(S) = {totalS}</span>
      </div>

      <svg viewBox="0 0 360 175" className="w-full rounded-xl border border-slate-200 bg-white">
        {/* Universal set S */}
        <rect
          x={8}
          y={8}
          width={344}
          height={159}
          rx={10}
          fill={shaded.includes("outside") ? "rgba(99,102,241,0.16)" : "#f8fafc"}
          stroke="#475569"
          strokeWidth={1.6}
          onClick={() => toggleRegion("outside")}
          className="cursor-pointer"
        />
        <text x={20} y={26} fontSize={12} fontWeight="bold" fill="#334155">S</text>

        {/* Circle A */}
        <circle
          cx={145}
          cy={90}
          r={58}
          fill={shaded.includes("onlyA") ? "rgba(79,70,229,0.28)" : "rgba(79,70,229,0.06)"}
          stroke="#4f46e5"
          strokeWidth={2}
          onClick={() => toggleRegion("onlyA")}
          className="cursor-pointer"
        />
        {/* Circle B */}
        <circle
          cx={215}
          cy={90}
          r={58}
          fill={shaded.includes("onlyB") ? "rgba(16,185,129,0.28)" : "rgba(16,185,129,0.06)"}
          stroke="#10b981"
          strokeWidth={2}
          onClick={() => toggleRegion("onlyB")}
          className="cursor-pointer"
        />
        {/* Intersection clickable lens */}
        <ellipse
          cx={180}
          cy={90}
          rx={22}
          ry={46}
          fill={shaded.includes("ab") ? "rgba(245,158,11,0.45)" : "transparent"}
          onClick={() => toggleRegion("ab")}
          className="cursor-pointer"
        />
        <text x={115} y={46} fontSize={12} fontWeight="bold" fill="#4338ca">A</text>
        <text x={242} y={46} fontSize={12} fontWeight="bold" fill="#047857">B</text>
        <text x={125} y={95} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#1e293b">{counts.onlyA}</text>
        <text x={180} y={95} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#b45309">{counts.ab}</text>
        <text x={235} y={95} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#1e293b">{counts.onlyB}</text>
        <text x={326} y={154} textAnchor="middle" fontSize={12} fontWeight="bold" fill="#64748b">{counts.outside}</text>
      </svg>

      <div className="grid grid-cols-4 gap-1.5 text-[10px]">
        {(
          [
            ["onlyA", "Hanya A"],
            ["ab", "A ∩ B"],
            ["onlyB", "Hanya B"],
            ["outside", "Luar"],
          ] as const
        ).map(([k, lbl]) => (
          <label key={k} className="flex flex-col items-center rounded bg-slate-50 p-1 border border-slate-200">
            <span className="text-slate-500">{lbl}</span>
            <input
              type="number"
              value={counts[k] ?? 0}
              onChange={(e) => onUpdateConfig({ counts: { ...counts, [k]: Number(e.target.value) || 0 } })}
              className="w-10 text-center font-mono font-bold bg-transparent text-base sm:text-xs"
            />
          </label>
        ))}
      </div>
    </div>
  );
};

// ─── 6. Sample Space (2 Dice 6×6) & Pascal Triangle ──────────────────────────

export const SampleSpaceTreeBody: React.FC<HelperBodyProps> = ({ config, onUpdateConfig }) => {
  const tab = String(config.tab ?? "dice");
  const targetSum = Number(config.targetSum ?? 7);
  const pascalRows = Number(config.pascalRows ?? 6);
  const [selectedRow, setSelectedRow] = useState(4);

  const pascal = useMemo(() => computePascalTriangle(pascalRows), [pascalRows]);
  const diceMatches = useMemo(() => {
    let count = 0;
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 6; c++) if (r + c === targetSum) count++;
    }
    return count;
  }, [targetSum]);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-1">
        {(
          [
            ["dice", "🎲 2 Dadu (6×6)"],
            ["pascal", "🔺 Segitiga Pascal"],
          ] as const
        ).map(([id, lbl]) => (
          <button
            key={id}
            type="button"
            onClick={() => onUpdateConfig({ tab: id })}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
              tab === id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {tab === "dice" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <label className="flex items-center gap-1 font-semibold">
              Sorot Jumlah Mata Dadu =
              <input
                type="number"
                min={2}
                max={12}
                value={targetSum}
                onChange={(e) => onUpdateConfig({ targetSum: Number(e.target.value) || 7 })}
                className="w-12 rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5 text-center font-mono font-bold text-base sm:text-xs"
              />
            </label>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-mono font-bold text-emerald-800">
              P(A) = {diceMatches}/36
            </span>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center font-mono text-[10px]">
            <div className="bg-slate-200 py-1 font-bold rounded-tl">D1\D2</div>
            {[1, 2, 3, 4, 5, 6].map((c) => (
              <div key={c} className="bg-slate-100 py-1 font-bold">{c}</div>
            ))}
            {[1, 2, 3, 4, 5, 6].map((r) => (
              <React.Fragment key={r}>
                <div className="bg-slate-100 py-1 font-bold">{r}</div>
                {[1, 2, 3, 4, 5, 6].map((c) => {
                  const hit = r + c === targetSum;
                  return (
                    <div
                      key={`${r}-${c}`}
                      className={`py-1 rounded-xs border ${
                        hit
                          ? "border-emerald-400 bg-emerald-100 font-bold text-emerald-900"
                          : "border-slate-100 bg-white text-slate-600"
                      }`}
                    >
                      ({r},{c})
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-center">
          {pascal.map((row, rIdx) => (
            <button
              key={rIdx}
              type="button"
              onClick={() => setSelectedRow(rIdx)}
              className={`mx-auto flex items-center justify-center gap-1.5 rounded-lg px-2 py-0.5 font-mono text-[11px] transition ${
                selectedRow === rIdx ? "bg-indigo-600 text-white font-bold shadow-xs" : "hover:bg-indigo-50 text-slate-700"
              }`}
            >
              <span className="text-[9px] opacity-70 mr-1">n={rIdx}:</span>
              {row.map((v, i) => (
                <span key={i} className="inline-block min-w-[20px]">{v}</span>
              ))}
            </button>
          ))}
          <div className="pt-1 text-[10px] font-semibold text-indigo-800">
            Koefisien (a + b)^{selectedRow} = [{(pascal[selectedRow] ?? []).join(", ")}]
          </div>
        </div>
      )}
    </div>
  );
};

// ─── 7. Unit Conversion Stairs (km..mm / kg..mg) ─────────────────────────────

export const UnitStairsBody: React.FC<HelperBodyProps> = ({ config, onUpdateConfig }) => {
  const category = (config.category === "mass" ? "mass" : "length") as "length" | "mass";
  const scale = UNIT_STAIRS_SCALES[category];
  const fromUnit = String(config.fromUnit ?? scale[0]);
  const toUnit = String(config.toUnit ?? scale[3]);
  const value = Number(config.value ?? 2.5);

  const conv = useMemo(
    () => computeUnitConversion(category, fromUnit, toUnit, value),
    [category, fromUnit, toUnit, value],
  );

  const fromIdx = scale.indexOf(conv.fromUnit as never);
  const toIdx = scale.indexOf(conv.toUnit as never);

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onUpdateConfig({ category: "length", fromUnit: "km", toUnit: "m" })}
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
            category === "length" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Panjang (km–mm)
        </button>
        <button
          type="button"
          onClick={() => onUpdateConfig({ category: "mass", fromUnit: "kg", toUnit: "g" })}
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
            category === "mass" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          Massa (kg–mg)
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onUpdateConfig({ value: Number(e.target.value) || 0 })}
          className="ml-auto w-20 rounded border border-indigo-200 px-1.5 py-0.5 text-center font-mono font-bold text-base sm:text-xs"
        />
      </div>

      {/* Interactive 7-step Staircase */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2">
        <div className="flex flex-col gap-1">
          {scale.map((unit, idx) => {
            const isFrom = idx === fromIdx;
            const isTo = idx === toIdx;
            const inRange = idx >= Math.min(fromIdx, toIdx) && idx <= Math.max(fromIdx, toIdx);
            return (
              <div key={unit} className="flex items-center" style={{ paddingLeft: `${idx * 24}px` }}>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ toUnit: unit })}
                  onDoubleClick={() => onUpdateConfig({ fromUnit: unit })}
                  title="Klik = satuan tujuan, 2x klik = satuan asal"
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-bold transition ${
                    isFrom
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : isTo
                        ? "border-emerald-500 bg-emerald-600 text-white"
                        : inRange
                          ? "border-amber-300 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{unit}</span>
                  {isFrom && <span className="text-[9px] opacity-80">(Asal)</span>}
                  {isTo && <span className="text-[9px] opacity-80">(Tujuan)</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-center font-mono text-[11px]">
        <b>{conv.value} {conv.fromUnit}</b> {conv.factorLabel} = <b className="text-emerald-800 text-sm">{conv.result} {conv.toUnit}</b>
      </div>
    </div>
  );
};
