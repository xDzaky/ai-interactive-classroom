/**
 * VoiceCommandBar.tsx — P15-T02
 * Floating Tongchuang voice & text AI command pill (works in Chromium via Web Speech API
 * and in Firefox/Floorp via instant Indonesian text command input).
 */

import React, { useState } from 'react';

export interface VoiceCommandBarProps {
  isSupported: boolean;
  isListening: boolean;
  lastTranscript: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onSubmitCommand: (text: string) => void;
  onClose: () => void;
}

const SUGGESTIONS = ['Buat kubus', 'Buat tabung', 'Grafik parabola', 'Ringkasan'];

export const VoiceCommandBar: React.FC<VoiceCommandBarProps> = ({
  isSupported,
  isListening,
  lastTranscript,
  onStartListening,
  onStopListening,
  onSubmitCommand,
  onClose,
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmitCommand(input.trim());
    setInput('');
  };

  return (
    <div
      data-testid="voice-command-bar"
      role="region"
      aria-label="Perintah Suara AI"
      className="fixed top-16 left-1/2 z-40 flex w-[92vw] max-w-lg -translate-x-1/2 flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 text-slate-800 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isListening ? onStopListening : onStartListening}
          disabled={!isSupported}
          title={isSupported ? 'Bicara dalam Bahasa Indonesia' : 'Browser tidak mendukung Web Speech — gunakan ketik perintah'}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
            isListening
              ? 'animate-pulse bg-red-500 text-white shadow-lg shadow-red-500/40'
              : isSupported
              ? 'bg-cyan-500 text-white hover:bg-cyan-600'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          🎙️
        </button>

        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ucapkan atau ketik: "Buat kubus", "Grafik parabola"...'
            data-testid="voice-command-input"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-cyan-500 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
          >
            Jalankan
          </button>
        </form>

        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Perintah Suara"
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-slate-400">Coba:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSubmitCommand(s)}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 transition"
          >
            {s}
          </button>
        ))}
        {lastTranscript && (
          <span className="ml-auto text-[10px] text-emerald-600 font-medium">
            Terakhir: &ldquo;{lastTranscript}&rdquo;
          </span>
        )}
      </div>
    </div>
  );
};
