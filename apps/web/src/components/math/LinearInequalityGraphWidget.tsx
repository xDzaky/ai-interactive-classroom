/**
 * LinearInequalityGraphWidget.tsx — V10 Exact SPtLDV / SPLDV / Program Linear Visualizer
 *
 * Features:
 * - Exact Sutherland–Hodgman feasible polygon (DP) rendering
 * - 1-click toggle: "DP Bersih" (pita warna di daerah salah, DP putih bersih) vs "DP Diarsir"
 * - Step-by-step reveal per inequality (1 -> 2 -> 3 -> Semua)
 * - Automatic intercept table (x, 0) & (0, y) + test point (0,0)
 * - Corner points A, B, C... + Objective Z = px + qy Min/Max optimization table
 * - Student intercept-table validation banner
 * - Smooth 60fps GPU drag preserving ViewportSyncedOverlayBox DOMMatrix
 */
import React, { useMemo, useRef, useState } from "react";
import type { InequalityGraphProps } from "@ai-classroom/whiteboard-core";
import {
  analyzeLinearSystem,
  formatCoordNumber,
  getUnsatisfiedHalfPlanePolygon,
} from "@ai-classroom/math-core";

export interface LinearInequalityGraphWidgetProps {
  id: string;
  graphProps: InequalityGraphProps;
  selected?: boolean;
  onSelect?: () => void;
  onUpdateProps?: (patch: Partial<InequalityGraphProps>) => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
}

/** Clip line a*x + b*y = c against viewport rectangle to obtain two screen endpoints */
function clipLineToViewport(
  a: number,
  b: number,
  c: number,
  vp: { xMin: number; xMax: number; yMin: number; yMax: number },
): [[number, number], [number, number]] | null {
  const pts: [number, number][] = [];
  const EPS = 1e-7;
  if (Math.abs(b) > EPS) {
    const yAtXMin = (c - a * vp.xMin) / b;
    if (yAtXMin >= vp.yMin - EPS && yAtXMin <= vp.yMax + EPS) pts.push([vp.xMin, yAtXMin]);
    const yAtXMax = (c - a * vp.xMax) / b;
    if (yAtXMax >= vp.yMin - EPS && yAtXMax <= vp.yMax + EPS) pts.push([vp.xMax, yAtXMax]);
  }
  if (Math.abs(a) > EPS) {
    const xAtYMin = (c - b * vp.yMin) / a;
    if (xAtYMin >= vp.xMin - EPS && xAtYMin <= vp.xMax + EPS) pts.push([xAtYMin, vp.yMin]);
    const xAtYMax = (c - b * vp.yMax) / a;
    if (xAtYMax >= vp.xMin - EPS && xAtYMax <= vp.xMax + EPS) pts.push([xAtYMax, vp.yMax]);
  }
  // Deduplicate close endpoints
  const unique: [number, number][] = [];
  for (const p of pts) {
    if (!unique.some((u) => Math.hypot(u[0] - p[0], u[1] - p[1]) < 1e-3)) {
      unique.push(p);
    }
  }
  if (unique.length < 2) return null;
  return [unique[0], unique[1]];
}

export const LinearInequalityGraphWidget: React.FC<LinearInequalityGraphWidgetProps> = ({
  id,
  graphProps,
  selected = false,
  onSelect,
  onUpdateProps,
  onMovePosition,
  onDelete,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [showEditor, setShowEditor] = useState(false);

  const analysis = useMemo(
    () =>
      analyzeLinearSystem(graphProps.rawExpressions ?? "", {
        objectiveExpr: graphProps.objectiveExpr,
        studentTablePoints: graphProps.studentTablePoints,
      }),
    [graphProps.rawExpressions, graphProps.objectiveExpr, graphProps.studentTablePoints],
  );

  // Smooth GPU drag preserving ViewportSyncedOverlayBox DOMMatrix
  const handleDragStart = (e: React.PointerEvent) => {
    if (!onMovePosition) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    const startX = e.clientX;
    const startY = e.clientY;
    let dx = 0;
    let dy = 0;
    const parentEl = rootRef.current?.parentElement;
    let baseX = 0;
    let baseY = 0;
    let baseScale = 1;
    let hasMatrix = false;
    if (parentEl && typeof window !== "undefined" && typeof DOMMatrix !== "undefined") {
      const comp = window.getComputedStyle(parentEl).transform;
      if (comp && comp !== "none") {
        const m = new DOMMatrix(comp);
        baseX = m.e;
        baseY = m.f;
        baseScale = m.a || 1;
        hasMatrix = true;
      }
    }
    const onMove = (ev: PointerEvent) => {
      dx = ev.clientX - startX;
      dy = ev.clientY - startY;
      if (parentEl && hasMatrix) {
        parentEl.style.transform = `translate3d(${baseX + dx}px, ${baseY + dy}px, 0) scale(${baseScale})`;
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        onMovePosition(dx, dy);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const vp = analysis.viewportBounds;
  const svgW = 460;
  const svgH = 310;
  const pad = 28;
  const toSvgX = (x: number) => pad + ((x - vp.xMin) / Math.max(1e-6, vp.xMax - vp.xMin)) * (svgW - pad * 2);
  const toSvgY = (y: number) => svgH - pad - ((y - vp.yMin) / Math.max(1e-6, vp.yMax - vp.yMin)) * (svgH - pad * 2);

  const visibleCount =
    graphProps.visibleStepCount < 0
      ? analysis.inequalities.length
      : Math.min(graphProps.visibleStepCount, analysis.inequalities.length);
  const visibleInequalities = analysis.inequalities.slice(0, visibleCount);
  const allRevealed = visibleCount >= analysis.inequalities.length;

  // Smart integer ticks for X and Y axes
  const spanX = vp.xMax - vp.xMin;
  const stepX = spanX <= 12 ? 1 : spanX <= 26 ? 2 : Math.ceil(spanX / 10);
  const xTicks: number[] = [];
  for (let x = Math.ceil(vp.xMin / stepX) * stepX; x <= Math.floor(vp.xMax); x += stepX) {
    if (x !== 0) xTicks.push(x);
  }
  const spanY = vp.yMax - vp.yMin;
  const stepY = spanY <= 12 ? 1 : spanY <= 26 ? 2 : Math.ceil(spanY / 10);
  const yTicks: number[] = [];
  for (let y = Math.ceil(vp.yMin / stepY) * stepY; y <= Math.floor(vp.yMax); y += stepY) {
    if (y !== 0) yTicks.push(y);
  }

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  return (
    <div
      ref={rootRef}
      data-testid={`inequality-graph-${id}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`relative flex w-[560px] max-w-[95vw] flex-col rounded-2xl border bg-white/98 p-3 text-slate-800 shadow-lg select-none transition ${
        selected ? "border-indigo-400 ring-2 ring-indigo-300/60" : "border-slate-200/90"
      }`}
    >
      {/* Header */}
      <div
        onPointerDown={handleDragStart}
        className="mb-2 flex cursor-grab items-center justify-between gap-2 border-b border-slate-100 pb-1.5 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-800 truncate">
            {graphProps.title ?? "Grafik Daerah Penyelesaian (SPtLDV)"}
          </span>
          {analysis.isEmpty && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
              HP Kosong (∅)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() =>
              onUpdateProps?.({
                shadeMode: graphProps.shadeMode === "clean_dp" ? "shaded_dp" : "clean_dp",
              })
            }
            className="rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100"
          >
            {graphProps.shadeMode === "clean_dp" ? "Mode: DP Bersih" : "Mode: DP Diarsir"}
          </button>
          <button
            type="button"
            onClick={() => setShowEditor((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            {showEditor ? "Tutup Edit" : "Edit"}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Hapus Grafik"
              className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Optional Inline Editor */}
      {showEditor && (
        <div
          className="mb-2 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <textarea
            rows={4}
            value={graphProps.rawExpressions}
            onChange={(e) => onUpdateProps?.({ rawExpressions: e.target.value })}
            placeholder="Satu pertidaksamaan per baris, mis.:\nx + 2y <= 10\nx + y <= 7\n2 <= x <= 6\ny >= 0"
            className="w-full rounded-lg border border-slate-300 bg-white p-1.5 font-mono text-xs outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={graphProps.objectiveExpr ?? ""}
            onChange={(e) => onUpdateProps?.({ objectiveExpr: e.target.value || undefined })}
            placeholder="Fungsi tujuan opsional (mis. Z = 3x + 4y)"
            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 font-mono text-xs outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Student Verification Banner (when table points were selected alongside system) */}
      {analysis.studentCheck && (
        <div
          className={`mb-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${
            analysis.studentCheck.isConsistent
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-900"
          }`}
        >
          {analysis.studentCheck.isConsistent ? (
            <span className="font-semibold">
              ✓ Tabel titik potong yang diseleksi 100% konsisten dengan persamaan batas.
            </span>
          ) : (
            <div className="space-y-0.5">
              <div className="font-bold">Periksa kembali tabel titik potong:</div>
              {analysis.studentCheck.warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Cartesian SVG */}
      <div className="relative rounded-xl border border-slate-200 bg-white overflow-hidden">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto block">
          <defs>
            <clipPath id={`vp-clip-${id}`}>
              <rect x={pad} y={pad} width={svgW - pad * 2} height={svgH - pad * 2} />
            </clipPath>
          </defs>

          {/* Subtle Grid */}
          <g stroke="#f1f5f9" strokeWidth="1">
            {xTicks.map((x) => (
              <line key={`gx-${x}`} x1={toSvgX(x)} y1={pad} x2={toSvgX(x)} y2={svgH - pad} />
            ))}
            {yTicks.map((y) => (
              <line key={`gy-${y}`} x1={pad} y1={toSvgY(y)} x2={svgW - pad} y2={toSvgY(y)} />
            ))}
          </g>

          {/* Half-plane Shading Layer */}
          <g clipPath={`url(#vp-clip-${id})`}>
            {graphProps.shadeMode === "clean_dp" ? (
              // Textbook "DP adalah daerah yang bersih": shade the UNSATISFIED half-plane for each inequality!
              visibleInequalities.map((ineq) => {
                const badPoly = getUnsatisfiedHalfPlanePolygon(vp, ineq);
                if (badPoly.length < 3) return null;
                const d = badPoly.map(([x, y]) => `${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`).join(" ");
                return (
                  <polygon
                    key={`bad-${ineq.id}`}
                    points={d}
                    fill={ineq.color}
                    fillOpacity={0.42}
                  />
                );
              })
            ) : (
              // "DP Diarsir": shade ONLY the exact feasible polygon
              !analysis.isEmpty &&
              analysis.feasiblePolygon.length >= 3 && (
                <polygon
                  points={analysis.feasiblePolygon
                    .map(([x, y]) => `${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`)
                    .join(" ")}
                  fill="#6366f1"
                  fillOpacity={0.28}
                  stroke="#4f46e5"
                  strokeWidth="2"
                />
              )
            )}
          </g>

          {/* Cartesian Axes with Arrows */}
          <g stroke="#1e293b" strokeWidth="1.6">
            {/* X-axis */}
            <line x1={pad - 6} y1={originY} x2={svgW - pad + 10} y2={originY} />
            <polygon points={`${svgW - pad + 14},${originY} ${svgW - pad + 6},${originY - 4} ${svgW - pad + 6},${originY + 4}`} fill="#1e293b" />
            {/* Y-axis */}
            <line x1={originX} y1={svgH - pad + 6} x2={originX} y2={pad - 10} />
            <polygon points={`${originX},${pad - 14} ${originX - 4},${pad - 6} ${originX + 4},${pad - 6}`} fill="#1e293b" />
          </g>
          <text x={svgW - pad + 12} y={originY + 14} fontSize="11" fontWeight="800" fill="#0f172a">x</text>
          <text x={originX + 8} y={pad - 8} fontSize="11" fontWeight="800" fill="#0f172a">y</text>

          {/* Axis Tick Labels */}
          <g fontSize="9.5" fontWeight="600" fill="#475569">
            {xTicks.map((x) => (
              <g key={`tx-${x}`}>
                <line x1={toSvgX(x)} y1={originY - 3} x2={toSvgX(x)} y2={originY + 3} stroke="#334155" strokeWidth="1.2" />
                <text x={toSvgX(x)} y={originY + 14} textAnchor="middle">{x}</text>
              </g>
            ))}
            {yTicks.map((y) => (
              <g key={`ty-${y}`}>
                <line x1={originX - 3} y1={toSvgY(y)} x2={originX + 3} y2={toSvgY(y)} stroke="#334155" strokeWidth="1.2" />
                <text x={originX - 7} y={toSvgY(y) + 3} textAnchor="end">{y}</text>
              </g>
            ))}
            <text x={originX - 7} y={originY + 13} textAnchor="end" fontWeight="700">0</text>
          </g>

          {/* Boundary Lines (Inequalities + Equations) */}
          <g clipPath={`url(#vp-clip-${id})`}>
            {[...visibleInequalities, ...analysis.equations].map((rel) => {
              const seg = clipLineToViewport(rel.a, rel.b, rel.c, vp);
              if (!seg) return null;
              const isStrict = "strict" in rel && rel.strict;
              return (
                <line
                  key={`line-${rel.id}`}
                  x1={toSvgX(seg[0][0])}
                  y1={toSvgY(seg[0][1])}
                  x2={toSvgX(seg[1][0])}
                  y2={toSvgY(seg[1][1])}
                  stroke="#0f172a"
                  strokeWidth="2"
                  strokeDasharray={isStrict ? "6 4" : undefined}
                />
              );
            })}
          </g>

          {/* Corner Points A, B, C... */}
          {allRevealed &&
            graphProps.showCornerPoints &&
            analysis.cornerPoints.map((cp, idx) => {
              const sx = toSvgX(cp.pt[0]);
              const sy = toSvgY(cp.pt[1]);
              const isOptMax = analysis.objective?.maxCorner === idx;
              return (
                <g key={`cp-${cp.label}`}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isOptMax ? 5.5 : 4.2}
                    fill={isOptMax ? "#16a34a" : "#2563eb"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={sx + 7}
                    y={sy - 6}
                    fontSize="10"
                    fontWeight="800"
                    fill={isOptMax ? "#15803d" : "#1e3a8a"}
                  >
                    {cp.label}({formatCoordNumber(cp.pt[0])}, {formatCoordNumber(cp.pt[1])})
                  </text>
                </g>
              );
            })}

          {/* Bold "DP" Label centered inside Feasible Polygon */}
          {allRevealed && !analysis.isEmpty && analysis.dpLabelPoint && (
            <g>
              <rect
                x={toSvgX(analysis.dpLabelPoint[0]) - 16}
                y={toSvgY(analysis.dpLabelPoint[1]) - 11}
                width={32}
                height={20}
                rx={6}
                fill="rgba(255,255,255,0.9)"
                stroke="#4f46e5"
                strokeWidth="1.2"
              />
              <text
                x={toSvgX(analysis.dpLabelPoint[0])}
                y={toSvgY(analysis.dpLabelPoint[1]) + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="900"
                fill="#1e1b4b"
              >
                DP
              </text>
            </g>
          )}
        </svg>

        {/* Legend Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/90 px-2.5 py-1 text-[10px]">
          <span className="font-bold text-slate-700">
            {graphProps.shadeMode === "clean_dp"
              ? "DP adalah daerah yang bersih"
              : "Daerah yang diarsir adalah DP"}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleInequalities.map((iq) => (
              <span key={iq.id} className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700">
                <span className="h-2.5 w-2.5 rounded-xs border border-slate-300" style={{ backgroundColor: iq.color }} />
                {iq.rawLatex}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Compact Control Strip */}
      <div
        className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onUpdateProps?.({ showInterceptTable: !graphProps.showInterceptTable })}
          className={`rounded-lg px-2 py-1 font-semibold ${
            graphProps.showInterceptTable
              ? "bg-slate-800 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Tabel Titik Potong
        </button>
        <button
          type="button"
          onClick={() => onUpdateProps?.({ showCornerPoints: !graphProps.showCornerPoints })}
          className={`rounded-lg px-2 py-1 font-semibold ${
            graphProps.showCornerPoints
              ? "bg-slate-800 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Titik Pojok{analysis.objective ? " & Z" : ""}
        </button>
        {analysis.inequalities.length > 1 && (
          <button
            type="button"
            onClick={() => {
              const cur = graphProps.visibleStepCount;
              const next = cur < 0 ? 1 : cur >= analysis.inequalities.length ? -1 : cur + 1;
              onUpdateProps?.({ visibleStepCount: next });
            }}
            className="ml-auto rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            {graphProps.visibleStepCount < 0
              ? "Step-by-Step"
              : `Langkah ${visibleCount}/${analysis.inequalities.length}`}
          </button>
        )}
      </div>

      {/* Automatic Intercept Table */}
      {graphProps.showInterceptTable && analysis.interceptTables.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 text-[11px]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border-b border-slate-200 px-2 py-1 font-bold">Garis Batas</th>
                <th className="border-b border-slate-200 px-2 py-1 font-bold">Potong Sb-x</th>
                <th className="border-b border-slate-200 px-2 py-1 font-bold">Potong Sb-y</th>
                <th className="border-b border-slate-200 px-2 py-1 font-bold">Uji Titik</th>
              </tr>
            </thead>
            <tbody>
              {analysis.interceptTables.map((t) => (
                <tr key={t.inequalityId} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-1 font-mono font-semibold">{t.equationLatex}</td>
                  <td className="px-2 py-1 font-mono">
                    {t.xIntercept ? `(${formatCoordNumber(t.xIntercept[0])}, 0)` : "—"}
                  </td>
                  <td className="px-2 py-1 font-mono">
                    {t.yIntercept ? `(0, ${formatCoordNumber(t.yIntercept[1])})` : "—"}
                  </td>
                  <td className="px-2 py-1 text-[10px] text-slate-600">{t.testPoint.substitutionText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Corner Points & Objective Z Table */}
      {graphProps.showCornerPoints && analysis.objective && analysis.cornerPoints.length > 0 && (
        <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1.5 text-[11px]">
          <div className="font-bold text-emerald-900 mb-1">
            Uji Titik Pojok ({analysis.objective.latex}):
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.cornerPoints.map((cp, idx) => (
              <span
                key={cp.label}
                className={`rounded-md px-2 py-0.5 font-mono font-semibold ${
                  analysis.objective?.maxCorner === idx
                    ? "bg-emerald-600 text-white"
                    : analysis.objective?.minCorner === idx
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {cp.label}({formatCoordNumber(cp.pt[0])},{formatCoordNumber(cp.pt[1])}) → Z ={" "}
                {cp.objectiveValue !== undefined ? formatCoordNumber(cp.objectiveValue) : "—"}
                {analysis.objective?.maxCorner === idx ? " (Maks)" : ""}
                {analysis.objective?.minCorner === idx ? " (Min)" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
