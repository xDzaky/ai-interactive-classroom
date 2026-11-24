/**
 * StatChartWidget.tsx — Precision Statistical Chart Widget (Bar / Line / Pie / Scatter) (V5)
 */
import React, { useState } from 'react';

export interface StatChartWidgetProps {
  id: string;
  title: string;
  labels: string[];
  values: number[];
  initialChartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram';
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
}

const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];

export const StatChartWidget: React.FC<StatChartWidgetProps> = ({
  id,
  title,
  labels,
  values,
  initialChartType = 'bar',
  onMovePosition,
  onDelete,
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>(
    initialChartType === 'histogram' ? 'bar' : initialChartType,
  );

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

  const maxV = Math.max(1, ...values.map((v) => Math.abs(v)));
  const totalV = Math.max(1e-6, values.reduce((a, b) => a + Math.max(0, b), 0));

  return (
    <div
      data-testid={`stat-chart-${id}`}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div
        onPointerDown={handleDrag}
        className="flex cursor-grab items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing"
      >
        <span className="text-xs font-bold text-slate-800">{title}</span>
        <div className="flex items-center gap-1">
          {(['bar', 'line', 'pie', 'scatter'] as const).map((ct) => (
            <button
              key={ct}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setChartType(ct)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${chartType === ct ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}
            >
              {ct}
            </button>
          ))}
          {onDelete && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              className="ml-1 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-3">
        <svg viewBox="0 0 380 220" className="h-full w-full">
          {chartType === 'pie' ? (
            (() => {
              let cum = 0;
              return (
                <g transform="translate(130, 110)">
                  {values.map((v, i) => {
                    const frac = Math.max(0, v) / totalV;
                    const a0 = cum * Math.PI * 2 - Math.PI / 2;
                    cum += frac;
                    const a1 = cum * Math.PI * 2 - Math.PI / 2;
                    const r = 78;
                    const x0 = r * Math.cos(a0);
                    const y0 = r * Math.sin(a0);
                    const x1 = r * Math.cos(a1);
                    const y1 = r * Math.sin(a1);
                    const large = frac > 0.5 ? 1 : 0;
                    const color = PIE_COLORS[i % PIE_COLORS.length];
                    return (
                      <g key={i}>
                        <path
                          d={`M 0 0 L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`}
                          fill={color}
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        <rect x="105" y={-68 + i * 20} width="10" height="10" rx="2" fill={color} />
                        <text x="120" y={-59 + i * 20} fontSize="10" fill="#334155">
                          {labels[i]}: {v} ({Math.round(frac * 100)}%)
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()
          ) : (
            <>
              <line x1="36" y1="184" x2="360" y2="184" stroke="#334155" strokeWidth="1.5" />
              <line x1="36" y1="184" x2="36" y2="20" stroke="#334155" strokeWidth="1.5" />
              {chartType === 'bar' &&
                values.map((v, i) => {
                  const slot = 310 / Math.max(1, values.length);
                  const bw = Math.min(44, slot * 0.65);
                  const x = 44 + i * slot + (slot - bw) / 2;
                  const bh = (Math.max(0, v) / maxV) * 145;
                  return (
                    <g key={i}>
                      <rect x={x} y={184 - bh} width={bw} height={bh} rx="5" fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      <text x={x + bw / 2} y={178 - bh} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e293b">{v}</text>
                      <text x={x + bw / 2} y="200" textAnchor="middle" fontSize="9.5" fill="#475569">{labels[i]}</text>
                    </g>
                  );
                })}
              {(chartType === 'line' || chartType === 'scatter') && (
                <>
                  {chartType === 'line' && (
                    <polyline
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                      points={values
                        .map((v, i) => {
                          const x = 56 + (i / Math.max(1, values.length - 1)) * 285;
                          const y = 184 - (Math.max(0, v) / maxV) * 145;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  )}
                  {values.map((v, i) => {
                    const x = 56 + (i / Math.max(1, values.length - 1)) * 285;
                    const y = 184 - (Math.max(0, v) / maxV) * 145;
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r="5" fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth="1.5" />
                        <text x={x} y={y - 9} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#1e293b">{v}</text>
                        <text x={x} y="200" textAnchor="middle" fontSize="9.5" fill="#475569">{labels[i]}</text>
                      </g>
                    );
                  })}
                </>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
};
