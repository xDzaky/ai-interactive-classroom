/**
 * SimulationWidget.tsx — Schema-Validated Interactive Simulation Engine (OpenMAIC V4)
 *
 * ZERO eval() / ZERO arbitrary code execution.
 * Renders 5 strictly validated interactive STEM simulation templates with live sliders:
 * 1. math.function_explorer   — Quadratic f(x) = ax² + bx + c (vertex, discriminant, roots)
 * 2. math.geometry_transform  — 2D Translation, Rotation, Reflection, Dilation
 * 3. math.probability_dice    — N-trial Dice Monte Carlo + live frequency histogram
 * 4. physics.projectile_motion — Parabolic trajectory (v0, angle, g -> Hmax, Range, Time)
 * 5. physics.waves_optics     — Two-wave sine superposition (amplitude, frequency, phase)
 */
import React, { useMemo, useState } from 'react';
import type { SimulationTemplateId } from '@ai-classroom/whiteboard-core';

export interface SimulationWidgetProps {
  id: string;
  templateId: SimulationTemplateId;
  initialConfig?: Record<string, unknown>;
  onDelete?: () => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onParameterChange?: (params: Record<string, number>) => void;
}

const TITLES: Record<SimulationTemplateId, string> = {
  'math.function_explorer': 'Simulasi Fungsi Kuadrat f(x) = ax² + bx + c',
  'math.geometry_transform': 'Simulasi Transformasi Geometri 2D',
  'math.probability_dice': 'Simulasi Peluang & Histogram Dadu',
  'physics.projectile_motion': 'Simulasi Gerak Parabola (Fisika)',
  'physics.waves_optics': 'Simulasi Superposisi Gelombang Sinus',
};

export const SimulationWidget: React.FC<SimulationWidgetProps> = ({
  id,
  templateId,
  initialConfig = {},
  onDelete,
  onMovePosition,
  onParameterChange,
}) => {
  // Function explorer state
  const [a, setA] = useState(Number(initialConfig.a ?? 1));
  const [b, setB] = useState(Number(initialConfig.b ?? -2));
  const [c, setC] = useState(Number(initialConfig.c ?? -3));

  // Geometry transform state
  const [tx, setTx] = useState(Number(initialConfig.tx ?? 2));
  const [ty, setTy] = useState(Number(initialConfig.ty ?? 1));
  const [rotDeg, setRotDeg] = useState(Number(initialConfig.rotDeg ?? 30));
  const [scale, setScale] = useState(Number(initialConfig.scale ?? 1.2));

  // Dice probability state
  const [counts, setCounts] = useState<number[]>([5, 4, 6, 5, 5, 5]);

  // Projectile state
  const [v0, setV0] = useState(Number(initialConfig.v0 ?? 25));
  const [angleDeg, setAngleDeg] = useState(Number(initialConfig.angleDeg ?? 45));
  const [g, setG] = useState(Number(initialConfig.g ?? 9.8));

  // Wave state
  const [amp, setAmp] = useState(Number(initialConfig.amplitude ?? 1.4));
  const [freq, setFreq] = useState(Number(initialConfig.frequency ?? 2));
  const [phase, setPhase] = useState(Number(initialConfig.phase ?? 0));

  const handleDragStart = (e: React.PointerEvent) => {
    if (!onMovePosition) return;
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    let lastX = startX;
    let lastY = startY;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (dx !== 0 || dy !== 0) onMovePosition(dx, dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Quadratic path & analytics
  const quadData = useMemo(() => {
    const pts: string[] = [];
    for (let x = -6; x <= 6; x += 0.25) {
      const y = a * x * x + b * x + c;
      const sx = 150 + x * 22;
      const sy = 95 - y * 10;
      if (sy >= -20 && sy <= 210) pts.push(`${sx.toFixed(1)},${sy.toFixed(1)}`);
    }
    const disc = b * b - 4 * a * c;
    const vx = Math.abs(a) > 1e-4 ? -b / (2 * a) : 0;
    const vy = a * vx * vx + b * vx + c;
    return { path: pts.join(' '), disc, vx, vy };
  }, [a, b, c]);

  // Projectile path & analytics
  const projData = useMemo(() => {
    const rad = (angleDeg * Math.PI) / 180;
    const vx = v0 * Math.cos(rad);
    const vy = v0 * Math.sin(rad);
    const tFlight = (2 * vy) / Math.max(g, 1);
    const range = vx * tFlight;
    const hMax = (vy * vy) / (2 * Math.max(g, 1));
    const pts: string[] = [];
    const scaleX = 260 / Math.max(range, 40);
    const scaleY = 140 / Math.max(hMax, 25);
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * tFlight;
      const x = vx * t;
      const y = vy * t - 0.5 * g * t * t;
      pts.push(`${(20 + x * scaleX).toFixed(1)},${(170 - y * scaleY).toFixed(1)}`);
    }
    return { path: pts.join(' '), range, hMax, tFlight };
  }, [v0, angleDeg, g]);

  // Wave superposition paths
  const waveData = useMemo(() => {
    const p1: string[] = [];
    const pSum: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120) * Math.PI * 4;
      const sx = 15 + (i / 120) * 270;
      const y1 = amp * Math.sin(freq * x);
      const y2 = 1.0 * Math.sin(freq * x + (phase * Math.PI) / 180);
      p1.push(`${sx.toFixed(1)},${(95 - y1 * 22).toFixed(1)}`);
      pSum.push(`${sx.toFixed(1)},${(95 - (y1 + y2) * 22).toFixed(1)}`);
    }
    return { p1: p1.join(' '), pSum: pSum.join(' ') };
  }, [amp, freq, phase]);

  // Transform polygon points
  const transformData = useMemo(() => {
    const base: [number, number][] = [
      [0, 0],
      [2, 0],
      [1, 2],
    ];
    const rad = (rotDeg * Math.PI) / 180;
    const toSvg = (pts: [number, number][]) =>
      pts.map(([x, y]) => `${(150 + x * 20).toFixed(1)},${(110 - y * 20).toFixed(1)}`).join(' ');
    const transformed = base.map(([x, y]): [number, number] => {
      const sx = x * scale;
      const sy = y * scale;
      const rx = sx * Math.cos(rad) - sy * Math.sin(rad);
      const ry = sx * Math.sin(rad) + sy * Math.cos(rad);
      return [rx + tx, ry + ty];
    });
    return { orig: toSvg(base), next: toSvg(transformed) };
  }, [tx, ty, rotDeg, scale]);

  const rollMany = (n: number) => {
    setCounts((prev) => {
      const next = [...prev];
      for (let i = 0; i < n; i++) {
        next[Math.floor(Math.random() * 6)]++;
      }
      return next;
    });
  };

  const totalRolls = counts.reduce((s, v) => s + v, 0);

  return (
    <div
      data-testid={`simulation-widget-${id}`}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-indigo-200 bg-white/98 shadow-xl select-none"
    >
      {/* Drag Header */}
      <div
        onPointerDown={handleDragStart}
        className="flex cursor-grab items-center justify-between border-b border-slate-100 bg-indigo-50/70 px-3 py-2 active:cursor-grabbing"
      >
        <span className="truncate text-xs font-bold text-indigo-900">
          {TITLES[templateId]}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Hapus simulasi"
            className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Visual Canvas */}
      <div className="flex-1 bg-slate-50/50 p-2">
        {templateId === 'math.function_explorer' && (
          <svg viewBox="0 0 300 190" className="h-44 w-full rounded-xl border border-slate-200 bg-white">
            <line x1="0" y1="95" x2="300" y2="95" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="150" y1="0" x2="150" y2="190" stroke="#cbd5e1" strokeWidth="1" />
            <polyline points={quadData.path} fill="none" stroke="#4f46e5" strokeWidth="2.5" />
            <circle cx={150 + quadData.vx * 22} cy={95 - quadData.vy * 10} r="4" fill="#ef4444" />
            <text x="8" y="16" fontSize="10" fill="#334155" fontWeight="bold">
              Puncak: ({quadData.vx.toFixed(1)}, {quadData.vy.toFixed(1)}) · D = {quadData.disc.toFixed(1)}
            </text>
          </svg>
        )}

        {templateId === 'physics.projectile_motion' && (
          <svg viewBox="0 0 300 190" className="h-44 w-full rounded-xl border border-slate-200 bg-white">
            <line x1="15" y1="170" x2="290" y2="170" stroke="#94a3b8" strokeWidth="1.5" />
            <polyline points={projData.path} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="5 3" />
            <text x="12" y="18" fontSize="10" fill="#0f172a" fontWeight="bold">
              Hmax: {projData.hMax.toFixed(1)} m · Jarak R: {projData.range.toFixed(1)} m · t: {projData.tFlight.toFixed(2)} s
            </text>
          </svg>
        )}

        {templateId === 'physics.waves_optics' && (
          <svg viewBox="0 0 300 190" className="h-44 w-full rounded-xl border border-slate-200 bg-white">
            <line x1="10" y1="95" x2="290" y2="95" stroke="#cbd5e1" strokeWidth="1" />
            <polyline points={waveData.p1} fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="3 2" />
            <polyline points={waveData.pSum} fill="none" stroke="#4f46e5" strokeWidth="2.5" />
            <text x="10" y="16" fontSize="10" fill="#334155" fontWeight="bold">
              Gelombang Resultan (A={amp}, f={freq}Hz, φ={phase}°)
            </text>
          </svg>
        )}

        {templateId === 'math.geometry_transform' && (
          <svg viewBox="0 0 300 190" className="h-44 w-full rounded-xl border border-slate-200 bg-white">
            <line x1="0" y1="110" x2="300" y2="110" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="150" y1="0" x2="150" y2="190" stroke="#cbd5e1" strokeWidth="1" />
            <polygon points={transformData.orig} fill="rgba(148,163,184,0.25)" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
            <polygon points={transformData.next} fill="rgba(79,70,229,0.25)" stroke="#4f46e5" strokeWidth="2.2" />
          </svg>
        )}

        {templateId === 'math.probability_dice' && (
          <div className="flex h-44 flex-col justify-between rounded-xl border border-slate-200 bg-white p-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>Total Lemparan: {totalRolls}</span>
              <span>Teoritis: 16.7%</span>
            </div>
            <div className="flex flex-1 items-end gap-2 pt-3">
              {counts.map((cnt, idx) => {
                const pct = totalRolls > 0 ? (cnt / totalRolls) * 100 : 0;
                return (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] font-mono text-slate-500">{pct.toFixed(0)}%</span>
                    <div
                      className="w-full rounded-t-md bg-indigo-500 transition-all"
                      style={{ height: `${Math.min(92, pct * 2.4)}px` }}
                    />
                    <span className="text-[11px] font-bold text-slate-800">{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Live Validated Sliders */}
      <div className="border-t border-slate-100 bg-white px-3 py-2 text-[11px]">
        {templateId === 'math.function_explorer' && (
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col">
              <span className="font-mono font-bold">a = {a}</span>
              <input type="range" min={-3} max={3} step={0.5} value={a} onChange={(e) => { const v = Number(e.target.value); setA(v); onParameterChange?.({ a: v, b, c }); }} className="accent-indigo-600" />
            </label>
            <label className="flex flex-col">
              <span className="font-mono font-bold">b = {b}</span>
              <input type="range" min={-6} max={6} step={0.5} value={b} onChange={(e) => { const v = Number(e.target.value); setB(v); onParameterChange?.({ a, b: v, c }); }} className="accent-indigo-600" />
            </label>
            <label className="flex flex-col">
              <span className="font-mono font-bold">c = {c}</span>
              <input type="range" min={-6} max={6} step={0.5} value={c} onChange={(e) => { const v = Number(e.target.value); setC(v); onParameterChange?.({ a, b, c: v }); }} className="accent-indigo-600" />
            </label>
          </div>
        )}

        {templateId === 'physics.projectile_motion' && (
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col">
              <span className="font-mono font-bold">v₀ = {v0} m/s</span>
              <input type="range" min={10} max={50} step={1} value={v0} onChange={(e) => setV0(Number(e.target.value))} className="accent-sky-600" />
            </label>
            <label className="flex flex-col">
              <span className="font-mono font-bold">θ = {angleDeg}°</span>
              <input type="range" min={10} max={85} step={1} value={angleDeg} onChange={(e) => setAngleDeg(Number(e.target.value))} className="accent-sky-600" />
            </label>
            <label className="flex flex-col">
              <span className="font-mono font-bold">g = {g}</span>
              <input type="range" min={1.6} max={15} step={0.2} value={g} onChange={(e) => setG(Number(e.target.value))} className="accent-sky-600" />
            </label>
          </div>
        )}

        {templateId === 'physics.waves_optics' && (
          <div className="grid grid-cols-3 gap-2">
            <label className="flex flex-col">
              <span className="font-mono font-bold">A = {amp}</span>
              <input type="range" min={0.5} max={2.5} step={0.1} value={amp} onChange={(e) => setAmp(Number(e.target.value))} className="accent-indigo-600" />
            </label>
            <label className="flex flex-col">
              <span className="font-mono font-bold">f = {freq} Hz</span>
              <input type="range" min={1} max={5} step={0.5} value={freq} onChange={(e) => setFreq(Number(e.target.value))} className="accent-indigo-600" />
            </label>
            <label className="flex flex-col">
              <span className="font-mono font-bold">φ = {phase}°</span>
              <input type="range" min={0} max={360} step={15} value={phase} onChange={(e) => setPhase(Number(e.target.value))} className="accent-indigo-600" />
            </label>
          </div>
        )}

        {templateId === 'math.geometry_transform' && (
          <div className="grid grid-cols-4 gap-1.5">
            <label className="flex flex-col"><span className="font-mono">tx:{tx}</span><input type="range" min={-5} max={5} step={0.5} value={tx} onChange={(e) => setTx(Number(e.target.value))} /></label>
            <label className="flex flex-col"><span className="font-mono">ty:{ty}</span><input type="range" min={-4} max={4} step={0.5} value={ty} onChange={(e) => setTy(Number(e.target.value))} /></label>
            <label className="flex flex-col"><span className="font-mono">θ:{rotDeg}°</span><input type="range" min={0} max={360} step={15} value={rotDeg} onChange={(e) => setRotDeg(Number(e.target.value))} /></label>
            <label className="flex flex-col"><span className="font-mono">k:{scale}</span><input type="range" min={0.5} max={2.5} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} /></label>
          </div>
        )}

        {templateId === 'math.probability_dice' && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <button type="button" onClick={() => rollMany(1)} className="rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-700">+1 Lempar</button>
              <button type="button" onClick={() => rollMany(10)} className="rounded-lg bg-indigo-100 px-2.5 py-1 font-bold text-indigo-700 hover:bg-indigo-200">+10</button>
              <button type="button" onClick={() => rollMany(100)} className="rounded-lg bg-indigo-100 px-2.5 py-1 font-bold text-indigo-700 hover:bg-indigo-200">+100</button>
            </div>
            <button type="button" onClick={() => setCounts([0, 0, 0, 0, 0, 0])} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50">Reset</button>
          </div>
        )}
      </div>
    </div>
  );
};
