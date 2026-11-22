/**
 * ShapeToSolidMenu — P11-T08
 * Contextual menu offering 2D -> 3D solid conversion proposals when a 2D shape is selected.
 */
import React from 'react';
import { proposeSolidsFromShape, type Input2DShape, type SolidProposal } from '@/lib/shapeToSolid';

export interface ShapeToSolidMenuProps {
  shape: Input2DShape | null;
  onSelectProposal: (proposal: SolidProposal) => void;
  onDismiss: () => void;
}

export function ShapeToSolidMenu({
  shape,
  onSelectProposal,
  onDismiss,
}: ShapeToSolidMenuProps) {
  if (!shape) return null;

  const proposals = proposeSolidsFromShape(shape);
  if (proposals.length === 0) return null;

  return (
    <div
      data-testid="shape-to-solid-menu"
      className="absolute z-40 flex flex-col gap-1.5 rounded-xl border border-indigo-500/40 bg-slate-900/95 p-3 text-xs text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
      style={{
        left: `${(shape.props.x as number) ?? (shape.props.cx as number) ?? 100}px`,
        top: `${Math.max(((shape.props.y as number) ?? (shape.props.cy as number) ?? 100) - 70, 20)}px`,
      }}
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-indigo-400">
        <span className="flex items-center gap-1.5">
          <span>📦</span> Ubah ke Bangun Ruang 3D
        </span>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white"
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
            className="flex flex-col rounded-lg border border-slate-700/60 bg-slate-800/80 p-2 text-left transition hover:border-indigo-500 hover:bg-slate-700/80"
          >
            <div className="font-semibold text-indigo-300">{prop.title}</div>
            <div className="text-[11px] text-slate-400">{prop.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default ShapeToSolidMenu;
