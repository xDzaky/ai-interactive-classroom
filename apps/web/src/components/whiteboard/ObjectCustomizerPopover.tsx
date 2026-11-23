/**
 * ObjectCustomizerPopover.tsx — Interactive 2D Object Customizer
 * Allows live customization of selected whiteboard objects:
 * dimensions (w/h/r), stroke width, stroke color, fill color, rotation, and opacity.
 */

import React from 'react';
import type { BoardObject } from '@ai-classroom/whiteboard-core';

export interface ObjectCustomizerPopoverProps {
  object: BoardObject;
  x: number;
  y: number;
  onPatchProps: (id: string, patch: Record<string, unknown>) => void;
  onClose: () => void;
}

const SWATCHES = [
  '#f8fafc',
  '#ef4444',
  '#f97316',
  '#facc15',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#111827',
];

export const ObjectCustomizerPopover: React.FC<ObjectCustomizerPopoverProps> = ({
  object,
  x,
  y,
  onPatchProps,
  onClose,
}) => {
  const p = object.props as Record<string, unknown>;
  const strokeWidth = typeof p.strokeWidth === 'number' ? p.strokeWidth : 3;
  const rotation = typeof p.rotation === 'number' ? p.rotation : 0;
  const opacity = typeof p.opacity === 'number' ? p.opacity : 1;
  const fill = typeof p.fill === 'string' ? p.fill : 'transparent';
  const stroke = typeof p.stroke === 'string' ? p.stroke : '#f8fafc';

  const hasWH = typeof p.w === 'number' && typeof p.h === 'number';
  const hasRadius = typeof p.r === 'number';
  const hasRxRy = typeof p.rx === 'number' && typeof p.ry === 'number';

  const left = Math.max(16, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1280) - 290, x - 130));
  const top = Math.max(64, Math.min((typeof window !== 'undefined' ? window.innerHeight : 720) - 360, y + 12));

  return (
    <div
      data-testid="object-customizer-popover"
      role="dialog"
      aria-label="Kustomisasi Objek"
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 w-68 rounded-2xl border border-slate-200 bg-white/95 p-3.5 text-xs text-slate-800 shadow-2xl backdrop-blur-md select-none"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="font-bold text-slate-900 capitalize">
          🎛️ Custom {object.object_type}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Customizer"
          className="rounded-lg px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2.5">
        {/* Dimensions */}
        {hasWH && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-500">
                Lebar: {Math.round(p.w as number)}px
              </span>
              <input
                type="range"
                min={20}
                max={600}
                value={Math.round(p.w as number)}
                onChange={(e) => onPatchProps(object.id, { w: Number(e.target.value) })}
                className="accent-indigo-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-500">
                Tinggi: {Math.round(p.h as number)}px
              </span>
              <input
                type="range"
                min={20}
                max={600}
                value={Math.round(p.h as number)}
                onChange={(e) => onPatchProps(object.id, { h: Number(e.target.value) })}
                className="accent-indigo-600"
              />
            </label>
          </div>
        )}

        {hasRadius && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500">
              Jari-jari: {Math.round(p.r as number)}px
            </span>
            <input
              type="range"
              min={15}
              max={300}
              value={Math.round(p.r as number)}
              onChange={(e) => onPatchProps(object.id, { r: Number(e.target.value) })}
              className="accent-indigo-600"
            />
          </label>
        )}

        {hasRxRy && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-500">
                Radius X: {Math.round(p.rx as number)}px
              </span>
              <input
                type="range"
                min={15}
                max={300}
                value={Math.round(p.rx as number)}
                onChange={(e) => onPatchProps(object.id, { rx: Number(e.target.value) })}
                className="accent-indigo-600"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-slate-500">
                Radius Y: {Math.round(p.ry as number)}px
              </span>
              <input
                type="range"
                min={15}
                max={300}
                value={Math.round(p.ry as number)}
                onChange={(e) => onPatchProps(object.id, { ry: Number(e.target.value) })}
                className="accent-indigo-600"
              />
            </label>
          </div>
        )}

        {/* Stroke Width & Rotation */}
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500">
              Tebal Garis: {strokeWidth}px
            </span>
            <input
              type="range"
              min={1}
              max={16}
              value={strokeWidth}
              onChange={(e) => onPatchProps(object.id, { strokeWidth: Number(e.target.value) })}
              className="accent-indigo-600"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-500">
              Rotasi: {Math.round(rotation)}°
            </span>
            <input
              type="range"
              min={0}
              max={360}
              value={Math.round(rotation)}
              onChange={(e) => onPatchProps(object.id, { rotation: Number(e.target.value) })}
              className="accent-indigo-600"
            />
          </label>
        </div>

        {/* Opacity */}
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold text-slate-500">
            Opasitas: {Math.round(opacity * 100)}%
          </span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => onPatchProps(object.id, { opacity: Number(e.target.value) })}
            className="accent-indigo-600"
          />
        </label>

        {/* Stroke Color */}
        <div>
          <span className="mb-1 block text-[10px] font-semibold text-slate-500">Warna Garis</span>
          <div className="flex flex-wrap gap-1.5">
            {SWATCHES.map((c) => (
              <button
                key={`s-${c}`}
                type="button"
                aria-label={`Garis ${c}`}
                onClick={() => onPatchProps(object.id, { stroke: c })}
                className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                  stroke.toLowerCase() === c.toLowerCase()
                    ? 'ring-2 ring-indigo-500 border-white'
                    : 'border-slate-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Fill Color */}
        <div>
          <span className="mb-1 block text-[10px] font-semibold text-slate-500">Warna Isi (Fill)</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPatchProps(object.id, { fill: 'transparent' })}
              title="Transparan"
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold ${
                fill === 'transparent'
                  ? 'ring-2 ring-indigo-500 border-indigo-400 bg-slate-100'
                  : 'border-slate-300 bg-white text-slate-500'
              }`}
            >
              ∅
            </button>
            {SWATCHES.map((c) => (
              <button
                key={`f-${c}`}
                type="button"
                aria-label={`Isi ${c}`}
                onClick={() => onPatchProps(object.id, { fill: `${c}44` })}
                className={`h-5 w-5 rounded-full border transition hover:scale-110 ${
                  fill.toLowerCase().startsWith(c.toLowerCase())
                    ? 'ring-2 ring-indigo-500 border-white'
                    : 'border-slate-300'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
