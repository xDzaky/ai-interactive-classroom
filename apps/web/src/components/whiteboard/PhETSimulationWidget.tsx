/**
 * PhETSimulationWidget.tsx — Native Full-Screen Virtual Lab & POE Experiment Mode
 *
 * 100% owned by AI Interactive Classroom — renders native interactive React/SVG labs
 * directly in full-screen mode (no external iframe, works completely offline,
 * freely customizable under apps/web/src/components/lab/).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PHET_CATALOG,
  type PhETSimulationItem,
  type PhETSubject,
} from '@/lib/phetCatalog';
import {
  QuadraticsLab,
  FractionsLab,
  AreaBuilderLab,
  PlinkoLab,
} from '@/components/lab/MathLabs';
import {
  GravityForceLab,
  ForcesMotionLab,
  CircuitDCLab,
  WaveOnStringLab,
} from '@/components/lab/PhysicsLabs';
import {
  PhScaleLab,
  BuildAtomLab,
  BalancingEquationsLab,
} from '@/components/lab/ChemistryLabs';
import { NaturalSelectionLab } from '@/components/lab/BiologyLabs';

export interface PhETSimulationModalProps {
  open: boolean;
  initialSimId?: string;
  onClose: () => void;
}

const SUBJECTS: Array<'Semua' | PhETSubject> = ['Semua', 'Matematika', 'Fisika', 'Kimia', 'Biologi'];

function renderNativeLab(simId: string): React.ReactNode {
  switch (simId) {
    case 'phet-quadratics':
      return <QuadraticsLab />;
    case 'phet-fractions':
      return <FractionsLab />;
    case 'phet-area':
      return <AreaBuilderLab />;
    case 'phet-plinko':
      return <PlinkoLab />;
    case 'phet-gravity':
      return <GravityForceLab />;
    case 'phet-forces':
      return <ForcesMotionLab />;
    case 'phet-circuit':
      return <CircuitDCLab />;
    case 'phet-wave':
      return <WaveOnStringLab />;
    case 'phet-ph':
      return <PhScaleLab />;
    case 'phet-atom':
      return <BuildAtomLab />;
    case 'phet-balance':
      return <BalancingEquationsLab />;
    case 'phet-selection':
      return <NaturalSelectionLab />;
    default:
      return <PhScaleLab />;
  }
}

export const PhETSimulationModal: React.FC<PhETSimulationModalProps> = ({
  open,
  initialSimId,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [subject, setSubject] = useState<'Semua' | PhETSubject>('Semua');
  const [selectedSim, setSelectedSim] = useState<PhETSimulationItem>(
    () => PHET_CATALOG.find((s) => s.id === initialSimId) ?? PHET_CATALOG.find((s) => s.id === 'phet-ph') ?? PHET_CATALOG[0],
  );
  // Both drawers collapsed by default so simulation starts immediately FULL SCREEN
  const [showCatalog, setShowCatalog] = useState(false);
  const [showPOE, setShowPOE] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  const [prediction, setPrediction] = useState('');
  const [observation, setObservation] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [reportSaved, setReportSaved] = useState(false);

  useEffect(() => {
    if (open && initialSimId) {
      const found = PHET_CATALOG.find((s) => s.id === initialSimId);
      if (found) setSelectedSim(found);
    }
  }, [open, initialSimId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    const onFsChange = () => setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [open, onClose]);

  const filtered = useMemo(
    () => PHET_CATALOG.filter((s) => subject === 'Semua' || s.subject === subject),
    [subject],
  );

  if (!open) return null;

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleSelectSim = (sim: PhETSimulationItem) => {
    setSelectedSim(sim);
    setPrediction('');
    setObservation('');
    setConclusion('');
    setShowCatalog(false);
  };

  const handleExportReport = () => {
    const report = [
      `LAPORAN EKSPERIMEN LABORATORIUM VIRTUAL — AI INTERACTIVE CLASSROOM`,
      `Simulasi: ${selectedSim.title} (${selectedSim.subject})`,
      `Pertanyaan: ${selectedSim.sampleQuestion}`,
      `1. Prediksi: ${prediction || '-'}`,
      `2. Observasi: ${observation || '-'}`,
      `3. Kesimpulan: ${conclusion || '-'}`,
    ].join('\n');
    navigator.clipboard?.writeText(report).catch(() => {});
    setReportSaved(true);
    setTimeout(() => setReportSaved(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      data-testid="phet-simulation-modal"
      className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-label="Laboratorium Virtual Interaktif AI Interactive Classroom"
    >
      {/* Slim Full-Screen Header Bar */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            data-testid="toggle-lab-catalog-btn"
            onClick={() => setShowCatalog((v) => !v)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
              showCatalog
                ? 'border-indigo-400 bg-indigo-600 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            Daftar Lab ({PHET_CATALOG.length})
          </button>

          <div className="hidden sm:flex items-center gap-2 truncate">
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 border border-indigo-500/30">
              AI Interactive Classroom
            </span>
            <h2 className="truncate text-xs font-bold text-white">
              Laboratorium Virtual · {selectedSim.title}
            </h2>
          </div>

          <select
            aria-label="Pilih Simulasi Cepat"
            value={selectedSim.id}
            onChange={(e) => {
              const found = PHET_CATALOG.find((s) => s.id === e.target.value);
              if (found) handleSelectSim(found);
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-100 outline-none focus:border-indigo-400"
          >
            {PHET_CATALOG.map((sim) => (
              <option key={sim.id} value={sim.id}>
                [{sim.subject}] {sim.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="toggle-poe-panel-btn"
            onClick={() => setShowPOE((v) => !v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              showPOE
                ? 'border-emerald-400 bg-emerald-600 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {showPOE ? 'Tutup Panel POE' : 'Mode Eksperimen POE'}
          </button>
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="hidden sm:inline-flex rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            {isBrowserFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {});
              }
              onClose();
            }}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
          >
            Tutup
          </button>
        </div>
      </header>

      {/* Full-Screen Simulation Viewport with Optional Slide-Over Drawers */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Main Full-Screen Native Simulation Stage */}
        <div
          data-testid="native-lab-viewport"
          className="h-full w-full flex-1 overflow-hidden"
        >
          {renderNativeLab(selectedSim.id)}
        </div>

        {/* Left Slide-Over Lab Catalog Drawer */}
        {showCatalog && (
          <aside className="absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-slate-800 bg-slate-900/98 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap gap-1 border-b border-slate-800 p-3">
              {SUBJECTS.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubject(sub)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${
                    subject === sub
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
              {filtered.map((sim) => (
                <button
                  key={sim.id}
                  type="button"
                  data-testid={`phet-sim-${sim.id}`}
                  onClick={() => handleSelectSim(sim)}
                  className={`w-full rounded-xl border p-2.5 text-left transition ${
                    selectedSim.id === sim.id
                      ? 'border-indigo-400 bg-indigo-950/70 shadow-sm'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white">{sim.title}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300">
                      {sim.subject}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] text-slate-400">{sim.description}</p>
                </button>
              ))}
            </div>
          </aside>
        )}

        {/* Right Slide-Over POE Experiment Drawer */}
        {showPOE && (
          <aside className="absolute inset-y-0 right-0 z-20 flex w-80 flex-col border-l border-slate-800 bg-slate-900/98 p-4 shadow-2xl backdrop-blur-md overflow-y-auto">
            <div className="mb-3 rounded-xl border border-indigo-500/30 bg-indigo-950/50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                Pertanyaan Eksperimen (POE)
              </div>
              <p className="mt-1 text-xs font-medium text-slate-100">
                {selectedSim.sampleQuestion}
              </p>
            </div>

            <label className="mb-3 flex flex-col gap-1 text-xs">
              <span className="font-bold text-slate-200">1. Prediksi (Predict)</span>
              <textarea
                rows={3}
                value={prediction}
                onChange={(e) => setPrediction(e.target.value)}
                placeholder="Tulis dugaan awal sebelum mengubah parameter..."
                className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-400"
              />
            </label>

            <label className="mb-3 flex flex-col gap-1 text-xs">
              <span className="font-bold text-slate-200">2. Observasi (Observe)</span>
              <textarea
                rows={3}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Catat perubahan yang terlihat pada simulasi..."
                className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-400"
              />
            </label>

            <label className="mb-4 flex flex-col gap-1 text-xs">
              <span className="font-bold text-slate-200">3. Kesimpulan (Explain)</span>
              <textarea
                rows={3}
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="Jelaskan mengapa hasil tersebut terjadi..."
                className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-400"
              />
            </label>

            <button
              type="button"
              onClick={handleExportReport}
              className="mt-auto w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
            >
              {reportSaved ? 'Laporan Disalin ke Clipboard' : 'Salin Laporan Eksperimen'}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
};
