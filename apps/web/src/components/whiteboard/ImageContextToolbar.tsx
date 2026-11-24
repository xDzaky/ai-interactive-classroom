/**
 * ImageContextToolbar.tsx — Floating Toolbar for Image Layer & Sketch-Tracing Mode (V5)
 *
 * Controls: Opacity (5%–100%), 1-Click Tracing Mode (30% + Lock + Belakang),
 * Lock/Unlock, Z-Order (Belakang/Depan), Flip H/V, Grayscale, Duplicate, Delete.
 */
import React from 'react';

export interface ImageContextToolbarProps {
  opacity: number;
  locked: boolean;
  zLayer: 'background' | 'normal' | 'foreground';
  flipX?: boolean;
  flipY?: boolean;
  grayscale?: boolean;
  onPatch: (patch: Record<string, unknown>) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export const ImageContextToolbar: React.FC<ImageContextToolbarProps> = ({
  opacity,
  locked,
  zLayer,
  flipX,
  flipY,
  grayscale,
  onPatch,
  onDuplicate,
  onDelete,
}) => {
  return (
    <div
      data-testid="image-context-toolbar"
      onPointerDown={(e) => e.stopPropagation()}
      className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/96 px-3 py-1.5 text-[11px] text-slate-700 shadow-xl backdrop-blur-md"
    >
      <label className="flex items-center gap-1.5">
        <span className="font-bold text-slate-600">Opasitas</span>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={opacity}
          aria-label="Opasitas Gambar"
          onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
          className="w-20 accent-indigo-600"
        />
        <span className="w-8 font-mono font-bold text-indigo-700">{Math.round(opacity * 100)}%</span>
      </label>

      <div className="h-4 w-px bg-slate-200" />

      <button
        type="button"
        data-testid="image-tracing-preset-btn"
        onClick={() => onPatch({ opacity: 0.3, locked: true, zLayer: 'background', grayscale: true })}
        className="rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-700"
      >
        Mode Sketsa (30% + Kunci)
      </button>

      <button
        type="button"
        data-testid="image-lock-btn"
        onClick={() => onPatch({ locked: !locked })}
        className={`rounded-lg border px-2 py-1 font-semibold ${
          locked ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white hover:bg-slate-100'
        }`}
      >
        {locked ? 'Terkunci' : 'Kunci'}
      </button>

      <button
        type="button"
        onClick={() => onPatch({ zLayer: zLayer === 'background' ? 'foreground' : 'background' })}
        className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold hover:bg-slate-100"
      >
        {zLayer === 'background' ? 'Taruh Depan' : 'Taruh Belakang'}
      </button>

      <button
        type="button"
        onClick={() => onPatch({ flipX: !flipX })}
        className={`rounded-lg border px-2 py-1 font-semibold ${flipX ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-100'}`}
      >
        Flip H
      </button>

      <button
        type="button"
        onClick={() => onPatch({ flipY: !flipY })}
        className={`rounded-lg border px-2 py-1 font-semibold ${flipY ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white hover:bg-slate-100'}`}
      >
        Flip V
      </button>

      <button
        type="button"
        onClick={() => onPatch({ grayscale: !grayscale })}
        className={`rounded-lg border px-2 py-1 font-semibold ${grayscale ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-200 bg-white hover:bg-slate-100'}`}
      >
        Sketsa B/W
      </button>

      {onDuplicate && (
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold hover:bg-slate-100"
        >
          Duplikat
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 font-semibold text-rose-700 hover:bg-rose-100"
        >
          Hapus
        </button>
      )}
    </div>
  );
};
