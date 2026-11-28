/**
 * SpotlightCurtainOverlay.tsx — Spotlight Focus Ring & Draggable Curtain Shade (V8)
 *
 * Adapted from Honghe Whiteboard (`GCMagnifier`) & Seewo EasiNote Teaching Tools:
 * - Spotlight Mode: dims screen except a draggable circular spotlight (adjustable radius)
 * - Curtain Shade Mode: opaque curtain draggable from top/bottom to reveal answers step-by-step
 */
import React, { useState } from 'react';

export type FocusUtilityMode = 'off' | 'spotlight' | 'curtain';

export interface SpotlightCurtainOverlayProps {
  mode: FocusUtilityMode;
  onChangeMode: (m: FocusUtilityMode) => void;
}

export const SpotlightCurtainOverlay: React.FC<SpotlightCurtainOverlayProps> = ({
  mode,
  onChangeMode,
}) => {
  const [spot, setSpot] = useState({ x: 420, y: 300, r: 130 });
  const [curtainPct, setCurtainPct] = useState(50);

  if (mode === 'off') return null;

  return (
    <div data-testid={`focus-overlay-${mode}`} className="fixed inset-0 z-40 pointer-events-none">
      {mode === 'spotlight' && (
        <div
          onPointerMove={(e) => {
            if (e.buttons === 1 || e.pointerType === 'touch') {
              setSpot((s) => ({ ...s, x: e.clientX, y: e.clientY }));
            }
          }}
          onPointerDown={(e) => setSpot((s) => ({ ...s, x: e.clientX, y: e.clientY }))}
          className="pointer-events-auto absolute inset-0 cursor-move"
          style={{
            background: `radial-gradient(circle ${spot.r}px at ${spot.x}px ${spot.y}px, transparent 0%, transparent 96%, rgba(15, 23, 42, 0.78) 100%)`,
            touchAction: 'none',
          }}
        />
      )}

      {mode === 'curtain' && (
        <div
          style={{ height: `${curtainPct}%` }}
          className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col items-center justify-start bg-slate-900/95 shadow-2xl border-t-4 border-indigo-500"
        >
          <div
            onPointerDown={(e) => {
              e.stopPropagation();
              const onMove = (ev: PointerEvent) => {
                const nextPct = Math.max(8, Math.min(92, ((window.innerHeight - ev.clientY) / window.innerHeight) * 100));
                setCurtainPct(nextPct);
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
            }}
            style={{ touchAction: 'none' }}
            className="mt-2 flex cursor-ns-resize items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg select-none"
          >
            <span>⬍ Tarik Tirai Layar ({Math.round(100 - curtainPct)}% terbuka)</span>
          </div>
        </div>
      )}

      {/* Compact Control Pill */}
      <div className="pointer-events-auto fixed top-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xl">
        <span>{mode === 'spotlight' ? '🔦 Spotlight' : '🎭 Tirai Layar'}</span>
        {mode === 'spotlight' && (
          <input
            type="range"
            min={60}
            max={260}
            value={spot.r}
            onChange={(e) => setSpot((s) => ({ ...s, r: Number(e.target.value) }))}
            className="w-24 accent-indigo-600"
          />
        )}
        <button
          type="button"
          onClick={() => onChangeMode(mode === 'spotlight' ? 'curtain' : 'spotlight')}
          className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] hover:bg-slate-200"
        >
          Ganti Mode
        </button>
        <button
          type="button"
          onClick={() => onChangeMode('off')}
          className="rounded-lg bg-rose-600 px-2.5 py-0.5 text-[11px] text-white hover:bg-rose-500"
        >
          Tutup ×
        </button>
      </div>
    </div>
  );
};
