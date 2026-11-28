/**
 * InstrumentStudioModal.tsx — Virtual Piano & Guitar Studio with Live Frequency Wave (Lazy-Loaded, V8)
 *
 * Adapted from Seewo EasiNote `InstrumentTool` & Honghe `GCPiano`:
 * Powered by `Tone.js` Web Audio synthesis (zero MP3 bloat!) + real-time Hz wave visualizer.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

const PIANO_KEYS: Array<{ note: string; freq: number; sharp?: boolean; keyHint: string }> = [
  { note: 'C4', freq: 261.63, keyHint: 'A' },
  { note: 'C#4', freq: 277.18, sharp: true, keyHint: 'W' },
  { note: 'D4', freq: 293.66, keyHint: 'S' },
  { note: 'D#4', freq: 311.13, sharp: true, keyHint: 'E' },
  { note: 'E4', freq: 329.63, keyHint: 'D' },
  { note: 'F4', freq: 349.23, keyHint: 'F' },
  { note: 'F#4', freq: 369.99, sharp: true, keyHint: 'T' },
  { note: 'G4', freq: 392.00, keyHint: 'G' },
  { note: 'G#4', freq: 415.30, sharp: true, keyHint: 'Y' },
  { note: 'A4', freq: 440.00, keyHint: 'H' },
  { note: 'A#4', freq: 466.16, sharp: true, keyHint: 'U' },
  { note: 'B4', freq: 493.88, keyHint: 'J' },
  { note: 'C5', freq: 523.25, keyHint: 'K' },
];

const GUITAR_STRINGS = [
  { label: 'E4 (Senar 1)', note: 'E4', freq: 329.63 },
  { label: 'B3 (Senar 2)', note: 'B3', freq: 246.94 },
  { label: 'G3 (Senar 3)', note: 'G3', freq: 196.00 },
  { label: 'D3 (Senar 4)', note: 'D3', freq: 146.83 },
  { label: 'A2 (Senar 5)', note: 'A2', freq: 110.00 },
  { label: 'E2 (Senar 6)', note: 'E2', freq: 82.41 },
];

export interface InstrumentStudioModalProps {
  open: boolean;
  onClose: () => void;
}

export const InstrumentStudioModal: React.FC<InstrumentStudioModalProps> = ({ open, onClose }) => {
  const [instrument, setInstrument] = useState<'piano' | 'guitar'>('piano');
  const [activeNote, setActiveNote] = useState<{ note: string; freq: number }>({ note: 'A4', freq: 440 });
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!open) return;
    synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
    };
  }, [open]);

  // Draw crisp sine wave representing the active sound frequency (f Hz) for Music & Physics cross-subject!
  useEffect(() => {
    const c = waveCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    const cycles = Math.max(2, Math.min(12, activeNote.freq / 65));
    for (let x = 0; x <= w; x++) {
      const y = h / 2 - Math.sin((x / w) * Math.PI * 2 * cycles) * (h * 0.36);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [activeNote, open]);

  const playNote = async (note: string, freq: number) => {
    await Tone.start();
    synthRef.current?.triggerAttackRelease(note, instrument === 'guitar' ? '2n' : '8n');
    setActiveNote({ note, freq });
  };

  if (!open) return null;

  return (
    <div data-testid="instrument-studio-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5 backdrop-blur-xs">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">🎹 Studio Instrumen & Gelombang Bunyi</h3>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-bold">
              <button type="button" onClick={() => setInstrument('piano')} className={`rounded-md px-2.5 py-0.5 ${instrument === 'piano' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Piano</button>
              <button type="button" onClick={() => setInstrument('guitar')} className={`rounded-md px-2.5 py-0.5 ${instrument === 'guitar' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>Gitar</button>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">Tutup ×</button>
        </div>

        <div className="space-y-4 p-5">
          {/* Live Frequency Waveform (Physics + Music Bridge!) */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Gelombang Bunyi Real-Time</span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 font-mono text-indigo-800">
                Nada {activeNote.note} · f = {activeNote.freq.toFixed(1)} Hz
              </span>
            </div>
            <canvas ref={waveCanvasRef} width={640} height={96} className="h-24 w-full rounded-xl border border-slate-200 bg-white" />
          </div>

          {instrument === 'piano' ? (
            <div className="flex gap-1 overflow-x-auto pb-2">
              {PIANO_KEYS.map((k) => (
                <button
                  key={k.note}
                  type="button"
                  onPointerDown={() => void playNote(k.note, k.freq)}
                  className={`flex flex-col items-center justify-end rounded-xl border pb-2 font-mono text-[10px] font-bold transition active:scale-95 ${
                    k.sharp
                      ? 'h-28 w-10 shrink-0 border-slate-800 bg-slate-900 text-white hover:bg-slate-700'
                      : 'h-40 w-12 shrink-0 border-slate-300 bg-white text-slate-800 shadow-xs hover:bg-indigo-50'
                  }`}
                >
                  <span>{k.note}</span>
                  <span className="opacity-50 text-[9px]">{k.keyHint}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {GUITAR_STRINGS.map((s) => (
                <button
                  key={s.note}
                  type="button"
                  onPointerDown={() => void playNote(s.note, s.freq)}
                  className="flex w-full items-center justify-between rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs font-bold text-amber-950 transition hover:bg-amber-100 active:scale-[0.99]"
                >
                  <span>🎸 {s.label}</span>
                  <span className="h-0.5 flex-1 mx-4 bg-amber-700/50 rounded-full" />
                  <span className="font-mono">{s.freq.toFixed(1)} Hz</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
