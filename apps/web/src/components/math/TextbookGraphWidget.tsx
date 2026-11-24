/**
 * TextbookGraphWidget.tsx — Textbook-Grade Function Graph Renderer (V5)
 *
 * Features:
 * - Arrowed x/y axes with exact π-fraction labels (0, π/2, π, 3π/2, 2π)
 * - Discontinuity-safe multi-polyline rendering + dashed vertical asymptotes
 * - Exact red extrema dots with italic `maks.` / `min.` labels & dashed projections to axes
 */
import React, { useMemo, useState } from 'react';
import { synthesizeVisualFromFormula } from '@ai-classroom/math-core';

export interface TextbookGraphWidgetProps {
  id: string;
  formula: string;
  onChangeFormula?: (next: string) => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
}

export const TextbookGraphWidget: React.FC<TextbookGraphWidgetProps> = ({
  id,
  formula,
  onChangeFormula,
  onMovePosition,
  onDelete,
}) => {
  const [localFormula, setLocalFormula] = useState(formula);
  const [showProjections, setShowProjections] = useState(true);

  const spec = useMemo(() => {
    const res = synthesizeVisualFromFormula(localFormula);
    return res?.kind === 'textbook_function_graph' ? res : null;
  }, [localFormula]);

  const handleDrag = (e: React.PointerEvent) => {
    if (!onMovePosition) return;
    e.stopPropagation();
    let lx = e.clientX;
    let ly = e.clientY;
    const onMove = (ev: PointerEvent) => {
      onMovePosition(ev.clientX - lx, ev.clientY - ly);
      lx = ev.clientX;
      ly = ev.clientY;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const W = 420;
  const H = 260;
  const padL = 42;
  const padR = 24;
  const padT = 22;
  const padB = 34;

  const [xMin, xMax] = spec?.domain ?? [0, 2 * Math.PI];
  const [yMin, yMax] = spec?.rangeY ?? [-2, 2];

  const toX = (x: number) => padL + ((x - xMin) / Math.max(1e-6, xMax - xMin)) * (W - padL - padR);
  const toY = (y: number) => H - padB - ((y - yMin) / Math.max(1e-6, yMax - yMin)) * (H - padT - padB);

  const axisY = Math.max(padT, Math.min(H - padB, toY(0)));
  const axisX = Math.max(padL, Math.min(W - padR, toX(0)));

  return (
    <div
      data-testid={`textbook-graph-${id}`}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div
        onPointerDown={handleDrag}
        className="flex cursor-grab items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">GRAFIK BUKU</span>
          <input
            type="text"
            value={localFormula}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              setLocalFormula(e.target.value);
              onChangeFormula?.(e.target.value);
            }}
            className="w-44 truncate rounded border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-800 outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowProjections((v) => !v)}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold ${showProjections ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}
          >
            Proyeksi
          </button>
          {onDelete && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-2">
        {spec ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
            <defs>
              <marker id={`arrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#0f172a" />
              </marker>
            </defs>

            {/* Light grid */}
            {spec.xTicks.map((t, i) => (
              <line key={`gx-${i}`} x1={toX(t.value)} y1={padT} x2={toX(t.value)} y2={H - padB} stroke="#f1f5f9" strokeWidth="1" />
            ))}

            {/* Axes with arrows */}
            <line x1={padL - 8} y1={axisY} x2={W - padR + 10} y2={axisY} stroke="#0f172a" strokeWidth="1.6" markerEnd={`url(#arrow-${id})`} />
            <line x1={axisX} y1={H - padB + 6} x2={axisX} y2={padT - 8} stroke="#0f172a" strokeWidth="1.6" markerEnd={`url(#arrow-${id})`} />
            <text x={W - padR + 12} y={axisY + 4} fontSize="11" fontStyle="italic" fontWeight="bold" fill="#0f172a">x</text>
            <text x={axisX - 12} y={padT - 6} fontSize="11" fontStyle="italic" fontWeight="bold" fill="#0f172a">y</text>

            {/* X Ticks (exact π-fractions or numeric) */}
            {spec.xTicks.map((t, i) => {
              const px = toX(t.value);
              return (
                <g key={`xt-${i}`}>
                  <line x1={px} y1={axisY - 4} x2={px} y2={axisY + 4} stroke="#334155" strokeWidth="1.2" />
                  <text x={px} y={axisY + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">
                    {t.label}
                  </text>
                </g>
              );
            })}

            {/* Vertical Asymptotes */}
            {spec.expressions.map((fn, fi) =>
              fn.asymptotesX.map((ax, ai) => (
                <line
                  key={`asym-${fi}-${ai}`}
                  x1={toX(ax)}
                  y1={padT}
                  x2={toX(ax)}
                  y2={H - padB}
                  stroke="#ef4444"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity="0.7"
                />
              )),
            )}

            {/* Function Polylines */}
            {spec.expressions.map((fn, fi) =>
              fn.polylines.map((pl, pi) => (
                <polyline
                  key={`pl-${fi}-${pi}`}
                  fill="none"
                  stroke={fn.color}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pl.points
                    .map(([x, y]) => `${toX(x).toFixed(1)},${Math.max(padT - 6, Math.min(H - padB + 6, toY(y))).toFixed(1)}`)
                    .join(' ')}
                />
              )),
            )}

            {/* Exact Extrema + Dashed Projections */}
            {spec.expressions.map((fn, fi) =>
              fn.extrema.map((ex, ei) => {
                const px = toX(ex.x);
                const py = toY(ex.y);
                return (
                  <g key={`ex-${fi}-${ei}`}>
                    {showProjections && (
                      <>
                        <line x1={px} y1={py} x2={px} y2={axisY} stroke="#dc2626" strokeWidth="1.1" strokeDasharray="3 3" />
                        <line x1={px} y1={py} x2={axisX} y2={py} stroke="#dc2626" strokeWidth="1.1" strokeDasharray="3 3" />
                        <text x={axisX - 6} y={py + 3} textAnchor="end" fontSize="9.5" fontWeight="bold" fill="#dc2626">
                          {Number.isInteger(Math.round(ex.y * 100) / 100) ? Math.round(ex.y) : ex.y.toFixed(1)}
                        </text>
                      </>
                    )}
                    <circle cx={px} cy={py} r="4.2" fill="#dc2626" stroke="#fff" strokeWidth="1.5" />
                    <text
                      x={px}
                      y={ex.kind === 'maks' ? py - 9 : py + 15}
                      textAnchor="middle"
                      fontSize="10"
                      fontStyle="italic"
                      fontWeight="bold"
                      fill="#dc2626"
                    >
                      {ex.kind}. ({ex.xLabel}, {ex.y.toFixed(1).replace(/\.0$/, '')})
                    </text>
                  </g>
                );
              }),
            )}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Ketik fungsi mis. y = sin(x), 0 &lt;= x &lt;= 2\pi
          </div>
        )}
      </div>
    </div>
  );
};
