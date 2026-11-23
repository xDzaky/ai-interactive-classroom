/**
 * AITeachingDrawer.tsx — iFLYTEK Tongchuang AI Teaching Assistant Slide-Over
 * Supports: Problem-Chain (4-5 progressive questions), Socratic Tutor,
 * Step-by-Step Exercise Review, and AI Lesson Prep (RPP & Visual Recommendations).
 */
import React, { useState } from 'react';
import type { SolidType } from '@ai-classroom/geometry-core';

type DrawerTab = 'chain' | 'socratic' | 'prep';

export interface AITeachingDrawerProps {
  open: boolean;
  onClose: () => void;
  onInsertSolid: (solidType: SolidType) => void;
  onInsertMathBlock: (latex: string) => void;
}

const PROBLEM_CHAIN_PRESETS = [
  {
    level: 'Tahap 1 · Pemahaman Dasar',
    q: 'Berapa banyak sisi, rusuk, dan titik sudut pada kubus ABCD.EFGH? Verifikasi dengan rumus Euler V − E + F = 2.',
    hint: 'Hitung 8 titik sudut, 12 rusuk, dan 6 sisi persegi.',
  },
  {
    level: 'Tahap 2 · Penalaran Spasial',
    q: 'Jika rusuk kubus s = 6 cm, berapa panjang diagonal bidang AC dan diagonal ruang AG?',
    hint: 'Gunakan Pythagoras: AC = s√2 dan AG = s√3.',
  },
  {
    level: 'Tahap 3 · Irisan Bidang',
    q: 'Bentuk bangun datar apakah yang dihasilkan jika kubus diiris melalui titik A, C, dan F?',
    hint: 'Coba aktifkan mode Irisan (3 Titik) pada kubus 3D di papan tulis!',
  },
  {
    level: 'Tahap 4 · Tantangan Aplikasi',
    q: 'Sebuah balok memiliki panjang 2 kali lebarnya dan tinggi sama dengan lebarnya. Jika volume 54 cm³, berapakah luas permukaannya?',
    hint: 'Misalkan l = x, maka p = 2x dan t = x → 2x³ = 54 → x = 3 cm.',
  },
];

export const AITeachingDrawer: React.FC<AITeachingDrawerProps> = ({
  open,
  onClose,
  onInsertSolid,
  onInsertMathBlock,
}) => {
  const [tab, setTab] = useState<DrawerTab>('chain');
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [topic, setTopic] = useState('Bangun Ruang & Irisan Bidang');

  if (!open) return null;

  return (
    <div
      data-testid="ai-teaching-drawer"
      className="fixed right-3 top-14 bottom-4 z-50 flex w-80 flex-col rounded-2xl border border-slate-200 bg-white/98 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            AI
          </span>
          <div>
            <div className="text-xs font-bold text-slate-900">Asisten Mengajar AI</div>
            <div className="text-[10px] text-slate-500">Problem-Chain · Socratic · RPP</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
        {(
          [
            { id: 'chain', label: 'Problem-Chain' },
            { id: 'socratic', label: 'Socratic' },
            { id: 'prep', label: 'RPP & Visual' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-1 text-[11px] font-semibold transition ${
              tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3 text-xs">
        {tab === 'chain' && (
          <>
            <p className="text-[11px] text-slate-500">
              Rangkaian pertanyaan berjenjang untuk membangun penalaran siswa bertahap di depan kelas:
            </p>
            {PROBLEM_CHAIN_PRESETS.map((item, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                <div className="mb-1 text-[10px] font-bold text-indigo-600 uppercase">{item.level}</div>
                <p className="text-slate-800 leading-relaxed">{item.q}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRevealedHints((p) => ({ ...p, [idx]: !p[idx] }))}
                    className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100"
                  >
                    {revealedHints[idx] ? 'Tutup Petunjuk' : '💡 Petunjuk'}
                  </button>
                </div>
                {revealedHints[idx] && (
                  <div className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                    {item.hint}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'socratic' && (
          <div className="space-y-2.5">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-indigo-900">
              <div className="mb-1 font-bold">Mode Socratic Tutor</div>
              <p className="text-[11px] leading-relaxed">
                Membimbing siswa menemukan jawaban sendiri melalui petunjuk visual — tanpa langsung membocorkan hasil akhir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onInsertMathBlock('y = x^2 - 4')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
            >
              ➕ Sisipkan Soal Fungsi Kuadrat (y = x² − 4)
            </button>
            <button
              type="button"
              onClick={() => onInsertSolid('cube')}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
            >
              🧊 Sisipkan Kubus 3D untuk Eksplorasi Irisan
            </button>
          </div>
        )}

        {tab === 'prep' && (
          <div className="space-y-2.5">
            <label className="block">
              <span className="text-[11px] font-semibold text-slate-600">Topik Pertemuan</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-400"
              />
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
              <div className="font-bold text-slate-800">Rekomendasi Aset Papan Tulis</div>
              <p className="text-[11px] text-slate-600">Topik: <strong>{topic}</strong></p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => onInsertSolid('cube')}
                  className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  + Kubus 3D
                </button>
                <button
                  type="button"
                  onClick={() => onInsertSolid('pyramid')}
                  className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  + Limas 3D
                </button>
                <button
                  type="button"
                  onClick={() => onInsertMathBlock('z = sin(x)*cos(y)')}
                  className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  + Permukaan 3D
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
