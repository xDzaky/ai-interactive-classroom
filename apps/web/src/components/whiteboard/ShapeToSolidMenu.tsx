/**
 * ShapeToSolidMenu — P11-T08
 * Contextual menu offering 2D -> 3D solid conversion proposals when a 2D shape is selected.
 */
import React from 'react';
import { proposeSolidsFromShape, type Input2DShape, type SolidProposal } from '@/lib/shapeToSolid';

export interface ShapeToSolidMenuProps {
  shape: Input2DShape | null;
  /** Screen-space anchor right beside the selected object */
  screenPos?: { x: number; y: number };
  containerWidth?: number;
  containerHeight?: number;
  onSelectProposal: (proposal: SolidProposal) => void;
  onDismiss: () => void;
}

export function ShapeToSolidMenu({
  shape,
  screenPos,
  containerWidth = 1200,
  containerHeight = 760,
  onSelectProposal,
  onDismiss,
}: ShapeToSolidMenuProps) {
  if (!shape) return null;

  const proposals = proposeSolidsFromShape(shape);
  if (proposals.length === 0) return null;

  const menuW = 248;
  const menuH = 220;
  const rawX = screenPos ? screenPos.x : ((shape.props.x as number) ?? (shape.props.cx as number) ?? 180) + 140;
  const rawY = screenPos ? screenPos.y : ((shape.props.y as number) ?? (shape.props.cy as number) ?? 140);
  const clampedLeft = Math.max(16, Math.min(rawX, Math.max(16, containerWidth - menuW - 16)));
  const clampedTop = Math.max(68, Math.min(rawY, Math.max(68, containerHeight - menuH - 16)));

  return (
    <div
      data-testid="shape-to-solid-menu"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute z-40 flex w-[248px] flex-col gap-1.5 rounded-2xl border border-indigo-200 bg-white/97 p-3 text-xs text-slate-800 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
      style={{
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`,
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-bold text-indigo-700">
        <span className="flex items-center gap-1.5">
          <span>📦</span> Ubah ke Bangun Ruang 3D
        </span>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700"
          title="Tutup menu"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        {proposals.map((prop) => (
          <button
            key={prop.id}
            onClick={() => onSelectProposal(prop)}
            data-testid={`proposal-btn-${prop.id}`}
            className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-2 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            <div className="font-semibold text-indigo-700">{prop.title}</div>
            <div className="text-[11px] text-slate-500">{prop.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ShapeToSolidMenu;
