/**
 * BiologyLabs.tsx — Native Full-Screen Interactive Biology Virtual Lab
 * Owned by AI Interactive Classroom — freely customizable.
 */
import React, { useState } from 'react';

interface GenerationPoint {
  gen: number;
  white: number;
  brown: number;
}

export const NaturalSelectionLab: React.FC = () => {
  const [habitat, setHabitat] = useState<'arctic' | 'equator'>('arctic');
  const [wolves, setWolves] = useState(true);
  const [history, setHistory] = useState<GenerationPoint[]>([
    { gen: 0, white: 8, brown: 8 },
  ]);

  const current = history[history.length - 1];

  const advanceGeneration = () => {
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      let nextWhite = last.white;
      let nextBrown = last.brown;

      // Survival probabilities based on camouflage in habitat when predators exist
      const whiteSurv = wolves ? (habitat === 'arctic' ? 0.92 : 0.42) : 0.9;
      const brownSurv = wolves ? (habitat === 'equator' ? 0.92 : 0.42) : 0.9;

      // Reproduce + select (capped at 60 total for carrying capacity)
      nextWhite = Math.max(0, Math.round(nextWhite * 1.65 * whiteSurv));
      nextBrown = Math.max(0, Math.round(nextBrown * 1.65 * brownSurv));

      const total = nextWhite + nextBrown;
      if (total > 60) {
        nextWhite = Math.round((nextWhite / total) * 60);
        nextBrown = Math.round((nextBrown / total) * 60);
      }

      return [...prev.slice(-11), { gen: last.gen + 1, white: nextWhite, brown: nextBrown }];
    });
  };

  const reset = () => setHistory([{ gen: 0, white: 8, brown: 8 }]);

  const bgGradient =
    habitat === 'arctic'
      ? 'from-sky-100 via-slate-100 to-blue-200'
      : 'from-amber-800 via-amber-900 to-stone-900';

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-slate-950 text-slate-100">
      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Visual Habitat Field */}
        <div className={`relative flex-1 min-h-[260px] overflow-hidden rounded-3xl border border-slate-700 bg-gradient-to-b ${bgGradient} p-4 shadow-2xl`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/75 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
            <span>Generasi {current.gen}</span>
            <span>·</span>
            <span>{habitat === 'arctic' ? 'Habitat Salju Arktik' : 'Habitat Tanah Ekuator'}</span>
            {wolves && <span>· Serigala Predator Aktif</span>}
          </div>

          {/* White Rabbits */}
          {Array.from({ length: Math.min(30, current.white) }, (_, i) => (
            <div
              key={`w-${i}`}
              className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs shadow ring-1 ring-slate-300"
              style={{
                left: `${(i * 29 + 7) % 88 + 4}%`,
                top: `${(i * 41 + 19) % 72 + 18}%`,
              }}
              title="Kelinci Bulu Putih"
            >
              🐇
            </div>
          ))}

          {/* Brown Rabbits */}
          {Array.from({ length: Math.min(30, current.brown) }, (_, i) => (
            <div
              key={`b-${i}`}
              className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-amber-900 text-xs shadow ring-1 ring-amber-400"
              style={{
                left: `${(i * 37 + 15) % 88 + 4}%`,
                top: `${(i * 53 + 23) % 72 + 18}%`,
              }}
              title="Kelinci Bulu Cokelat"
            >
              🐰
            </div>
          ))}
        </div>

        {/* Real-time Population Graph */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">Grafik Populasi per Generasi</span>
            <div className="flex gap-4 font-mono">
              <span className="text-sky-300">● Bulu Putih: {current.white}</span>
              <span className="text-amber-400">● Bulu Cokelat: {current.brown}</span>
            </div>
          </div>
          <svg viewBox="0 0 600 120" className="h-28 w-full">
            <line x1="20" y1="105" x2="580" y2="105" stroke="#334155" />
            <polyline
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="3"
              points={history
                .map((p, idx) => `${20 + (idx / Math.max(1, history.length - 1)) * 560},${105 - (p.white / 60) * 90}`)
                .join(' ')}
            />
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              points={history
                .map((p, idx) => `${20 + (idx / Math.max(1, history.length - 1)) * 560},${105 - (p.brown / 60) * 90}`)
                .join(' ')}
            />
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="flex w-full lg:w-76 shrink-0 flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 p-5 text-xs">
        <div>
          <div className="mb-2 font-bold uppercase tracking-wider text-slate-400">Lingkungan / Habitat</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setHabitat('arctic')} className={`rounded-xl py-2.5 font-bold ${habitat === 'arctic' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Salju (Arktik)
            </button>
            <button type="button" onClick={() => setHabitat('equator')} className={`rounded-xl py-2.5 font-bold ${habitat === 'equator' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
              Tanah (Ekuator)
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-3 font-bold">
          <span>Faktor Seleksi: Serigala Predator</span>
          <input type="checkbox" checked={wolves} onChange={(e) => setWolves(e.target.checked)} className="accent-rose-500 h-4 w-4" />
        </label>

        <button
          type="button"
          onClick={advanceGeneration}
          className="rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500"
        >
          Lanjut Generasi Berikutnya →
        </button>

        <button
          type="button"
          onClick={reset}
          className="mt-auto rounded-xl border border-slate-700 bg-slate-800 py-2 font-semibold hover:bg-slate-700"
        >
          Reset Populasi Awal (8 Putih, 8 Cokelat)
        </button>
      </div>
    </div>
  );
};
