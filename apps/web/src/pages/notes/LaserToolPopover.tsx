/**
 * LaserToolPopover.tsx — Freenote-Style "Pena Laser" Popover (V5)
 * Matches Screenshot_20261124-235219.jpg.jpeg & 235343:
 * - Tidak Ada Ekor (dot) vs Ekor (fading trail)
 * - Ketebalan (0.5 - 3.0) + Durasi (0.5 - 4.0s)
 * - Swatch warna + custom hex + Hapus
 */
import React from 'react';
import type { LaserConfig } from '@/lib/laserPointerEngine';

export interface LaserToolPopoverProps {
  config: LaserConfig;
  onChange: (next: Partial<LaserConfig>) => void;
  onClear: () => void;
  onClose: () => void;
}

const LASER_SWATCHES = [
  '#ef4444',
  '#2563eb',
  '#16a34a',
  '#f472b6',
  '#c084fc',
  '#facc15',
  '#fb7185',
  '#38bdf8',
];

export const LaserToolPopover: React.FC<LaserToolPopoverProps> = ({
  config,
  onChange,
  onClear,
  onClose,
}) => {
  return (
    <div
      data-testid="laser-tool-popover"
      className="fixed top-24 right-4 z-50 w-72 rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-2xl backdrop-blur-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">Pena Laser</span>
        <button type="button" onClick={onClose} className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100">
          ×
        </button>
      </div>

      {/* Mode Selector: Tidak Ada Ekor vs Ekor */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => onChange({ mode: 'dot' })}
          className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-semibold transition ${
            config.mode === 'dot'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-base leading-none">●</span>
          <span>Tidak Ada Ekor</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: 'trail' })}
          className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-semibold transition ${
            config.mode === 'trail'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="text-base leading-none">〰️</span>
          <span>Ekor</span>
        </button>
      </div>

      {/* Ketebalan */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">Ketebalan</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ thickness: Math.max(0.5, +(config.thickness - 0.1).toFixed(1)) })}
              className="h-5 w-5 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
            >
              -
            </button>
            <span className="w-7 text-center font-mono font-bold text-slate-800">{config.thickness.toFixed(1)}</span>
            <button
              type="button"
              onClick={() => onChange({ thickness: Math.min(3.0, +(config.thickness + 0.1).toFixed(1)) })}
              className="h-5 w-5 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
            >
              +
            </button>
          </div>
        </div>
        <input
          type="range"
          min={0.5}
          max={3.0}
          step={0.1}
          value={config.thickness}
          onChange={(e) => onChange({ thickness: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>

      {/* Durasi */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">Durasi</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChange({ durationSec: Math.max(0.5, +(config.durationSec - 0.2).toFixed(1)) })}
              className="h-5 w-5 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
            >
              -
            </button>
            <span className="w-7 text-center font-mono font-bold text-slate-800">{config.durationSec.toFixed(1)}</span>
            <button
              type="button"
              onClick={() => onChange({ durationSec: Math.min(4.0, +(config.durationSec + 0.2).toFixed(1)) })}
              className="h-5 w-5 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
            >
              +
            </button>
          </div>
        </div>
        <input
          type="range"
          min={0.5}
          max={4.0}
          step={0.1}
          value={config.durationSec}
          onChange={(e) => onChange({ durationSec: Number(e.target.value) })}
          className="w-full accent-blue-600"
        />
      </div>

      {/* Warna */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">Warna</span>
          <input
            type="color"
            value={config.color}
            onChange={(e) => onChange({ color: e.target.value })}
            aria-label="Warna Kustom Laser"
            className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {LASER_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChange({ color: hex })}
              className={`h-7 w-7 rounded-full transition ${
                config.color === hex ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
              aria-label={`Warna laser ${hex}`}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="mt-2 w-full rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
      >
        Hapus Jejak Laser
      </button>
    </div>
  );
};
