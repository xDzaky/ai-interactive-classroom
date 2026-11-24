/**
 * MathLabs.tsx — 4 Native Full-Screen Interactive Mathematics Virtual Labs
 * Owned by AI Interactive Classroom — freely customizable.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================================
 * 1. GRAFIK FUNGSI KUADRAT (Graphing Quadratics)
 * ========================================================================== */
export const QuadraticsLab: React.FC = () => {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-2);
  const [c, setC] = useState(-3);
  const [showAxis, setShowAxis] = useState(true);
  const [showVertex, setShowVertex] = useState(true);
  const [showRoots, setShowRoots] = useState(true);
  const [showFocus, setShowFocus] = useState(false);

  const safeA = Math.abs(a) < 0.05 ? 0 : a;
  const h = safeA !== 0 ? -b / (2 * safeA) : 0;
  const k = safeA !== 0 ? safeA * h * h + b * h + c : c;
  const disc = b * b - 4 * safeA * c;
  const roots = useMemo(() => {
    if (safeA === 0) return b !== 0 ? [-c / b] : [];
    if (disc < 0) return [];
    if (Math.abs(disc) < 1e-6) return [h];
    const sq = Math.sqrt(disc);
    return [(-b - sq) / (2 * safeA), (-b + sq) / (2 * safeA)];
  }, [safeA, b, c, disc, h]);

  const W = 720;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const scale = 34; // px per unit

  const toX = (x: number) => cx + x * scale;
  const toY = (y: number) => cy - y * scale;

  const pathD = useMemo(() => {
    const pts: string[] = [];
    for (let px = 0; px <= W; px += 3) {
      const x = (px - cx) / scale;
      const y = safeA * x * x + b * x + c;
      const py = toY(y);
      if (py >= -200 && py <= H + 200) {
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
      }
    }
    return pts.join(' ');
  }, [safeA, b, c]);

  const focusY = safeA !== 0 ? k + 1 / (4 * safeA) : 0;
  const directrixY = safeA !== 0 ? k - 1 / (4 * safeA) : 0;

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-slate-950 text-slate-100">
      <div className="relative flex flex-1 items-center justify-center p-4 overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          {/* Grid */}
          {Array.from({ length: 21 }, (_, i) => i - 10).map((n) => (
            <g key={`g-${n}`}>
              <line x1={toX(n)} y1={0} x2={toX(n)} y2={H} stroke={n === 0 ? '#64748b' : '#1e293b'} strokeWidth={n === 0 ? 2 : 1} />
              <line x1={0} y1={toY(n)} x2={W} y2={toY(n)} stroke={n === 0 ? '#64748b' : '#1e293b'} strokeWidth={n === 0 ? 2 : 1} />
              {n !== 0 && n % 2 === 0 && (
                <>
                  <text x={toX(n)} y={cy + 15} textAnchor="middle" fill="#94a3b8" fontSize="10">{n}</text>
                  <text x={cx - 12} y={toY(n) + 4} textAnchor="end" fill="#94a3b8" fontSize="10">{n}</text>
                </>
              )}
            </g>
          ))}
          <text x={W - 18} y={cy - 8} fill="#cbd5e1" fontSize="12" fontWeight="bold">x</text>
          <text x={cx + 10} y={18} fill="#cbd5e1" fontSize="12" fontWeight="bold">y</text>

          {/* Axis of symmetry */}
          {showAxis && safeA !== 0 && (
            <line x1={toX(h)} y1={0} x2={toX(h)} y2={H} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />
          )}

          {/* Directrix & Focus */}
          {showFocus && safeA !== 0 && (
            <>
              <line x1={0} y1={toY(directrixY)} x2={W} y2={toY(directrixY)} stroke="#ec4899" strokeWidth="1.8" strokeDasharray="5 4" />
              <circle cx={toX(h)} cy={toY(focusY)} r="6" fill="#ec4899" stroke="#fff" strokeWidth="2" />
              <text x={toX(h) + 10} y={toY(focusY) + 4} fill="#f472b6" fontSize="11" fontWeight="bold">
                Fokus ({h.toFixed(1)}, {focusY.toFixed(2)})
              </text>
            </>
          )}

          {/* Parabola Curve */}
          <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />

          {/* Roots */}
          {showRoots && roots.map((rx, idx) => (
            <g key={idx}>
              <circle cx={toX(rx)} cy={toY(0)} r="6.5" fill="#10b981" stroke="#fff" strokeWidth="2" />
              <text x={toX(rx)} y={toY(0) - 12} textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="bold">
                ({rx.toFixed(2)}, 0)
              </text>
            </g>
          ))}

          {/* Vertex */}
          {showVertex && safeA !== 0 && (
            <g>
              <circle cx={toX(h)} cy={toY(k)} r="7" fill="#f43f5e" stroke="#fff" strokeWidth="2" />
              <rect x={toX(h) + 10} y={toY(k) - 14} width="124" height="24" rx="6" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.2" />
              <text x={toX(h) + 72} y={toY(k) + 2} textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="bold">
                Puncak ({h.toFixed(1)}, {k.toFixed(1)})
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Controls */}
      <div className="flex w-full lg:w-80 shrink-0 flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/90 p-5 overflow-y-auto">
        <div className="rounded-2xl border border-sky-500/30 bg-sky-950/40 p-3.5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">Persamaan Kuadrat</div>
          <div className="mt-1 font-mono text-base font-bold text-white">
            y = {a.toFixed(1)}x² {b >= 0 ? '+' : '-'} {Math.abs(b).toFixed(1)}x {c >= 0 ? '+' : '-'} {Math.abs(c).toFixed(1)}
          </div>
          {safeA !== 0 && (
            <div className="mt-1 font-mono text-xs text-slate-300">
              Bentuk Puncak: {a.toFixed(1)}(x {h >= 0 ? '-' : '+'} {Math.abs(h).toFixed(1)})² {k >= 0 ? '+' : '-'} {Math.abs(k).toFixed(1)}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-xs">
            <div className="mb-1 flex justify-between"><span className="font-bold text-sky-300">Koefisien a (Bukaan)</span><span className="font-mono font-bold">{a.toFixed(1)}</span></div>
            <input type="range" min={-3} max={3} step={0.1} value={a} onChange={(e) => setA(Number(e.target.value))} className="w-full accent-sky-400" />
          </label>
          <label className="block text-xs">
            <div className="mb-1 flex justify-between"><span className="font-bold text-amber-300">Koefisien b (Geser Horizontal)</span><span className="font-mono font-bold">{b.toFixed(1)}</span></div>
            <input type="range" min={-8} max={8} step={0.2} value={b} onChange={(e) => setB(Number(e.target.value))} className="w-full accent-amber-400" />
          </label>
          <label className="block text-xs">
            <div className="mb-1 flex justify-between"><span className="font-bold text-emerald-300">Konstanta c (Potong Sumbu Y)</span><span className="font-mono font-bold">{c.toFixed(1)}</span></div>
            <input type="range" min={-6} max={6} step={0.2} value={c} onChange={(e) => setC(Number(e.target.value))} className="w-full accent-emerald-400" />
          </label>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-slate-400">Diskriminan (D = b²-4ac)</span><span className="font-mono font-bold text-white">{disc.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Sumbu Simetri</span><span className="font-mono font-bold text-amber-300">{safeA !== 0 ? `x = ${h.toFixed(2)}` : '-'}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Arah Bukaan</span><span className="font-semibold text-sky-300">{safeA > 0 ? 'Ke Atas (Minimum)' : safeA < 0 ? 'Ke Bawah (Maksimum)' : 'Garis Lurus'}</span></div>
        </div>

        <div className="space-y-1.5 text-xs">
          {[
            { label: 'Sumbu Simetri', val: showAxis, set: setShowAxis },
            { label: 'Titik Puncak (Vertex)', val: showVertex, set: setShowVertex },
            { label: 'Akar-akar (Potong Sumbu X)', val: showRoots, set: setShowRoots },
            { label: 'Fokus & Garis Direktris', val: showFocus, set: setShowFocus },
          ].map((item) => (
            <label key={item.label} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-1.5">
              <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)} className="accent-indigo-500" />
              <span>{item.label}</span>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => { setA(1); setB(-2); setC(-3); }}
          className="mt-auto rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold hover:bg-slate-700"
        >
          Reset Parameter
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. PENGENALAN PECAHAN (Fractions Intro)
 * ========================================================================== */
export const FractionsLab: React.FC = () => {
  const [num1, setNum1] = useState(2);
  const [den1, setDen1] = useState(4);
  const [num2, setNum2] = useState(3);
  const [den2, setDen2] = useState(6);
  const [mode, setMode] = useState<'pie' | 'bar' | 'beaker'>('pie');

  const val1 = num1 / den1;
  const val2 = num2 / den2;
  const isEquivalent = Math.abs(val1 - val2) < 1e-6;

  const renderShape = (num: number, den: number, color: string) => {
    const clampedNum = Math.min(num, den);
    if (mode === 'pie') {
      const slices = Array.from({ length: den }, (_, i) => {
        const a0 = (i / den) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
        const r = 82;
        const x0 = 100 + r * Math.cos(a0);
        const y0 = 100 + r * Math.sin(a0);
        const x1 = 100 + r * Math.cos(a1);
        const y1 = 100 + r * Math.sin(a1);
        const largeArc = a1 - a0 > Math.PI ? 1 : 0;
        const d = den === 1
          ? ''
          : `M 100 100 L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
        return { d, filled: i < clampedNum };
      });
      return (
        <svg viewBox="0 0 200 200" className="h-52 w-52">
          {den === 1 ? (
            <circle cx="100" cy="100" r="82" fill={clampedNum >= 1 ? color : '#1e293b'} stroke="#e2e8f0" strokeWidth="2.5" />
          ) : (
            slices.map((s, idx) => (
              <path key={idx} d={s.d} fill={s.filled ? color : '#1e293b'} stroke="#e2e8f0" strokeWidth="2" />
            ))
          )}
        </svg>
      );
    }
    if (mode === 'bar') {
      return (
        <div className="flex h-24 w-64 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-800">
          {Array.from({ length: den }, (_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-slate-300/60 last:border-r-0 transition-colors"
              style={{ backgroundColor: i < clampedNum ? color : '#1e293b' }}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="relative flex h-52 w-32 flex-col-reverse overflow-hidden rounded-b-2xl border-2 border-t-0 border-slate-300 bg-slate-800/80">
        {Array.from({ length: den }, (_, i) => (
          <div
            key={i}
            className="flex-1 border-t border-slate-300/40 transition-colors"
            style={{ backgroundColor: i < clampedNum ? color : 'transparent' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-between bg-slate-950 p-6 text-slate-100 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
        {(['pie', 'bar', 'beaker'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {m === 'pie' ? 'Diagram Lingkaran' : m === 'bar' ? 'Batang Persegi' : 'Gelas Ukur'}
          </button>
        ))}
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 md:grid-cols-3 items-center gap-6 my-4">
        {/* Fraction A */}
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400">Pecahan A</div>
          {renderShape(num1, den1, '#38bdf8')}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setNum1(Math.max(0, num1 - 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">-</button>
                <span className="w-8 text-center font-mono text-2xl font-bold text-sky-300">{num1}</span>
                <button type="button" onClick={() => setNum1(Math.min(den1, num1 + 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">+</button>
              </div>
              <div className="my-1.5 h-0.5 w-20 bg-slate-400" />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { const nd = Math.max(1, den1 - 1); setDen1(nd); setNum1(Math.min(num1, nd)); }} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">-</button>
                <span className="w-8 text-center font-mono text-2xl font-bold text-white">{den1}</span>
                <button type="button" onClick={() => setDen1(Math.min(12, den1 + 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">+</button>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            = {val1.toFixed(3)} ({(val1 * 100).toFixed(1)}%)
          </div>
        </div>

        {/* Comparison Badge */}
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl font-black shadow-xl ${isEquivalent ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'}`}>
            {isEquivalent ? '=' : val1 > val2 ? '>' : '<'}
          </div>
          <div className={`rounded-full px-4 py-1.5 text-xs font-bold ${isEquivalent ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
            {isEquivalent ? 'Pecahan Senilai!' : val1 > val2 ? 'Pecahan A Lebih Besar' : 'Pecahan B Lebih Besar'}
          </div>
        </div>

        {/* Fraction B */}
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Pecahan B</div>
          {renderShape(num2, den2, '#10b981')}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setNum2(Math.max(0, num2 - 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">-</button>
                <span className="w-8 text-center font-mono text-2xl font-bold text-emerald-300">{num2}</span>
                <button type="button" onClick={() => setNum2(Math.min(den2, num2 + 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">+</button>
              </div>
              <div className="my-1.5 h-0.5 w-20 bg-slate-400" />
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { const nd = Math.max(1, den2 - 1); setDen2(nd); setNum2(Math.min(num2, nd)); }} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">-</button>
                <span className="w-8 text-center font-mono text-2xl font-bold text-white">{den2}</span>
                <button type="button" onClick={() => setDen2(Math.min(12, den2 + 1))} className="h-7 w-7 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">+</button>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            = {val2.toFixed(3)} ({(val2 * 100).toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Number Line */}
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-2 text-xs font-bold text-slate-400">Garis Bilangan (0 sampai 1)</div>
        <div className="relative h-12 w-full">
          <div className="absolute top-6 left-4 right-4 h-1 rounded bg-slate-700" />
          <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-400">0</div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-400">0.5</div>
          <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-400">1</div>
          <div
            className="absolute top-2.5 h-4 w-4 -translate-x-1/2 rounded-full bg-sky-400 ring-2 ring-white transition-all"
            style={{ left: `calc(16px + ${val1 * 100}% * 0.96)` }}
            title={`A: ${num1}/${den1}`}
          />
          <div
            className="absolute top-6 h-4 w-4 -translate-x-1/2 rounded-full bg-emerald-400 ring-2 ring-white transition-all"
            style={{ left: `calc(16px + ${val2 * 100}% * 0.96)` }}
            title={`B: ${num2}/${den2}`}
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. PEMBANGUN LUAS & KELILING (Area Builder)
 * ========================================================================== */
export const AreaBuilderLab: React.FC = () => {
  const ROWS = 10;
  const COLS = 14;
  const [cells, setCells] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (let r = 3; r < 6; r++) for (let c = 4; c < 8; c++) s.add(`${r},${c}`);
    return s;
  });

  const toggle = (r: number, c: number) => {
    setCells((prev) => {
      const next = new Set(prev);
      const k = `${r},${c}`;
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const { area, perimeter } = useMemo(() => {
    let p = 0;
    cells.forEach((k) => {
      const [r, c] = k.split(',').map(Number);
      if (!cells.has(`${r - 1},${c}`)) p++;
      if (!cells.has(`${r + 1},${c}`)) p++;
      if (!cells.has(`${r},${c - 1}`)) p++;
      if (!cells.has(`${r},${c + 1}`)) p++;
    });
    return { area: cells.size, perimeter: p };
  }, [cells]);

  const loadPreset = (kind: '3x4' | '2x6' | '1x12' | 'L') => {
    const s = new Set<string>();
    if (kind === '3x4') for (let r = 3; r < 6; r++) for (let c = 5; c < 9; c++) s.add(`${r},${c}`);
    if (kind === '2x6') for (let r = 4; r < 6; r++) for (let c = 4; c < 10; c++) s.add(`${r},${c}`);
    if (kind === '1x12') for (let c = 1; c < 13; c++) s.add(`4,${c}`);
    if (kind === 'L') {
      for (let r = 2; r < 8; r++) { s.add(`${r},4`); s.add(`${r},5`); }
      for (let c = 6; c < 9; c++) { s.add(`6,${c}`); s.add(`7,${c}`); }
    }
    setCells(s);
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-slate-950 p-6 text-slate-100">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/50 px-5 py-2.5 text-center">
          <div className="text-[11px] font-bold uppercase text-emerald-400">Luas (Area)</div>
          <div className="font-mono text-2xl font-black text-white">{area} <span className="text-xs font-normal text-slate-300">satuan²</span></div>
        </div>
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/50 px-5 py-2.5 text-center">
          <div className="text-[11px] font-bold uppercase text-amber-400">Keliling (Perimeter)</div>
          <div className="font-mono text-2xl font-black text-white">{perimeter} <span className="text-xs font-normal text-slate-300">satuan</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => loadPreset('3x4')} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700">3×4 (Luas 12)</button>
          <button type="button" onClick={() => loadPreset('2x6')} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700">2×6 (Luas 12)</button>
          <button type="button" onClick={() => loadPreset('1x12')} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700">1×12 (Luas 12)</button>
          <button type="button" onClick={() => loadPreset('L')} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700">Bentuk L</button>
          <button type="button" onClick={() => setCells(new Set())} className="rounded-xl bg-rose-900/60 border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-800">Bersihkan</button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-2 text-center text-xs text-slate-400">Klik petak satuan di bawah untuk menambah atau menghapus persegi</div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const active = cells.has(`${r},${c}`);
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => toggle(r, c)}
                  className={`h-10 w-10 rounded-md border transition-all ${
                    active
                      ? 'border-amber-300 bg-emerald-500 shadow-inner scale-[0.98]'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'
                  }`}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. PELUANG PLINKO (Plinko Probability)
 * ========================================================================== */
export const PlinkoLab: React.FC = () => {
  const [rows, setRows] = useState(8);
  const [probRight, setProbRight] = useState(0.5);
  const [bins, setBins] = useState<number[]>(() => Array(9).fill(0));
  const [lastPath, setLastPath] = useState<number[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setBins(Array(rows + 1).fill(0));
    setLastPath([]);
  }, [rows]);

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const dropBalls = (count: number) => {
    const next = [...bins];
    let path: number[] = [0];
    for (let b = 0; b < count; b++) {
      let col = 0;
      const curPath = [0];
      for (let r = 0; r < rows; r++) {
        if (Math.random() < probRight) col++;
        curPath.push(col);
      }
      next[col] = (next[col] ?? 0) + 1;
      if (b === count - 1) path = curPath;
    }
    setBins(next);
    setLastPath(path);
  };

  const total = bins.reduce((a, b) => a + b, 0);
  const maxBin = Math.max(1, ...bins);

  // Theoretical binomial PMF
  const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
  const theoretical = useMemo(() => {
    return Array.from({ length: rows + 1 }, (_, k) => {
      const comb = fact(rows) / (fact(k) * fact(rows - k));
      return comb * Math.pow(probRight, k) * Math.pow(1 - probRight, rows - k);
    });
  }, [rows, probRight]);

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-slate-950 text-slate-100">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5">
        <svg viewBox="0 0 640 420" className="h-full max-h-[540px] w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900">
          {/* Pegs */}
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: r + 1 }, (_, c) => {
              const x = 320 + (c - r / 2) * 44;
              const y = 36 + r * 26;
              return <circle key={`${r}-${c}`} cx={x} cy={y} r="5" fill="#94a3b8" />;
            }),
          )}

          {/* Last ball trajectory */}
          {lastPath.length > 1 && (
            <polyline
              fill="none"
              stroke="#f43f5e"
              strokeWidth="3"
              strokeLinejoin="round"
              points={lastPath
                .map((col, r) => `${320 + (col - r / 2) * 44},${24 + r * 26}`)
                .join(' ')}
            />
          )}

          {/* Histogram Bins */}
          {bins.map((count, i) => {
            const x = 320 + (i - rows / 2) * 44;
            const barH = total > 0 ? (count / maxBin) * 125 : 0;
            const theoH = total > 0 ? (theoretical[i] * total / maxBin) * 125 : 0;
            return (
              <g key={i}>
                <rect x={x - 16} y={390 - barH} width="32" height={barH} rx="4" fill="#38bdf8" />
                {total > 0 && (
                  <line x1={x - 18} y1={390 - theoH} x2={x + 18} y2={390 - theoH} stroke="#f59e0b" strokeWidth="2.5" />
                )}
                <text x={x} y={408} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontWeight="bold">{i}</text>
                {count > 0 && (
                  <text x={x} y={384 - barH} textAnchor="middle" fill="#7dd3fc" fontSize="10">{count}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex w-full lg:w-80 shrink-0 flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
          <div className="text-[11px] uppercase text-slate-400">Total Percobaan Bola</div>
          <div className="font-mono text-3xl font-black text-sky-400">{total}</div>
          <div className="mt-1 text-[11px] text-amber-300">Garis kuning = Kurva Binomial Teoretis</div>
        </div>

        <label className="text-xs">
          <div className="mb-1 flex justify-between font-bold"><span>Jumlah Baris Paku (n)</span><span>{rows}</span></div>
          <input type="range" min={4} max={10} step={1} value={rows} onChange={(e) => setRows(Number(e.target.value))} className="w-full accent-sky-400" />
        </label>
        <label className="text-xs">
          <div className="mb-1 flex justify-between font-bold"><span>Peluang Belok Kanan (p)</span><span>{probRight.toFixed(2)}</span></div>
          <input type="range" min={0.1} max={0.9} step={0.05} value={probRight} onChange={(e) => setProbRight(Number(e.target.value))} className="w-full accent-indigo-400" />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => dropBalls(1)} className="rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white hover:bg-sky-500">Jatuhkan 1 Bola</button>
          <button type="button" onClick={() => dropBalls(10)} className="rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500">Jatuhkan 10 Bola</button>
          <button type="button" onClick={() => dropBalls(100)} className="col-span-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500">Jatuhkan 100 Bola Sekaligus</button>
        </div>

        <button type="button" onClick={() => { setBins(Array(rows + 1).fill(0)); setLastPath([]); }} className="mt-auto rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold hover:bg-slate-700">
          Reset Histogram
        </button>
      </div>
    </div>
  );
};
