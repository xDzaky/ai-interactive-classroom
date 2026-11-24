/**
 * ChemistryLabs.tsx — 3 Native Full-Screen Interactive Chemistry Virtual Labs
 * Owned by AI Interactive Classroom — freely customizable.
 */
import React, { useMemo, useState } from 'react';

/* ============================================================================
 * 9. SKALA pH & PENGENCERAN (pH Scale — Macro & Micro Ion View)
 * ========================================================================== */
interface SolutionPreset {
  id: string;
  name: string;
  basePh: number;
  color: string;
}

const SOLUTIONS: SolutionPreset[] = [
  { id: 'battery', name: 'Asam Baterai', basePh: 1.0, color: '#ef4444' },
  { id: 'stomach', name: 'Asam Lambung', basePh: 2.0, color: '#f97316' },
  { id: 'orange', name: 'Jus Jeruk', basePh: 3.5, color: '#fb923c' },
  { id: 'coffee', name: 'Kopi', basePh: 5.0, color: '#78350f' },
  { id: 'milk', name: 'Susu', basePh: 6.5, color: '#e2e8f0' },
  { id: 'water', name: 'Air Murni', basePh: 7.0, color: '#38bdf8' },
  { id: 'blood', name: 'Darah', basePh: 7.4, color: '#dc2626' },
  { id: 'soap', name: 'Sabun Tangan', basePh: 10.0, color: '#a855f7' },
  { id: 'drain', name: 'Pembersih Saluran', basePh: 13.0, color: '#14b8a6' },
];

export const PhScaleLab: React.FC = () => {
  const [solution, setSolution] = useState<SolutionPreset>(SOLUTIONS[0]);
  const [solVol, setSolVol] = useState(0.5); // Liters
  const [waterVol, setWaterVol] = useState(0.0); // Liters
  const [viewMode, setViewMode] = useState<'macro' | 'micro'>('macro');

  const totalVol = Math.max(0.05, solVol + waterVol);

  // Real physical logarithmic dilution math toward neutral pH 7.0
  const { ph, h3o, oh } = useMemo(() => {
    const baseH = Math.pow(10, -solution.basePh);
    const baseOH = Math.pow(10, -(14 - solution.basePh));
    const waterConc = 1e-7;

    let finalH: number;
    let finalOH: number;
    if (solution.basePh < 7) {
      finalH = (baseH * solVol + waterConc * waterVol) / totalVol;
      finalOH = 1e-14 / finalH;
    } else if (solution.basePh > 7) {
      finalOH = (baseOH * solVol + waterConc * waterVol) / totalVol;
      finalH = 1e-14 / finalOH;
    } else {
      finalH = 1e-7;
      finalOH = 1e-7;
    }
    const calcPh = Math.max(0, Math.min(14, -Math.log10(finalH)));
    return { ph: calcPh, h3o: finalH, oh: finalOH };
  }, [solution, solVol, waterVol, totalVol]);

  const fillPercent = Math.min(100, (totalVol / 1.2) * 100);
  const phLabel = ph < 6.8 ? 'ASAM' : ph > 7.2 ? 'BASA' : 'NETRAL';
  const phColor = ph < 6.8 ? '#f43f5e' : ph > 7.2 ? '#38bdf8' : '#10b981';

  const microIons = useMemo(() => {
    const hCount = Math.max(2, Math.min(28, Math.round((14 - ph) * 2)));
    const ohCount = Math.max(2, Math.min(28, Math.round(ph * 2)));
    return { hCount, ohCount };
  }, [ph]);

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-slate-950 text-slate-100">
      {/* Main Beaker & pH Meter Stage */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setViewMode('macro')} className={`rounded-xl px-4 py-2 text-xs font-bold ${viewMode === 'macro' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            Mode Makro
          </button>
          <button type="button" onClick={() => setViewMode('micro')} className={`rounded-xl px-4 py-2 text-xs font-bold ${viewMode === 'micro' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            Mode Mikro (Ion H₃O⁺ / OH⁻)
          </button>
        </div>

        <div className="flex w-full max-w-4xl flex-col md:flex-row items-center justify-center gap-8 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          {/* pH Scale Gauge */}
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-2xl border-2 px-5 py-3 text-center" style={{ borderColor: phColor, backgroundColor: '#0f172a' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">pH Meter Digital</div>
              <div className="font-mono text-4xl font-black" style={{ color: phColor }}>{ph.toFixed(2)}</div>
              <div className="mt-0.5 text-xs font-bold" style={{ color: phColor }}>{phLabel}</div>
            </div>

            <div className="relative mt-2 flex h-56 w-12 flex-col-reverse overflow-hidden rounded-full border border-slate-700">
              {Array.from({ length: 15 }, (_, i) => (
                <div
                  key={i}
                  className="flex flex-1 items-center justify-center text-[9px] font-bold text-slate-950"
                  style={{
                    backgroundColor: `hsl(${Math.round((i / 14) * 240)}, 85%, 58%)`,
                  }}
                >
                  {i}
                </div>
              ))}
              <div
                className="absolute left-0 right-0 h-1.5 bg-white shadow-[0_0_8px_#fff] transition-all"
                style={{ bottom: `${(ph / 14) * 100}%` }}
              />
            </div>
          </div>

          {/* Interactive Beaker */}
          <div className="flex flex-col items-center">
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setWaterVol((v) => Math.min(1.2 - solVol, +(v + 0.1).toFixed(2)))}
                className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-sky-500"
              >
                + Tambah Air (0.1 L)
              </button>
              <button
                type="button"
                onClick={() => {
                  const ratio = solVol / totalVol;
                  const newTotal = Math.max(0.1, totalVol - 0.15);
                  setSolVol(+(newTotal * ratio).toFixed(2));
                  setWaterVol(+(newTotal * (1 - ratio)).toFixed(2));
                }}
                className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                − Buang Larutan
              </button>
            </div>

            <div className="relative flex h-72 w-64 flex-col justify-end overflow-hidden rounded-b-3xl border-4 border-t-0 border-slate-400/70 bg-slate-950/60">
              {/* Liquid fill */}
              <div
                className="relative w-full transition-all duration-300"
                style={{
                  height: `${fillPercent}%`,
                  backgroundColor: solution.color,
                  opacity: Math.max(0.35, 0.85 - waterVol * 0.35),
                }}
              >
                {viewMode === 'micro' && (
                  <div className="absolute inset-0 overflow-hidden p-3">
                    {Array.from({ length: microIons.hCount }, (_, i) => (
                      <span
                        key={`h-${i}`}
                        className="absolute inline-block h-3.5 w-3.5 rounded-full bg-rose-500 ring-1 ring-white"
                        style={{ left: `${(i * 37) % 88 + 5}%`, top: `${(i * 53) % 82 + 8}%` }}
                        title="H₃O⁺"
                      />
                    ))}
                    {Array.from({ length: microIons.ohCount }, (_, i) => (
                      <span
                        key={`oh-${i}`}
                        className="absolute inline-block h-3.5 w-3.5 rounded-full bg-sky-400 ring-1 ring-white"
                        style={{ left: `${(i * 43 + 17) % 88 + 5}%`, top: `${(i * 29 + 11) % 82 + 8}%` }}
                        title="OH⁻"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Volume markings */}
              <div className="pointer-events-none absolute inset-y-2 right-2 flex flex-col justify-between text-[10px] font-mono text-slate-300">
                <span>1.2 L</span>
                <span>0.8 L</span>
                <span>0.4 L</span>
                <span>0.0 L</span>
              </div>
            </div>

            <div className="mt-2 font-mono text-xs text-slate-300">
              Volume Total: <strong>{totalVol.toFixed(2)} L</strong> (Larutan {solVol.toFixed(2)} L + Air {waterVol.toFixed(2)} L)
            </div>
          </div>

          {/* Ion Concentration Bars */}
          <div className="w-56 space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs">
            <div className="font-bold text-slate-300">Konsentrasi Ion (mol/L)</div>
            <div>
              <div className="flex justify-between text-rose-400 font-mono"><span>[H₃O⁺]</span><span>{h3o.toExponential(2)}</span></div>
              <div className="mt-1 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500 transition-all" style={{ width: `${Math.max(4, ((14 - ph) / 14) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sky-400 font-mono"><span>[OH⁻]</span><span>{oh.toExponential(2)}</span></div>
              <div className="mt-1 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.max(4, (ph / 14) * 100)}%` }} />
              </div>
            </div>
            <div className="pt-2 text-[11px] text-slate-400">
              {viewMode === 'micro' ? 'Merah = ion H₃O⁺ (Asam) · Biru = ion OH⁻ (Basa)' : 'Tambahkan air untuk melihat pH mendekati netral (7.00).'}
            </div>
          </div>
        </div>
      </div>

      {/* Solution Picker Sidebar */}
      <div className="flex w-full lg:w-72 shrink-0 flex-col gap-2 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 p-4 overflow-y-auto">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Pilih Larutan Uji</div>
        {SOLUTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => { setSolution(s); setSolVol(0.5); setWaterVol(0); }}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              solution.id === s.id
                ? 'border-indigo-400 bg-indigo-950/60 text-white'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
            <span className="font-mono text-[11px] text-slate-400">pH {s.basePh.toFixed(1)}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setSolVol(0.5); setWaterVol(0); }}
          className="mt-auto rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-semibold hover:bg-slate-700"
        >
          Reset Larutan
        </button>
      </div>
    </div>
  );
};

/* ============================================================================
 * 10. SUSUN ATOM (Build an Atom — Bohr Model)
 * ========================================================================== */
const ELEMENTS = [
  { z: 0, sym: '?', name: 'Kosong' },
  { z: 1, sym: 'H', name: 'Hidrogen' },
  { z: 2, sym: 'He', name: 'Helium' },
  { z: 3, sym: 'Li', name: 'Litium' },
  { z: 4, sym: 'Be', name: 'Berilium' },
  { z: 5, sym: 'B', name: 'Boron' },
  { z: 6, sym: 'C', name: 'Karbon' },
  { z: 7, sym: 'N', name: 'Nitrogen' },
  { z: 8, sym: 'O', name: 'Oksigen' },
  { z: 9, sym: 'F', name: 'Fluorin' },
  { z: 10, sym: 'Ne', name: 'Neon' },
];

export const BuildAtomLab: React.FC = () => {
  const [protons, setProtons] = useState(6);
  const [neutrons, setNeutrons] = useState(6);
  const [electrons, setElectrons] = useState(6);

  const el = ELEMENTS[protons] ?? ELEMENTS[0];
  const charge = protons - electrons;
  const massNumber = protons + neutrons;
  const stable = protons === 0 || (protons === 1 && neutrons <= 1) || Math.abs(neutrons - protons) <= 1;

  const innerElectrons = Math.min(2, electrons);
  const outerElectrons = Math.max(0, electrons - 2);

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-slate-950 text-slate-100">
      <div className="flex flex-1 items-center justify-center p-6">
        <svg viewBox="0 0 460 460" className="h-full max-h-[520px] w-full max-w-[520px] rounded-3xl border border-slate-800 bg-slate-900">
          {/* Shells */}
          <circle cx="230" cy="230" r="105" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="6 5" />
          <circle cx="230" cy="230" r="175" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="6 5" />

          {/* Nucleus particles */}
          {Array.from({ length: protons + neutrons }, (_, i) => {
            const isProton = i < protons;
            const angle = i * 2.39996;
            const rad = Math.sqrt(i) * 8.5;
            return (
              <circle
                key={i}
                cx={230 + Math.cos(angle) * rad}
                cy={230 + Math.sin(angle) * rad}
                r="10"
                fill={isProton ? '#ef4444' : '#94a3b8'}
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Inner shell electrons */}
          {Array.from({ length: innerElectrons }, (_, i) => {
            const a = (i / Math.max(1, innerElectrons)) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle key={`in-${i}`} cx={230 + Math.cos(a) * 105} cy={230 + Math.sin(a) * 105} r="8" fill="#38bdf8" stroke="#fff" strokeWidth="2" />
            );
          })}

          {/* Outer shell electrons */}
          {Array.from({ length: outerElectrons }, (_, i) => {
            const a = (i / Math.max(1, outerElectrons)) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle key={`out-${i}`} cx={230 + Math.cos(a) * 175} cy={230 + Math.sin(a) * 175} r="8" fill="#38bdf8" stroke="#fff" strokeWidth="2" />
            );
          })}
        </svg>
      </div>

      <div className="flex w-full lg:w-80 shrink-0 flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center justify-between rounded-2xl border border-indigo-500/40 bg-slate-950 p-4">
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2">
            <span className="text-[10px] font-mono text-slate-400">Z = {protons}</span>
            <span className="text-3xl font-black text-white">{el.sym}</span>
            <span className="text-[10px] font-mono text-slate-400">A = {massNumber}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{el.name}</div>
            <div className={`text-xs font-bold ${charge === 0 ? 'text-emerald-400' : charge > 0 ? 'text-rose-400' : 'text-sky-400'}`}>
              {charge === 0 ? 'Atom Netral (0)' : charge > 0 ? `Ion Positif (+${charge})` : `Ion Negatif (${charge})`}
            </div>
            <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${stable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {stable ? 'Inti Stabil' : 'Inti Tidak Stabil'}
            </div>
          </div>
        </div>

        {[
          { label: 'Proton (+)', color: 'text-rose-400', val: protons, set: setProtons, max: 10 },
          { label: 'Neutron (0)', color: 'text-slate-300', val: neutrons, set: setNeutrons, max: 12 },
          { label: 'Elektron (−)', color: 'text-sky-400', val: electrons, set: setElectrons, max: 10 },
        ].map((p) => (
          <div key={p.label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
            <span className={`text-xs font-bold ${p.color}`}>{p.label}</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => p.set(Math.max(0, p.val - 1))} className="h-8 w-8 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">-</button>
              <span className="w-6 text-center font-mono text-lg font-black">{p.val}</span>
              <button type="button" onClick={() => p.set(Math.min(p.max, p.val + 1))} className="h-8 w-8 rounded-lg bg-slate-800 font-bold hover:bg-slate-700">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
 * 11. PENYETARAAN REAKSI KIMIA (Balancing Chemical Equations)
 * ========================================================================== */
interface ReactionSpec {
  id: string;
  title: string;
  lhs: Array<{ formula: string; atoms: Record<string, number> }>;
  rhs: Array<{ formula: string; atoms: Record<string, number> }>;
  elements: string[];
}

const REACTIONS: ReactionSpec[] = [
  {
    id: 'water',
    title: 'Pembentukan Air',
    lhs: [{ formula: 'H₂', atoms: { H: 2 } }, { formula: 'O₂', atoms: { O: 2 } }],
    rhs: [{ formula: 'H₂O', atoms: { H: 2, O: 1 } }],
    elements: ['H', 'O'],
  },
  {
    id: 'ammonia',
    title: 'Sintesis Amonia',
    lhs: [{ formula: 'N₂', atoms: { N: 2 } }, { formula: 'H₂', atoms: { H: 2 } }],
    rhs: [{ formula: 'NH₃', atoms: { N: 1, H: 3 } }],
    elements: ['N', 'H'],
  },
  {
    id: 'methane',
    title: 'Pembakaran Metana',
    lhs: [{ formula: 'CH₄', atoms: { C: 1, H: 4 } }, { formula: 'O₂', atoms: { O: 2 } }],
    rhs: [{ formula: 'CO₂', atoms: { C: 1, O: 2 } }, { formula: 'H₂O', atoms: { H: 2, O: 1 } }],
    elements: ['C', 'H', 'O'],
  },
];

export const BalancingEquationsLab: React.FC = () => {
  const [rxIdx, setRxIdx] = useState(0);
  const rx = REACTIONS[rxIdx];
  const [lCoefs, setLCoefs] = useState<number[]>([1, 1]);
  const [rCoefs, setRCoefs] = useState<number[]>([1, 1]);

  const countSide = (side: ReactionSpec['lhs'], coefs: number[]) => {
    const totals: Record<string, number> = {};
    side.forEach((mol, i) => {
      const c = coefs[i] ?? 1;
      Object.entries(mol.atoms).forEach(([el, n]) => {
        totals[el] = (totals[el] ?? 0) + n * c;
      });
    });
    return totals;
  };

  const leftCounts = countSide(rx.lhs, lCoefs);
  const rightCounts = countSide(rx.rhs, rCoefs);
  const isBalanced = rx.elements.every((el) => (leftCounts[el] ?? 0) > 0 && leftCounts[el] === rightCounts[el]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-slate-950 p-6 text-slate-100">
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { setRxIdx(i); setLCoefs([1, 1]); setRCoefs([1, 1]); }}
            className={`rounded-xl px-4 py-2 text-xs font-bold ${rxIdx === i ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {r.title}
          </button>
        ))}
      </div>

      {/* Equation Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 px-8 py-6">
        {rx.lhs.map((m, i) => (
          <React.Fragment key={m.formula}>
            {i > 0 && <span className="text-2xl font-bold text-slate-500">+</span>}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2">
              <button type="button" onClick={() => setLCoefs((c) => c.map((v, idx) => idx === i ? Math.max(1, v - 1) : v))} className="h-7 w-7 rounded bg-slate-800 font-bold">-</button>
              <span className="w-6 text-center font-mono text-2xl font-black text-sky-400">{lCoefs[i]}</span>
              <button type="button" onClick={() => setLCoefs((c) => c.map((v, idx) => idx === i ? Math.min(8, v + 1) : v))} className="h-7 w-7 rounded bg-slate-800 font-bold">+</button>
              <span className="ml-1 font-mono text-2xl font-bold text-white">{m.formula}</span>
            </div>
          </React.Fragment>
        ))}

        <span className="text-3xl font-black text-amber-400">→</span>

        {rx.rhs.map((m, i) => (
          <React.Fragment key={m.formula}>
            {i > 0 && <span className="text-2xl font-bold text-slate-500">+</span>}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2">
              <button type="button" onClick={() => setRCoefs((c) => c.map((v, idx) => idx === i ? Math.max(1, v - 1) : v))} className="h-7 w-7 rounded bg-slate-800 font-bold">-</button>
              <span className="w-6 text-center font-mono text-2xl font-black text-emerald-400">{rCoefs[i]}</span>
              <button type="button" onClick={() => setRCoefs((c) => c.map((v, idx) => idx === i ? Math.min(8, v + 1) : v))} className="h-7 w-7 rounded bg-slate-800 font-bold">+</button>
              <span className="ml-1 font-mono text-2xl font-bold text-white">{m.formula}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Balance Status */}
      <div className={`rounded-full px-6 py-2 text-sm font-bold ${isBalanced ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400' : 'bg-amber-500/20 text-amber-300 border border-amber-400'}`}>
        {isBalanced ? 'Persamaan Reaksi Sudah Setara! (Hukum Kekekalan Massa Terpenuhi)' : 'Belum Setara — Sesuaikan koefisien di kiri dan kanan'}
      </div>

      {/* Atom Count Comparison */}
      <div className="grid w-full max-w-2xl grid-cols-1 md:grid-cols-3 gap-4">
        {rx.elements.map((el) => {
          const l = leftCounts[el] ?? 0;
          const r = rightCounts[el] ?? 0;
          const eq = l === r;
          return (
            <div key={el} className={`rounded-2xl border p-4 text-center ${eq ? 'border-emerald-500/40 bg-emerald-950/30' : 'border-rose-500/40 bg-rose-950/30'}`}>
              <div className="text-lg font-black text-white">Atom {el}</div>
              <div className="mt-2 flex items-center justify-around font-mono text-xl font-bold">
                <span className="text-sky-300">Kiri: {l}</span>
                <span>{eq ? '=' : '≠'}</span>
                <span className="text-emerald-300">Kanan: {r}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
