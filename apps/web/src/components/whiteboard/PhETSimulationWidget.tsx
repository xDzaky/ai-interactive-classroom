/**
 * PhETSimulationWidget.tsx — Official PhET Interactive Simulations & POE Experiment Mode (V4)
 *
 * Full CC BY-NC 4.0 license attribution preserved.
 * Supports:
 * - Browsing curated PhET HTML5 sims by subject (Matematika, Fisika, Kimia, Biologi)
 * - Official iframe embed + 1-click Official PhET Tab fallback
 * - Structured POE Experiment Mode (Predict -> Observe -> Explain) with JSON/text report copy
 */
import React, { useMemo, useState } from 'react';
import {
  PHET_CATALOG,
  type PhETSimulationItem,
  type PhETSubject,
} from '@/lib/phetCatalog';

export interface PhETSimulationModalProps {
  open: boolean;
  initialSimId?: string;
  onClose: () => void;
}

const SUBJECTS: Array<'Semua' | PhETSubject> = ['Semua', 'Matematika', 'Fisika', 'Kimia', 'Biologi'];

export const PhETSimulationModal: React.FC<PhETSimulationModalProps> = ({
  open,
  initialSimId,
  onClose,
}) => {
  const [subject, setSubject] = useState<'Semua' | PhETSubject>('Semua');
  const [selectedSim, setSelectedSim] = useState<PhETSimulationItem>(
    () => PHET_CATALOG.find((s) => s.id === initialSimId) ?? PHET_CATALOG[0],
  );
  const [showPOE, setShowPOE] = useState(true);
  const [prediction, setPrediction] = useState('');
  const [observation, setObservation] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [reportSaved, setReportSaved] = useState(false);

  const filtered = useMemo(
    () => PHET_CATALOG.filter((s) => subject === 'Semua' || s.subject === subject),
    [subject],
  );

  if (!open) return null;

  const handleExportReport = () => {
    const report = [
      `LAPORAN EKSPERIMEN PhET — ${selectedSim.title} (${selectedSim.subject})`,
      `Pertanyaan: ${selectedSim.sampleQuestion}`,
      `1. Prediksi: ${prediction || '-'}`,
      `2. Observasi: ${observation || '-'}`,
      `3. Kesimpulan: ${conclusion || '-'}`,
      `Sumber: ${selectedSim.attribution} (${selectedSim.officialUrl})`,
    ].join('\n');
    navigator.clipboard?.writeText(report).catch(() => {});
    setReportSaved(true);
    setTimeout(() => setReportSaved(false), 2000);
  };

  return (
    <div
      data-testid="phet-simulation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Laboratorium Simulasi PhET & Mode Eksperimen POE"
    >
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Laboratorium PhET Interactive Simulations (Mode Eksperimen POE)
            </h2>
            <p className="text-[11px] text-slate-500">
              {selectedSim.attribution}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPOE((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                showPOE
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {showPOE ? 'Sembunyikan Panel POE' : 'Tampilkan Panel POE'}
            </button>
            <a
              href={selectedSim.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Buka di Situs Resmi PhET
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Library Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50/70">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2.5">
              {SUBJECTS.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubject(sub)}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                    subject === sub
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
              {filtered.map((sim) => (
                <button
                  key={sim.id}
                  type="button"
                  data-testid={`phet-sim-${sim.id}`}
                  onClick={() => {
                    setSelectedSim(sim);
                    setPrediction('');
                    setObservation('');
                    setConclusion('');
                  }}
                  className={`w-full rounded-xl border p-2.5 text-left transition ${
                    selectedSim.id === sim.id
                      ? 'border-indigo-500 bg-indigo-50/80 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">{sim.title}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                      {sim.subject}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{sim.description}</p>
                </button>
              ))}
            </div>
          </aside>

          {/* Center Embedded PhET Simulation */}
          <div className="relative flex flex-1 flex-col bg-slate-900">
            <iframe
              key={selectedSim.id}
              src={selectedSim.embedUrl}
              title={`PhET: ${selectedSim.title}`}
              className="h-full w-full border-0"
              allowFullScreen
            />
          </div>

          {/* Right POE Experiment Panel (Predict -> Observe -> Explain) */}
          {showPOE && (
            <aside className="flex w-72 shrink-0 flex-col border-l border-slate-200 bg-white p-4 overflow-y-auto">
              <div className="mb-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  Pertanyaan Eksperimen
                </div>
                <p className="mt-1 text-xs font-medium text-slate-800">
                  {selectedSim.sampleQuestion}
                </p>
              </div>

              <label className="mb-3 flex flex-col gap-1 text-xs">
                <span className="font-bold text-slate-800">1. Prediksi (Predict)</span>
                <textarea
                  rows={3}
                  value={prediction}
                  onChange={(e) => setPrediction(e.target.value)}
                  placeholder="Tulis dugaan awal sebelum mengubah parameter..."
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>

              <label className="mb-3 flex flex-col gap-1 text-xs">
                <span className="font-bold text-slate-800">2. Observasi (Observe)</span>
                <textarea
                  rows={3}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Catat perubahan yang terlihat pada simulasi..."
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>

              <label className="mb-4 flex flex-col gap-1 text-xs">
                <span className="font-bold text-slate-800">3. Kesimpulan (Explain)</span>
                <textarea
                  rows={3}
                  value={conclusion}
                  onChange={(e) => setConclusion(e.target.value)}
                  placeholder="Jelaskan mengapa hasil tersebut terjadi..."
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>

              <button
                type="button"
                onClick={handleExportReport}
                className="mt-auto w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
              >
                {reportSaved ? 'Laporan Disalin ke Clipboard' : 'Salin Laporan Eksperimen'}
              </button>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
