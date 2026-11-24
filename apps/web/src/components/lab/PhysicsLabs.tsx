/**
 * PhysicsLabs.tsx — 4 Native Full-Screen Interactive Physics Virtual Labs
 * Owned by AI Interactive Classroom — freely customizable.
 */
import React, { useEffect, useRef, useState } from 'react';

/* ============================================================================
 * 5. LAB GAYA GRAVITASI (Gravity Force Lab)
 * ========================================================================== */
export const GravityForceLab: React.FC = () => {
  const [m1, setM1] = useState(200); // kg
  const [m2, setM2] = useState(400); // kg
  const [distance, setDistance] = useState(4); // m

  const G = 6.674e-11;
  const force = (G * m1 * m2) / (distance * distance);
  const arrowLen = Math.min(180, Math.max(24, (force / 1e-6) * 28));
  const r1 = 18 + Math.cbrt(m1) * 4.5;
  const r2 = 18 + Math.cbrt(m2) * 4.5;
  const x1 = 360 - distance * 28;
  const x2 = 360 + distance * 28;

  return (
    <div className="flex h-full w-full flex-col items-center justify-between bg-slate-950 p-6 text-slate-100">
      <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-sky-500/30 bg-slate-900 px-6 py-3">
        <div className="text-center">
          <div className="text-[11px] text-slate-400">Gaya Gravitasi (F₁₂ = F₂₁)</div>
          <div className="font-mono text-2xl font-black text-sky-400">{force.toExponential(3)} N</div>
        </div>
        <div className="h-8 w-px bg-slate-700" />
        <div className="font-mono text-xs text-slate-300">
          F = G · (m₁ · m₂) / r² = 6.674×10⁻¹¹ · ({m1} · {m2}) / {distance}²
        </div>
      </div>

      <svg viewBox="0 0 720 300" className="w-full max-w-4xl flex-1 rounded-2xl border border-slate-800 bg-slate-900/90 my-4">
        {/* Distance ruler */}
        <line x1={x1} y1={240} x2={x2} y2={240} stroke="#f59e0b" strokeWidth="2.5" />
        <line x1={x1} y1={230} x2={x1} y2={250} stroke="#f59e0b" strokeWidth="2.5" />
        <line x1={x2} y1={230} x2={x2} y2={250} stroke="#f59e0b" strokeWidth="2.5" />
        <text x={360} y={266} textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="bold">
          Jarak r = {distance.toFixed(1)} m
        </text>

        {/* Force vectors */}
        <line x1={x1} y1={140} x2={x1 + arrowLen} y2={140} stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
        <polygon points={`${x1 + arrowLen + 10},140 ${x1 + arrowLen - 4},132 ${x1 + arrowLen - 4},148`} fill="#38bdf8" />
        <text x={x1 + arrowLen / 2} y={124} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="bold">F₁₂</text>

        <line x1={x2} y1={140} x2={x2 - arrowLen} y2={140} stroke="#f43f5e" strokeWidth="5" strokeLinecap="round" />
        <polygon points={`${x2 - arrowLen - 10},140 ${x2 - arrowLen + 4},132 ${x2 - arrowLen + 4},148`} fill="#f43f5e" />
        <text x={x2 - arrowLen / 2} y={124} textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="bold">F₂₁</text>

        {/* Mass spheres */}
        <circle cx={x1} cy={140} r={r1} fill="#2563eb" stroke="#93c5fd" strokeWidth="3" />
        <text x={x1} y={145} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">m₁</text>

        <circle cx={x2} cy={140} r={r2} fill="#e11d48" stroke="#fda4af" strokeWidth="3" />
        <text x={x2} y={145} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="bold">m₂</text>
      </svg>

      <div className="grid w-full max-w-4xl grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs">
        <label>
          <div className="mb-1 flex justify-between font-bold text-blue-300"><span>Massa Benda 1 (m₁)</span><span>{m1} kg</span></div>
          <input type="range" min={50} max={1000} step={50} value={m1} onChange={(e) => setM1(Number(e.target.value))} className="w-full accent-blue-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-rose-300"><span>Massa Benda 2 (m₂)</span><span>{m2} kg</span></div>
          <input type="range" min={50} max={1000} step={50} value={m2} onChange={(e) => setM2(Number(e.target.value))} className="w-full accent-rose-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-amber-300"><span>Jarak Pusat (r)</span><span>{distance.toFixed(1)} m</span></div>
          <input type="range" min={2} max={10} step={0.5} value={distance} onChange={(e) => setDistance(Number(e.target.value))} className="w-full accent-amber-400" />
        </label>
      </div>
    </div>
  );
};

/* ============================================================================
 * 6. GAYA & GERAK DASAR (Forces & Motion — Newton I & II)
 * ========================================================================== */
export const ForcesMotionLab: React.FC = () => {
  const [appliedForce, setAppliedForce] = useState(120); // N
  const [mass, setMass] = useState(50); // kg
  const [frictionCoeff, setFrictionCoeff] = useState(0.15);
  const [running, setRunning] = useState(true);
  const [posX, setPosX] = useState(120);
  const [vel, setVel] = useState(0);

  const velRef = useRef(0);
  const posRef = useRef(120);

  const normalForce = mass * 9.8;
  const maxFriction = frictionCoeff * normalForce;
  const actualFriction = (() => {
    if (Math.abs(vel) > 0.05) return -Math.sign(vel) * maxFriction;
    if (Math.abs(appliedForce) <= maxFriction) return -appliedForce;
    return -Math.sign(appliedForce) * maxFriction;
  })();
  const netForce = appliedForce + actualFriction;
  const accel = netForce / mass;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const nf = mass * 9.8 * frictionCoeff;
      let fr = 0;
      if (Math.abs(velRef.current) > 0.05) {
        fr = -Math.sign(velRef.current) * nf;
      } else if (Math.abs(appliedForce) <= nf) {
        fr = -appliedForce;
        velRef.current = 0;
      } else {
        fr = -Math.sign(appliedForce) * nf;
      }
      const a = (appliedForce + fr) / mass;
      velRef.current = Math.max(-25, Math.min(25, velRef.current + a * dt));
      posRef.current = (posRef.current + velRef.current * dt * 28 + 760) % 760;
      setVel(velRef.current);
      setPosX(posRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, appliedForce, mass, frictionCoeff]);

  return (
    <div className="flex h-full w-full flex-col justify-between bg-slate-950 p-6 text-slate-100">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto w-full">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400">Resultan Gaya (ΣF)</div>
          <div className="font-mono text-xl font-black text-emerald-400">{netForce.toFixed(1)} N</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400">Gaya Gesek (f)</div>
          <div className="font-mono text-xl font-black text-rose-400">{actualFriction.toFixed(1)} N</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400">Percepatan (a = ΣF/m)</div>
          <div className="font-mono text-xl font-black text-amber-400">{accel.toFixed(2)} m/s²</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400">Kecepatan (v)</div>
          <div className="font-mono text-xl font-black text-sky-400">{vel.toFixed(2)} m/s</div>
        </div>
      </div>

      <svg viewBox="0 0 760 280" className="my-4 w-full max-w-4xl mx-auto flex-1 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        {/* Ground Track */}
        <rect x="0" y="210" width="760" height="70" fill="#1e293b" />
        {Array.from({ length: 19 }, (_, i) => (
          <line key={i} x1={i * 44} y1={210} x2={i * 44 - 14} y2={230} stroke="#334155" strokeWidth="2" />
        ))}

        {/* Moving Box */}
        <g transform={`translate(${posX}, 130)`}>
          <rect x="-45" y="0" width="90" height="74" rx="10" fill="#d97706" stroke="#fde68a" strokeWidth="2.5" />
          <text x="0" y="42" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="bold">{mass} kg</text>
          <circle cx="-26" cy="76" r="10" fill="#0f172a" stroke="#94a3b8" strokeWidth="3" />
          <circle cx="26" cy="76" r="10" fill="#0f172a" stroke="#94a3b8" strokeWidth="3" />

          {/* Applied force arrow */}
          {Math.abs(appliedForce) > 1 && (
            <g>
              <line x1="0" y1="22" x2={appliedForce * 0.65} y2="22" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
              <text x={appliedForce * 0.35} y="10" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="bold">F = {appliedForce}N</text>
            </g>
          )}

          {/* Friction arrow */}
          {Math.abs(actualFriction) > 1 && (
            <g>
              <line x1="0" y1="60" x2={actualFriction * 0.65} y2="60" stroke="#f43f5e" strokeWidth="5" strokeLinecap="round" />
              <text x={actualFriction * 0.4} y="96" textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="bold">Gesek {actualFriction.toFixed(0)}N</text>
            </g>
          )}
        </g>
      </svg>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 md:grid-cols-4 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs items-center">
        <label>
          <div className="mb-1 flex justify-between font-bold text-sky-300"><span>Gaya Dorong (F)</span><span>{appliedForce} N</span></div>
          <input type="range" min={-300} max={300} step={10} value={appliedForce} onChange={(e) => setAppliedForce(Number(e.target.value))} className="w-full accent-sky-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-amber-300"><span>Massa Benda (m)</span><span>{mass} kg</span></div>
          <input type="range" min={10} max={200} step={10} value={mass} onChange={(e) => setMass(Number(e.target.value))} className="w-full accent-amber-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-rose-300"><span>Koefisien Gesek (μ)</span><span>{frictionCoeff.toFixed(2)}</span></div>
          <input type="range" min={0} max={0.6} step={0.05} value={frictionCoeff} onChange={(e) => setFrictionCoeff(Number(e.target.value))} className="w-full accent-rose-400" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRunning((r) => !r)} className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-500">
            {running ? 'Jeda' : 'Jalankan'}
          </button>
          <button type="button" onClick={() => { velRef.current = 0; posRef.current = 120; setVel(0); setPosX(120); setAppliedForce(0); }} className="rounded-xl bg-slate-800 px-3 py-2.5 font-bold hover:bg-slate-700">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 7. RANGKAIAN LISTRIK DC (Circuit Construction Kit: DC)
 * ========================================================================== */
export const CircuitDCLab: React.FC = () => {
  const [topology, setTopology] = useState<'series' | 'parallel'>('series');
  const [voltage, setVoltage] = useState(12); // V
  const [r1, setR1] = useState(6); // Ohm
  const [r2, setR2] = useState(6); // Ohm
  const [switchClosed, setSwitchClosed] = useState(true);
  const [phase, setPhase] = useState(0);

  const rTotal = topology === 'series' ? r1 + r2 : (r1 * r2) / (r1 + r2);
  const iTotal = switchClosed ? voltage / rTotal : 0;
  const i1 = switchClosed ? (topology === 'series' ? iTotal : voltage / r1) : 0;
  const i2 = switchClosed ? (topology === 'series' ? iTotal : voltage / r2) : 0;
  const p1 = i1 * i1 * r1;
  const p2 = i2 * i2 * r2;

  useEffect(() => {
    if (!switchClosed) return;
    let raf = 0;
    const step = () => {
      setPhase((p) => (p + Math.min(4, iTotal * 0.45)) % 100);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [switchClosed, iTotal]);

  const glow1 = Math.min(1, p1 / 25);
  const glow2 = Math.min(1, p2 / 25);

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-slate-950 text-slate-100">
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <svg viewBox="0 0 680 400" className="h-full max-h-[520px] w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900">
          {/* Wire loop */}
          {topology === 'series' ? (
            <rect
              x="120" y="90" width="440" height="220" rx="18"
              fill="none" stroke="#64748b" strokeWidth="6"
            />
          ) : (
            <>
              <rect x="120" y="70" width="440" height="260" rx="18" fill="none" stroke="#64748b" strokeWidth="6" />
              <line x1="250" y1="200" x2="560" y2="200" stroke="#64748b" strokeWidth="6" />
              <line x1="250" y1="70" x2="250" y2="330" stroke="#64748b" strokeWidth="6" />
            </>
          )}

          {/* Animated Electron Flow */}
          {switchClosed && (
            <rect
              x="120" y={topology === 'series' ? 90 : 70} width="440" height={topology === 'series' ? 220 : 260} rx="18"
              fill="none" stroke="#38bdf8" strokeWidth="4" strokeDasharray="6 20" strokeDashoffset={-phase}
            />
          )}

          {/* Battery */}
          <g transform="translate(88, 165)">
            <rect x="0" y="0" width="64" height="70" rx="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="32" y="30" textAnchor="middle" fill="#fbbf24" fontSize="15" fontWeight="bold">{voltage}V</text>
            <text x="32" y="52" textAnchor="middle" fill="#94a3b8" fontSize="10">Baterai DC</text>
          </g>

          {/* Bulb 1 */}
          <g transform={topology === 'series' ? 'translate(260, 90)' : 'translate(410, 70)'}>
            <circle cx="0" cy="0" r={28 + glow1 * 24} fill={`rgba(250, 204, 21, ${glow1 * 0.45})`} />
            <circle cx="0" cy="0" r="24" fill={switchClosed ? `rgba(253, 224, 71, ${0.25 + glow1 * 0.75})` : '#1e293b'} stroke="#fde047" strokeWidth="2.5" />
            <text x="0" y="5" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">L1</text>
            <text x="0" y="42" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="bold">R₁={r1}Ω · {p1.toFixed(1)}W</text>
          </g>

          {/* Bulb 2 */}
          <g transform={topology === 'series' ? 'translate(430, 90)' : 'translate(410, 200)'}>
            <circle cx="0" cy="0" r={28 + glow2 * 24} fill={`rgba(250, 204, 21, ${glow2 * 0.45})`} />
            <circle cx="0" cy="0" r="24" fill={switchClosed ? `rgba(253, 224, 71, ${0.25 + glow2 * 0.75})` : '#1e293b'} stroke="#fde047" strokeWidth="2.5" />
            <text x="0" y="5" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">L2</text>
            <text x="0" y="42" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="bold">R₂={r2}Ω · {p2.toFixed(1)}W</text>
          </g>

          {/* Ammeter */}
          <g transform="translate(340, 310)">
            <circle cx="0" cy="0" r="26" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
            <text x="0" y="4" textAnchor="middle" fill="#34d399" fontSize="12" fontWeight="bold">{iTotal.toFixed(2)}A</text>
          </g>
        </svg>
      </div>

      <div className="flex w-full lg:w-80 shrink-0 flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 p-5 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTopology('series')} className={`rounded-xl py-2.5 font-bold ${topology === 'series' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            Rangkaian Seri
          </button>
          <button type="button" onClick={() => setTopology('parallel')} className={`rounded-xl py-2.5 font-bold ${topology === 'parallel' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
            Rangkaian Paralel
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSwitchClosed((s) => !s)}
          className={`rounded-xl py-2.5 font-bold transition ${switchClosed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
        >
          Sakelar: {switchClosed ? 'TERTUTUP (ON)' : 'TERBUKA (OFF)'}
        </button>

        <label>
          <div className="mb-1 flex justify-between font-bold text-amber-300"><span>Tegangan Baterai (V)</span><span>{voltage} V</span></div>
          <input type="range" min={3} max={24} step={1} value={voltage} onChange={(e) => setVoltage(Number(e.target.value))} className="w-full accent-amber-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-sky-300"><span>Hambatan Lampu 1 (R₁)</span><span>{r1} Ω</span></div>
          <input type="range" min={2} max={20} step={1} value={r1} onChange={(e) => setR1(Number(e.target.value))} className="w-full accent-sky-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-sky-300"><span>Hambatan Lampu 2 (R₂)</span><span>{r2} Ω</span></div>
          <input type="range" min={2} max={20} step={1} value={r2} onChange={(e) => setR2(Number(e.target.value))} className="w-full accent-sky-400" />
        </label>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5 font-mono">
          <div className="flex justify-between"><span className="text-slate-400">R Total:</span><span className="text-white">{rTotal.toFixed(2)} Ω</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Arus Total (I):</span><span className="text-emerald-400">{iTotal.toFixed(2)} A</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Daya Lampu 1:</span><span className="text-amber-300">{p1.toFixed(2)} W</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Daya Lampu 2:</span><span className="text-amber-300">{p2.toFixed(2)} W</span></div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 8. GELOMBANG PADA TALI (Wave on a String)
 * ========================================================================== */
export const WaveOnStringLab: React.FC = () => {
  const [amplitude, setAmplitude] = useState(55);
  const [frequency, setFrequency] = useState(1.5);
  const [damping, setDamping] = useState(0.08);
  const [tension, setTension] = useState(2); // 1=rendah, 2=sedang, 3=tinggi
  const [running, setRunning] = useState(true);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((t) => t + dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const waveSpeed = tension * 160; // px/s
  const wavelength = waveSpeed / frequency;
  const beads = Array.from({ length: 56 }, (_, i) => {
    const x = 60 + i * 11;
    const decay = Math.exp(-damping * (i / 18));
    const y = 190 - amplitude * decay * Math.sin(2 * Math.PI * (frequency * time - (i * 11) / wavelength));
    return { x, y, green: i % 8 === 0 };
  });

  return (
    <div className="flex h-full w-full flex-col justify-between bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto flex flex-wrap gap-5 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-3 font-mono text-xs">
        <div><span className="text-slate-400">Cepat Rambat (v):</span> <strong className="text-sky-400">{(waveSpeed / 40).toFixed(2)} m/s</strong></div>
        <div><span className="text-slate-400">Panjang Gelombang (λ = v/f):</span> <strong className="text-emerald-400">{(wavelength / 40).toFixed(2)} m</strong></div>
        <div><span className="text-slate-400">Periode (T = 1/f):</span> <strong className="text-amber-400">{(1 / frequency).toFixed(2)} s</strong></div>
      </div>

      <svg viewBox="0 0 720 380" className="my-4 mx-auto w-full max-w-4xl flex-1 rounded-2xl border border-slate-800 bg-slate-900">
        <line x1="60" y1="190" x2="670" y2="190" stroke="#334155" strokeWidth="1.5" strokeDasharray="6 4" />
        {/* Oscillator */}
        <rect x="26" y="155" width="34" height="70" rx="8" fill="#4f46e5" />
        <polyline
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2.5"
          points={beads.map((b) => `${b.x},${b.y}`).join(' ')}
        />
        {beads.map((b, idx) => (
          <circle key={idx} cx={b.x} cy={b.y} r={b.green ? 6.5 : 4.5} fill={b.green ? '#10b981' : '#f43f5e'} stroke="#fff" strokeWidth="1" />
        ))}
      </svg>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 md:grid-cols-5 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs items-center">
        <label>
          <div className="mb-1 flex justify-between font-bold text-rose-300"><span>Amplitudo</span><span>{(amplitude / 40).toFixed(2)} cm</span></div>
          <input type="range" min={10} max={110} step={5} value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} className="w-full accent-rose-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-sky-300"><span>Frekuensi (f)</span><span>{frequency.toFixed(1)} Hz</span></div>
          <input type="range" min={0.5} max={3.5} step={0.1} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} className="w-full accent-sky-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-amber-300"><span>Redaman</span><span>{(damping * 100).toFixed(0)}%</span></div>
          <input type="range" min={0} max={0.5} step={0.02} value={damping} onChange={(e) => setDamping(Number(e.target.value))} className="w-full accent-amber-400" />
        </label>
        <label>
          <div className="mb-1 flex justify-between font-bold text-emerald-300"><span>Tegangan Tali</span><span>{tension === 1 ? 'Rendah' : tension === 2 ? 'Sedang' : 'Tinggi'}</span></div>
          <input type="range" min={1} max={3} step={1} value={tension} onChange={(e) => setTension(Number(e.target.value))} className="w-full accent-emerald-400" />
        </label>
        <button type="button" onClick={() => setRunning((r) => !r)} className="rounded-xl bg-indigo-600 py-2.5 font-bold text-white hover:bg-indigo-500">
          {running ? 'Jeda' : 'Jalankan'}
        </button>
      </div>
    </div>
  );
};
