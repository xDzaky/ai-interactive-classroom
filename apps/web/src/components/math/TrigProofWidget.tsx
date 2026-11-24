/**
 * TrigProofWidget.tsx — Parametric Textbook Trigonometric Identity Visual Proof (V5)
 *
 * Renders textbook geometric proofs (Double-Angle A-B-D-E-F, Pythagorean, Angle Sum, Law of Cosines)
 * with concentric angle arcs (θ, θ, 2θ), 90° right-angle squares, upright edge-aligned labels,
 * and an interactive θ slider!
 */
import React, { useMemo, useState } from 'react';
import { buildTrigProofDiagram, type TrigIdentityId } from '@ai-classroom/math-core';
import { buildRightAngleSquare, computeEdgeLabelPlacement } from '@/lib/textbookGeometry';

export interface TrigProofWidgetProps {
  id: string;
  identityId: TrigIdentityId;
  initialThetaDeg?: number;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
}

export const TrigProofWidget: React.FC<TrigProofWidgetProps> = ({
  id,
  identityId,
  initialThetaDeg = 28,
  onMovePosition,
  onDelete,
}) => {
  const [thetaDeg, setThetaDeg] = useState(initialThetaDeg);
  const diagram = useMemo(
    () => buildTrigProofDiagram(identityId, thetaDeg),
    [identityId, thetaDeg],
  );

  const ptMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    diagram.points.forEach((p) => m.set(p.id, { x: p.x, y: p.y }));
    return m;
  }, [diagram]);

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

  return (
    <div
      data-testid={`trig-proof-${id}`}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
    >
      <div
        onPointerDown={handleDrag}
        className="flex cursor-grab items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 active:cursor-grabbing"
      >
        <div>
          <div className="text-[11px] font-bold text-slate-900">{diagram.title}</div>
          <div className="font-mono text-[10px] font-semibold text-indigo-600">{diagram.formula}</div>
        </div>
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

      <div className="flex-1 p-2">
        <svg viewBox="0 0 420 340" className="h-full w-full">
          {identityId === 'pythagorean' && (
            <circle cx="230" cy="190" r="135" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 4" />
          )}

          {/* Concentric angle arcs */}
          {diagram.arcs.map((arc, idx) => {
            const v = ptMap.get(arc.vertex);
            if (!v) return null;
            const r = arc.radiusPx;
            const x0 = v.x + r * Math.cos(arc.startRad);
            const y0 = v.y + r * Math.sin(arc.startRad);
            const x1 = v.x + r * Math.cos(arc.endRad);
            const y1 = v.y + r * Math.sin(arc.endRad);
            const mid = (arc.startRad + arc.endRad) / 2;
            const lx = v.x + (r + 12) * Math.cos(mid);
            const ly = v.y + (r + 12) * Math.sin(mid);
            return (
              <g key={`arc-${idx}`}>
                <path
                  d={`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="2"
                />
                <text x={lx} y={ly + 3} textAnchor="middle" fontSize="11" fontStyle="italic" fontWeight="bold" fill={arc.color}>
                  {arc.label}
                </text>
              </g>
            );
          })}

          {/* Right-angle 90° squares */}
          {diagram.rightAngles.map((ra, idx) => {
            const v = ptMap.get(ra.vertex);
            if (!v) return null;
            const sq = buildRightAngleSquare(
              v,
              { x: ra.uDir[0], y: ra.uDir[1] },
              { x: ra.vDir[0], y: ra.vDir[1] },
              ra.sizePx,
            );
            return (
              <polygon
                key={`ra-${idx}`}
                points={sq.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="rgba(37, 99, 235, 0.12)"
                stroke="#2563eb"
                strokeWidth="1.4"
              />
            );
          })}

          {/* Segments + upright edge-aligned labels */}
          {diagram.segments.map((seg, idx) => {
            const p1 = ptMap.get(seg.from);
            const p2 = ptMap.get(seg.to);
            if (!p1 || !p2) return null;
            const placement = seg.label
              ? computeEdgeLabelPlacement(p1, p2, 0.5, seg.labelOffsetPerp ?? -14, true)
              : null;
            return (
              <g key={`seg-${idx}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={seg.color}
                  strokeWidth={seg.width ?? 2}
                  strokeDasharray={seg.dashed ? '5 4' : undefined}
                />
                {placement && seg.label && (
                  <text
                    x={placement.x}
                    y={placement.y}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={seg.color}
                    transform={`rotate(${placement.rotationDeg}, ${placement.x}, ${placement.y})`}
                  >
                    {seg.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Vertices */}
          {diagram.points.map((p) => (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#0f172a" />
              <text
                x={p.x + (p.labelOffset?.[0] ?? 8)}
                y={p.y + (p.labelOffset?.[1] ?? -8)}
                textAnchor="middle"
                fontSize="12"
                fontWeight="900"
                fill="#0f172a"
              >
                {p.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px]">
        <label className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Sudut θ = {thetaDeg}°</span>
          <input
            type="range"
            min={15}
            max={40}
            step={1}
            value={thetaDeg}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => setThetaDeg(Number(e.target.value))}
            className="flex-1 accent-indigo-600"
          />
        </label>
        <div className="mt-1 font-mono text-[10px] text-slate-600">
          {diagram.summarySteps[diagram.summarySteps.length - 1]}
        </div>
      </div>
    </div>
  );
};
