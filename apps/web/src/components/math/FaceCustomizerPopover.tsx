/**
 * FaceCustomizerPopover.tsx — Per-Face Color, Style & Label Customizer (V3)
 * Allows teachers to customize Dice (pips, numbers 1-6, letters A-F, custom math text),
 * Gift boxes, and other textured 3D solids live.
 */
import React from 'react';
import type { DiceFaceMode, FaceCustomConfig } from '@/lib/faceTextures';

export interface FaceCustomizerPopoverProps {
  config: FaceCustomConfig;
  onChange: (next: FaceCustomConfig) => void;
  onClose: () => void;
}

const BASE_SWATCHES = ['#ffffff', '#fef3c7', '#dbeafe', '#fce7f3', '#dcfce7', '#f3e8ff'];
const INK_SWATCHES = ['#0f172a', '#dc2626', '#2563eb', '#059669', '#7c3aed', '#ea580c'];

export const FaceCustomizerPopover: React.FC<FaceCustomizerPopoverProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const mode: DiceFaceMode = config.mode ?? 'pips';

  return (
    <div
      data-testid="face-customizer-popover"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute -right-60 top-8 z-40 w-56 rounded-2xl border border-slate-200 bg-white/98 p-3 text-xs text-slate-800 shadow-2xl backdrop-blur-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-slate-900">Kustom Sisi</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      {/* Mode */}
      <div className="mb-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Gaya Isi Sisi
        </div>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              ['pips', 'Titik ●'],
              ['number', 'Angka 1–6'],
              ['letter', 'Huruf A–F'],
              ['custom', 'Teks Bebas'],
            ] as const
          ).map(([m, lbl]) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...config, mode: m })}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                mode === m
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Labels per Face when mode === 'custom' */}
      {mode === 'custom' && (
        <div className="mb-2.5 grid grid-cols-3 gap-1">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <input
              key={idx}
              type="text"
              maxLength={6}
              value={config.faceLabels?.[idx] ?? ''}
              placeholder={`Sisi ${idx + 1}`}
              onChange={(e) =>
                onChange({
                  ...config,
                  faceLabels: { ...(config.faceLabels ?? {}), [idx]: e.target.value },
                })
              }
              className="rounded-md border border-slate-200 px-1.5 py-1 text-center text-[11px] outline-none focus:border-indigo-400"
            />
          ))}
        </div>
      )}

      {/* Base Color */}
      <div className="mb-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Warna Dasar
        </div>
        <div className="flex gap-1.5">
          {BASE_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...config, baseColor: c })}
              style={{ backgroundColor: c }}
              className={`h-5 w-5 rounded-full border ${
                config.baseColor === c ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Ink / Pip Color */}
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Warna Titik / Teks
        </div>
        <div className="flex gap-1.5">
          {INK_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...config, inkColor: c })}
              style={{ backgroundColor: c }}
              className={`h-5 w-5 rounded-full border ${
                config.inkColor === c ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
