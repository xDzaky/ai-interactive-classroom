/**
 * StatSolverCard.tsx — Step-by-Step Mean, Median, Modus Solver Card (V9)
 * Renders exact deterministic calculation steps from @ai-classroom/math-core.
 */
import React, { useState } from "react";
import {
  formatIdNumber,
  type GroupedStatsResult,
  type UngroupedStatsResult,
} from "@ai-classroom/math-core";

export interface StatSolverCardProps {
  mode: "stat_grouped" | "stat_ungrouped";
  grouped?: GroupedStatsResult;
  ungrouped?: UngroupedStatsResult;
}

export const StatSolverCard: React.FC<StatSolverCardProps> = ({
  mode,
  grouped,
  ungrouped,
}) => {
  const [activeTab, setActiveTab] = useState<"mean" | "median" | "mode" | "spread">("mean");

  if (mode === "stat_grouped" && grouped?.valid) {
    const md = grouped.medianDetail;
    const mod = grouped.modeDetail;
    return (
      <div className="mt-2 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-2.5 text-xs text-slate-800">
        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-center shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Mean (x̄)</div>
            <div className="text-sm font-bold text-indigo-700">{formatIdNumber(grouped.mean, 2)}</div>
          </div>
          <div className="rounded-lg bg-amber-50/90 border border-amber-200 px-2 py-1 text-center shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Median (Me)</div>
            <div className="text-sm font-bold text-amber-800">{formatIdNumber(grouped.median, 2)}</div>
          </div>
          <div className="rounded-lg bg-sky-50/90 border border-sky-200 px-2 py-1 text-center shadow-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-sky-700">Modus (Mo)</div>
            <div className="text-sm font-bold text-sky-800">
              {grouped.modes.map((v) => formatIdNumber(v, 2)).join(" & ")}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-2">
          {(
            [
              ["mean", "Langkah Mean"],
              ["median", "Langkah Median"],
              ["mode", "Langkah Modus"],
              ["spread", "Kuartil & Simpangan"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                activeTab === id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "mean" && (
          <div className="space-y-1 rounded-lg bg-white p-2 border border-slate-200/80 font-mono text-[11px]">
            <div>1. Diketahui: Σf = <b>{grouped.n}</b>, Σ(fᵢ·xᵢ) = <b>{formatIdNumber(grouped.sumFx, 2)}</b></div>
            <div>2. Rumus: x̄ = Σ(fᵢ·xᵢ) / Σf</div>
            <div>3. Substitusi: x̄ = {formatIdNumber(grouped.sumFx, 2)} / {grouped.n} = <b className="text-indigo-700">{formatIdNumber(grouped.mean, 2)}</b></div>
          </div>
        )}

        {activeTab === "median" && (
          <div className="space-y-1 rounded-lg bg-white p-2 border border-amber-200/80 font-mono text-[11px]">
            <div>1. Letak Me = ½·n = ½·{grouped.n} = <b>{formatIdNumber(md.halfN, 1)}</b> → Kelas <b>{grouped.rows[grouped.medianClassIndex]?.label}</b></div>
            <div>2. T_b = <b>{formatIdNumber(md.tb, 2)}</b>, f_k = <b>{md.fkBefore}</b>, f_m = <b>{md.fm}</b>, p = <b>{formatIdNumber(md.p, 2)}</b></div>
            <div>3. Me = T_b + ((½n − f_k) / f_m) · p</div>
            <div>4. Me = {formatIdNumber(md.tb, 2)} + (({formatIdNumber(md.halfN, 1)} − {md.fkBefore}) / {md.fm}) · {formatIdNumber(md.p, 2)} = <b className="text-amber-700">{formatIdNumber(grouped.median, 2)}</b></div>
          </div>
        )}

        {activeTab === "mode" && (
          <div className="space-y-1 rounded-lg bg-white p-2 border border-sky-200/80 font-mono text-[11px]">
            <div>1. Kelas Modus (f maks): <b>{grouped.modalClassIndices.map((i) => grouped.rows[i]?.label).join(", ")}</b></div>
            <div>2. T_b = <b>{formatIdNumber(mod.tb, 2)}</b>, d₁ = <b>{mod.d1}</b>, d₂ = <b>{mod.d2}</b>, p = <b>{formatIdNumber(mod.p, 2)}</b></div>
            <div>3. Mo = T_b + (d₁ / (d₁ + d₂)) · p</div>
            <div>4. Mo = {formatIdNumber(mod.tb, 2)} + ({mod.d1} / ({mod.d1} + {mod.d2})) · {formatIdNumber(mod.p, 2)} = <b className="text-sky-700">{formatIdNumber(grouped.mode, 2)}</b></div>
          </div>
        )}

        {activeTab === "spread" && (
          <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-white p-2 border border-slate-200/80 font-mono text-[11px]">
            <div>Q₁ (Kuartil 1): <b>{formatIdNumber(grouped.q1, 2)}</b></div>
            <div>Q₃ (Kuartil 3): <b>{formatIdNumber(grouped.q3, 2)}</b></div>
            <div>Variansi (s²): <b>{formatIdNumber(grouped.varianceSample, 2)}</b></div>
            <div>Simpangan Baku (s): <b>{formatIdNumber(grouped.stdDevSample, 2)}</b></div>
          </div>
        )}
      </div>
    );
  }

  if (mode === "stat_ungrouped" && ungrouped?.valid) {
    return (
      <div className="mt-2 rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-2.5 text-xs text-slate-800">
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <div className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-center">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Mean (x̄)</div>
            <div className="text-sm font-bold text-indigo-700">{formatIdNumber(ungrouped.mean, 2)}</div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-center">
            <div className="text-[10px] font-semibold uppercase text-amber-700">Median (Me)</div>
            <div className="text-sm font-bold text-amber-800">{formatIdNumber(ungrouped.median, 2)}</div>
          </div>
          <div className="rounded-lg bg-sky-50 border border-sky-200 px-2 py-1 text-center">
            <div className="text-[10px] font-semibold uppercase text-sky-700">Modus (Mo)</div>
            <div className="text-sm font-bold text-sky-800">{ungrouped.modeLabel}</div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-2 border border-slate-200/80 font-mono text-[11px] space-y-0.5">
          <div>• n = <b>{ungrouped.n}</b>, Σ(f·x) = <b>{formatIdNumber(ungrouped.sumFx, 2)}</b> → x̄ = <b>{formatIdNumber(ungrouped.mean, 2)}</b></div>
          <div>• Posisi Median: <b>{ungrouped.medianPositionLabel}</b> → Me = <b>{formatIdNumber(ungrouped.median, 2)}</b></div>
          <div>• Q₁ = <b>{formatIdNumber(ungrouped.q1, 2)}</b>, Q₃ = <b>{formatIdNumber(ungrouped.q3, 2)}</b>, Simpangan Baku s = <b>{formatIdNumber(ungrouped.stdDevSample, 2)}</b></div>
        </div>
      </div>
    );
  }

  return null;
};
