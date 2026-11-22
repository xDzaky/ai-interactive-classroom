import React, { useState, useEffect } from 'react';
import type { Polyhedron } from '@ai-classroom/geometry-core';
import {
  unfoldPlan,
  curvedSolidNet,
  type UnfoldPlan,
  type CurvedSolidNet,
} from '@ai-classroom/geometry-core';

export interface UnfoldAnimationProps {
  solid:
    | { kind: 'polyhedron'; polyhedron: Polyhedron; name: string }
    | { kind: 'cylinder'; r: number; h: number }
    | { kind: 'cone'; r: number; h: number };
  onClose?: () => void;
}

export const UnfoldAnimation: React.FC<UnfoldAnimationProps> = ({ solid, onClose }) => {
  const [t, setT] = useState<number>(0); // 0 = folded (3D solid), 1 = unfolded (flat 2D net)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setT((prev) => {
        const next = prev + dt * 0.5; // 2 seconds full open
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      if (isPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };

    if (isPlaying) {
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  let plan: UnfoldPlan | null = null;
  let curvedNet: CurvedSolidNet | null = null;

  if (solid.kind === 'polyhedron') {
    plan = unfoldPlan(solid.polyhedron);
  } else if (solid.kind === 'cylinder') {
    curvedNet = curvedSolidNet({ type: 'cylinder', r: solid.r, h: solid.h });
  } else if (solid.kind === 'cone') {
    curvedNet = curvedSolidNet({ type: 'cone', r: solid.r, h: solid.h });
  }

  const togglePlay = () => {
    if (t >= 1) {
      setT(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setT(0);
  };

  return (
    <div
      role="region"
      aria-label="Animasi Jaring-Jaring Bangun Ruang"
      className="p-4 bg-slate-900/90 text-white rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur w-80 space-y-3"
    >
      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
        <h3 className="font-semibold text-sm tracking-wide text-indigo-300">
          Jaring-Jaring (Unfold Net)
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Tutup Panel Unfold"
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
          >
            ✕
          </button>
        )}
      </div>

      <div className="text-xs text-slate-300 space-y-1">
        {solid.kind === 'polyhedron' && (
          <div>
            <span className="text-slate-400">Model:</span>{' '}
            <span className="font-medium text-amber-200">{solid.name}</span>
            <div className="text-[11px] text-slate-400 mt-1">
              {plan?.steps.length ? `${plan.steps.length + 1} Sisi poligon` : ''}
            </div>
          </div>
        )}
        {curvedNet && (
          <div>
            <span className="text-slate-400">Tipe Lengkung:</span>{' '}
            <span className="capitalize font-medium text-amber-200">{curvedNet.type}</span>
            <div className="text-[11px] text-slate-400 mt-1">
              Luas Permukaan:{' '}
              <span className="font-mono text-emerald-300">
                {curvedNet.totalArea.toFixed(2)} cm²
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress & Slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Solid (3D)</span>
          <span className="font-mono text-indigo-200">{Math.round(t * 100)}%</span>
          <span>Jaring (2D)</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={t}
          onChange={(e) => {
            setIsPlaying(false);
            setT(parseFloat(e.target.value));
          }}
          aria-label="Tingkat Pembukaan Jaring-Jaring"
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Jeda Animasi' : 'Mulai Animasi'}
          className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition shadow-sm active:scale-95"
        >
          {isPlaying ? 'Jeda ⏸' : t >= 1 ? 'Ulangi ↺' : 'Buka ▶'}
        </button>
        <button
          onClick={handleReset}
          aria-label="Reset ke Solid"
          className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
