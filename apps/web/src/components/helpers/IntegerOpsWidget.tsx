/**
 * IntegerOpsWidget.tsx — V10 Interactive Integer Operations & Number Line Studio
 *
 * 3 pedagogical modes (Whiteboard + Notes):
 * 1. "concept_map"   : Peta Konsep Bilangan Bulat (Negatif hijau ← | Nol cokelat | Positif biru →)
 * 2. "operations"    : Simulator Lompatan Busur per-satuan / panah tunggal + animasi step-by-step
 * 3. "integer_chips" : Keping Muatan (+ biru / − merah) dengan pembatalan pasangan nol (zero-pair)
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { IntegerOpsMode, IntegerOpsWidgetProps } from "@ai-classroom/whiteboard-core";
import { parseIntegerExpression } from "@ai-classroom/math-core";

export interface IntegerOpsWidgetComponentProps {
  id: string;
  widgetProps: IntegerOpsWidgetProps;
  selected?: boolean;
  onSelect?: () => void;
  onUpdateProps?: (patch: Partial<IntegerOpsWidgetProps>) => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
}

const QUICK_EXPR_PRESETS = ["-1 + 3", "-1 - 3", "3 - (-2)", "2 - 5 + 4", "3 * (-2)"];

export const IntegerOpsWidget: React.FC<IntegerOpsWidgetComponentProps> = ({
  id,
  widgetProps,
  selected = false,
  onSelect,
  onUpdateProps,
  onMovePosition,
  onDelete,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleHops, setVisibleHops] = useState<number>(widgetProps.animateStepIndex ?? -1);

  const mode: IntegerOpsMode = widgetProps.mode ?? "operations";
  const parsed = useMemo(
    () => parseIntegerExpression(widgetProps.expression || "-1 + 3"),
    [widgetProps.expression],
  );

  // Sync animateStepIndex from props
  useEffect(() => {
    setVisibleHops(widgetProps.animateStepIndex ?? -1);
  }, [widgetProps.animateStepIndex]);

  // Step-by-step hop playback timer
  useEffect(() => {
    if (!isPlaying || !parsed.valid) return;
    const total = Math.max(1, parsed.totalUnitHops);
    const timer = window.setInterval(() => {
      setVisibleHops((prev) => {
        const next = prev < 0 ? 1 : prev + 1;
        if (next >= total) {
          setIsPlaying(false);
          return -1;
        }
        return next;
      });
    }, 520);
    return () => window.clearInterval(timer);
  }, [isPlaying, parsed.valid, parsed.totalUnitHops]);

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

  // Compute axis tick range
  const minTick =
    mode === "concept_map"
      ? widgetProps.minTick ?? -7
      : parsed.valid
        ? Math.min(widgetProps.minTick ?? -6, parsed.minTick)
        : widgetProps.minTick ?? -6;
  const maxTick =
    mode === "concept_map"
      ? widgetProps.maxTick ?? 7
      : parsed.valid
        ? Math.max(widgetProps.maxTick ?? 6, parsed.maxTick)
        : widgetProps.maxTick ?? 6;

  const tickCount = Math.max(2, maxTick - minTick);
  const svgW = 580;
  const svgH = mode === "concept_map" ? 185 : 175;
  const padL = 38;
  const padR = 38;
  const axisY = mode === "concept_map" ? 105 : 118;
  const toX = (val: number) => padL + ((val - minTick) / tickCount) * (svgW - padL - padR);
  const ticks = Array.from({ length: maxTick - minTick + 1 }, (_, i) => minTick + i);

  // Flatten all unit hops for animated reveal
  const unitHops = useMemo(() => {
    if (!parsed.valid) return [];
    const list: Array<{
      stepIdx: number;
      hopInStep: number;
      from: number;
      to: number;
      dir: 1 | -1;
      stepLabel: string;
    }> = [];
    parsed.steps.forEach((st, stepIdx) => {
      const dir: 1 | -1 = st.delta >= 0 ? 1 : -1;
      const count = Math.abs(st.delta);
      for (let i = 0; i < count; i++) {
        list.push({
          stepIdx,
          hopInStep: i + 1,
          from: st.from + i * dir,
          to: st.from + (i + 1) * dir,
          dir,
          stepLabel: st.label,
        });
      }
    });
    return list;
  }, [parsed]);

  const effectiveVisibleHops = visibleHops < 0 ? unitHops.length : visibleHops;
  const showFinalCircle =
    widgetProps.showResultCircle &&
    !widgetProps.hideResultQuiz &&
    parsed.valid &&
    effectiveVisibleHops >= unitHops.length;

  return (
    <div
      ref={rootRef}
      data-testid={`integer-ops-${id}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`relative flex w-[600px] max-w-[94vw] flex-col rounded-2xl border bg-white/98 p-3 text-slate-800 shadow-lg select-none transition ${
        selected ? "border-indigo-400 ring-2 ring-indigo-300/60" : "border-slate-200/90"
      }`}
    >
      {/* Top Drag Header + Mode Switcher */}
      <div
        onPointerDown={handleDragStart}
        className="mb-2 flex cursor-grab items-center justify-between gap-2 border-b border-slate-100 pb-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800">
            {mode === "concept_map"
              ? "Peta Konsep Bilangan Bulat"
              : mode === "integer_chips"
                ? "Keping Muatan (+ / −)"
                : "Operasi Hitung Bilangan Bulat"}
          </span>
        </div>

        <div
          className="flex items-center gap-1"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {(
            [
              ["concept_map", "Peta Konsep"],
              ["operations", "Lompatan"],
              ["integer_chips", "Keping ±"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => onUpdateProps?.({ mode: m })}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition ${
                mode === m
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Hapus Widget"
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* MODE 1: PETA KONSEP BILANGAN BULAT */}
      {mode === "concept_map" && (
        <div className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-slate-500">Rentang:</span>
              <input
                type="number"
                value={minTick}
                min={-20}
                max={-1}
                onChange={(e) => {
                  const v = Math.max(-20, Math.min(-1, Number(e.target.value) || -7));
                  onUpdateProps?.({ minTick: v });
                }}
                className="w-12 rounded border border-slate-300 px-1.5 py-0.5 text-center font-mono text-xs"
              />
              <span>s/d</span>
              <input
                type="number"
                value={maxTick}
                min={1}
                max={20}
                onChange={(e) => {
                  const v = Math.min(20, Math.max(1, Number(e.target.value) || 7));
                  onUpdateProps?.({ maxTick: v });
                }}
                className="w-12 rounded border border-slate-300 px-1.5 py-0.5 text-center font-mono text-xs"
              />
            </div>
            <label className="flex items-center gap-1 cursor-pointer text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={widgetProps.showSetNotation ?? true}
                onChange={(e) => onUpdateProps?.({ showSetNotation: e.target.checked })}
              />
              Notasi Himpunan B
            </label>
          </div>

          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto overflow-visible">
            {/* Top 3-branch classification brackets */}
            {minTick < 0 && (
              <g>
                <path
                  d={`M ${toX(minTick)} 58 L ${toX(minTick)} 46 L ${toX(-1)} 46 L ${toX(-1)} 58`}
                  fill="none"
                  stroke="#15803D"
                  strokeWidth="1.8"
                />
                <text
                  x={(toX(minTick) + toX(-1)) / 2}
                  y={36}
                  textAnchor="middle"
                  fill="#15803D"
                  fontSize="12"
                  fontWeight="700"
                >
                  Bilangan bulat negatif
                </text>
                {/* Dashed leftward direction arrow */}
                <line
                  x1={toX(-1) - 6}
                  y1={76}
                  x2={toX(minTick) + 6}
                  y2={76}
                  stroke="#15803D"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                />
                <polygon
                  points={`${toX(minTick)},76 ${toX(minTick) + 8},72 ${toX(minTick) + 8},80`}
                  fill="#15803D"
                />
                <text
                  x={(toX(minTick) + toX(-1)) / 2}
                  y={70}
                  textAnchor="middle"
                  fill="#15803D"
                  fontSize="10"
                  fontWeight="600"
                >
                  ← (Kiri)
                </text>
              </g>
            )}

            {/* Zero marker */}
            <g>
              <line x1={toX(0)} y1={46} x2={toX(0)} y2={92} stroke="#7C2D12" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x={toX(0)} y={36} textAnchor="middle" fill="#7C2D12" fontSize="12" fontWeight="800">
                Nol
              </text>
            </g>

            {maxTick > 0 && (
              <g>
                <path
                  d={`M ${toX(1)} 58 L ${toX(1)} 46 L ${toX(maxTick)} 46 L ${toX(maxTick)} 58`}
                  fill="none"
                  stroke="#1D4ED8"
                  strokeWidth="1.8"
                />
                <text
                  x={(toX(1) + toX(maxTick)) / 2}
                  y={36}
                  textAnchor="middle"
                  fill="#1D4ED8"
                  fontSize="12"
                  fontWeight="700"
                >
                  Bilangan bulat positif
                </text>
                {/* Dashed rightward direction arrow */}
                <line
                  x1={toX(1) + 6}
                  y1={76}
                  x2={toX(maxTick) - 6}
                  y2={76}
                  stroke="#1D4ED8"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                />
                <polygon
                  points={`${toX(maxTick)},76 ${toX(maxTick) - 8},72 ${toX(maxTick) - 8},80`}
                  fill="#1D4ED8"
                />
                <text
                  x={(toX(1) + toX(maxTick)) / 2}
                  y={70}
                  textAnchor="middle"
                  fill="#1D4ED8"
                  fontSize="10"
                  fontWeight="600"
                >
                  (Kanan) →
                </text>
              </g>
            )}

            {/* Main black two-headed number line */}
            <line x1={14} y1={axisY} x2={svgW - 14} y2={axisY} stroke="#0f172a" strokeWidth="2.4" />
            <polygon points={`6,${axisY} 18,${axisY - 5} 18,${axisY + 5}`} fill="#0f172a" />
            <polygon points={`${svgW - 6},${axisY} ${svgW - 18},${axisY - 5} ${svgW - 18},${axisY + 5}`} fill="#0f172a" />

            {/* Semantic colored underlines below axis */}
            {minTick < 0 && (
              <line
                x1={toX(minTick) - 8}
                y1={axisY + 32}
                x2={toX(-1) + 8}
                y2={axisY + 32}
                stroke="#15803D"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            {maxTick > 0 && (
              <line
                x1={toX(1) - 8}
                y1={axisY + 32}
                x2={toX(maxTick) + 8}
                y2={axisY + 32}
                stroke="#1D4ED8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Ticks & semantic labels */}
            {ticks.map((t) => {
              const x = toX(t);
              const color = t < 0 ? "#15803D" : t > 0 ? "#1D4ED8" : "#7C2D12";
              return (
                <g key={t}>
                  <line x1={x} y1={axisY - 6} x2={x} y2={axisY + 6} stroke="#0f172a" strokeWidth="2" />
                  {t === 0 && <circle cx={x} cy={axisY} r={4.5} fill="#7C2D12" />}
                  <text
                    x={x}
                    y={axisY + 23}
                    textAnchor="middle"
                    fill={color}
                    fontSize={ticks.length > 17 ? "10" : "12.5"}
                    fontWeight="800"
                  >
                    {t}
                  </text>
                </g>
              );
            })}
          </svg>

          {(widgetProps.showSetNotation ?? true) && (
            <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center font-mono text-xs font-semibold text-slate-700">
              B = &#123;..., {minTick}, {minTick + 1}, ..., -1, <span className="text-amber-900 font-bold">0</span>, 1, ..., {maxTick - 1}, {maxTick}, ...&#125;
            </div>
          )}
        </div>
      )}

      {/* MODE 2: SIMULATOR OPERASI HITUNG BILANGAN BULAT */}
      {mode === "operations" && (
        <div className="space-y-2" onPointerDown={(e) => e.stopPropagation()}>
          {/* Expression Input + Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="text"
              value={widgetProps.expression ?? "-1 + 3"}
              onChange={(e) => {
                setIsPlaying(false);
                setVisibleHops(-1);
                onUpdateProps?.({ expression: e.target.value, animateStepIndex: -1 });
              }}
              placeholder="Contoh: -1 + 3, 3 - (-2), 3 * (-2)"
              className="w-40 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
            />
            <span className="font-mono text-sm font-extrabold text-indigo-700">
              = {widgetProps.hideResultQuiz ? "?" : parsed.valid ? parsed.result : "—"}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-1">
              {QUICK_EXPR_PRESETS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setVisibleHops(-1);
                    onUpdateProps?.({ expression: ex, animateStepIndex: -1 });
                  }}
                  className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Rule Banner + Sign Simplification Note */}
          {widgetProps.showRuleBanner && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50/90 border border-amber-200/80 px-2.5 py-1 text-[11px]">
              <span className="font-bold text-amber-900">
                INGAT! <span className="text-emerald-700">+ : arah ke kanan</span>,{" "}
                <span className="text-red-600">− : arah ke kiri</span>
              </span>
              {parsed.signSimplificationNotes.length > 0 && (
                <span className="rounded bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  {parsed.signSimplificationNotes.join("  |  ")}
                </span>
              )}
            </div>
          )}

          {/* Main SVG Number Line with Hop Arcs */}
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto overflow-visible">
            {/* Axis line */}
            <line x1={14} y1={axisY} x2={svgW - 14} y2={axisY} stroke="#0f172a" strokeWidth="2.4" />
            <polygon points={`6,${axisY} 18,${axisY - 5} 18,${axisY + 5}`} fill="#0f172a" />
            <polygon points={`${svgW - 6},${axisY} ${svgW - 18},${axisY - 5} ${svgW - 18},${axisY + 5}`} fill="#0f172a" />

            {/* Start point marker */}
            {parsed.valid && (
              <g>
                <circle cx={toX(parsed.start)} cy={axisY} r={5.5} fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x={toX(parsed.start)}
                  y={axisY - 12}
                  textAnchor="middle"
                  fill="#4f46e5"
                  fontSize="9.5"
                  fontWeight="700"
                >
                  Mulai
                </text>
              </g>
            )}

            {/* Hop Arcs (Unit Arcs vs Single Jump) */}
            {parsed.valid && widgetProps.hopStyle === "single_jump"
              ? parsed.steps.map((st, idx) => {
                  const x1 = toX(st.from);
                  const x2 = toX(st.to);
                  const midX = (x1 + x2) / 2;
                  const arcH = 38 + idx * 24;
                  const color = st.delta >= 0 ? "#16A34A" : "#DC2626";
                  const arrowSign = st.delta >= 0 ? 1 : -1;
                  return (
                    <g key={`jump-${idx}`}>
                      <path
                        d={`M ${x1} ${axisY - 4} Q ${midX} ${axisY - arcH * 1.6} ${x2} ${axisY - 6}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.4"
                      />
                      <polygon
                        points={`${x2},${axisY - 4} ${x2 - arrowSign * 7},${axisY - 13} ${x2 - arrowSign * 2},${axisY - 16}`}
                        fill={color}
                      />
                      <text
                        x={midX}
                        y={axisY - arcH * 0.85 - 6}
                        textAnchor="middle"
                        fill={color}
                        fontSize="11.5"
                        fontWeight="800"
                      >
                        {st.label}
                      </text>
                    </g>
                  );
                })
              : unitHops.slice(0, effectiveVisibleHops).map((hop, i) => {
                  const x1 = toX(hop.from);
                  const x2 = toX(hop.to);
                  const midX = (x1 + x2) / 2;
                  const layerLift = hop.stepIdx * 24;
                  const arcTop = axisY - 34 - layerLift;
                  const color = hop.dir > 0 ? "#16A34A" : "#DC2626";
                  return (
                    <g key={`hop-${i}`}>
                      <path
                        d={`M ${x1} ${axisY - 4 - layerLift * 0.35} Q ${midX} ${arcTop - 18} ${x2} ${axisY - 6 - layerLift * 0.35}`}
                        fill="none"
                        stroke={color}
                        strokeWidth="2.2"
                      />
                      <polygon
                        points={`${x2},${axisY - 5 - layerLift * 0.35} ${x2 - hop.dir * 6},${axisY - 13 - layerLift * 0.35} ${x2 - hop.dir * 1.5},${axisY - 15 - layerLift * 0.35}`}
                        fill={color}
                      />
                      <text
                        x={midX}
                        y={arcTop - 6}
                        textAnchor="middle"
                        fill={color}
                        fontSize="10"
                        fontWeight="800"
                      >
                        {hop.hopInStep}
                      </text>
                    </g>
                  );
                })}

            {/* Ticks & Result Highlight Circle */}
            {ticks.map((t) => {
              const x = toX(t);
              const isResult = showFinalCircle && t === parsed.result;
              return (
                <g key={t}>
                  <line x1={x} y1={axisY - 5} x2={x} y2={axisY + 5} stroke="#0f172a" strokeWidth="1.8" />
                  {isResult && (
                    <circle
                      cx={x}
                      cy={axisY + 21}
                      r={13}
                      fill="rgba(22, 163, 74, 0.14)"
                      stroke={parsed.result >= 0 ? "#16A34A" : "#DC2626"}
                      strokeWidth="2.4"
                    />
                  )}
                  <text
                    x={x}
                    y={axisY + 25}
                    textAnchor="middle"
                    fill={isResult ? (parsed.result >= 0 ? "#15803D" : "#B91C1C") : "#1e293b"}
                    fontSize={ticks.length > 17 ? "10" : "12.5"}
                    fontWeight={isResult ? "900" : "700"}
                  >
                    {t}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Teaching Playback Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setVisibleHops(0);
                setIsPlaying(true);
              }}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 font-semibold text-white hover:bg-indigo-700"
            >
              {isPlaying ? "Memainkan..." : "Mainkan Lompatan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setVisibleHops((prev) => {
                  if (prev < 0) return 1;
                  return prev >= unitHops.length ? -1 : prev + 1;
                });
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Langkah +1
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setVisibleHops(-1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Tampil Semua
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateProps?.({
                  hopStyle: widgetProps.hopStyle === "unit_arcs" ? "single_jump" : "unit_arcs",
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
            >
              {widgetProps.hopStyle === "unit_arcs" ? "Mode: Busur 1-an" : "Mode: 1 Panah"}
            </button>
            <button
              type="button"
              onClick={() => onUpdateProps?.({ hideResultQuiz: !widgetProps.hideResultQuiz })}
              className={`ml-auto rounded-lg px-2 py-1 font-semibold ${
                widgetProps.hideResultQuiz
                  ? "bg-amber-100 text-amber-800"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {widgetProps.hideResultQuiz ? "Hasil Disembunyikan (?)" : "Sembunyikan Hasil"}
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: KEPING MUATAN (ZERO-PAIR CANCELLATION) */}
      {mode === "integer_chips" && (
        <div className="space-y-2.5" onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={widgetProps.expression ?? "-1 + 3"}
              onChange={(e) => onUpdateProps?.({ expression: e.target.value })}
              className="w-40 rounded-lg border border-slate-300 px-2.5 py-1 font-mono text-sm font-bold outline-none focus:border-indigo-500"
            />
            <span className="font-mono text-sm font-extrabold text-indigo-700">
              = {parsed.valid ? parsed.result : "—"}
            </span>
            <span className="ml-auto text-[11px] text-slate-500">
              Pasangan Nol (0): <b>{parsed.chips.zeroPairs}</b>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            {/* Cancelled Zero Pairs */}
            {Array.from({ length: Math.min(parsed.chips.zeroPairs, 12) }, (_, i) => (
              <div
                key={`zp-${i}`}
                title="Pasangan Nol (+1 dan −1 saling meniadakan = 0)"
                className="relative flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-400 bg-white/70 p-1.5 opacity-60"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                  +
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
                  −
                </span>
                <span className="text-[9px] font-bold text-slate-500">= 0</span>
              </div>
            ))}

            {/* Remaining Unpaired Chips = Answer */}
            {parsed.chips.remainingCount > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border-2 border-emerald-400 bg-emerald-50/60 p-2">
                {Array.from({ length: Math.min(parsed.chips.remainingCount, 16) }, (_, i) => (
                  <span
                    key={`rem-${i}`}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-white shadow-xs ${
                      parsed.chips.remainingSign === "+" ? "bg-blue-600" : "bg-red-600"
                    }`}
                  >
                    {parsed.chips.remainingSign}
                  </span>
                ))}
                <span className="ml-1 text-xs font-extrabold text-emerald-800">
                  Sisa = {parsed.result}
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
                Semua saling meniadakan → Hasil = 0
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
