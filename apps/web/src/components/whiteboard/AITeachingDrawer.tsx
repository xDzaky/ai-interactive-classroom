/**
 * AITeachingDrawer.tsx — iFLYTEK Tongchuang AI Teaching Assistant Slide-Over
 * Supports: Problem-Chain (4-5 progressive questions), Socratic Tutor,
 * Step-by-Step Exercise Review, and AI Lesson Prep (RPP & Visual Recommendations).
 */
import React, { useState } from 'react';
import type { SolidType } from '@ai-classroom/geometry-core';
import {
  generateLocalAIPlan,
  type AIWhiteboardPlan,
  type AIWhiteboardStep,
} from '@ai-classroom/whiteboard-core';

type DrawerTab = 'draw' | 'chain' | 'socratic' | 'prep';

export interface AITeachingDrawerProps {
  open: boolean;
  onClose: () => void;
  onInsertSolid: (solidType: SolidType) => void;
  onInsertMathBlock: (latex: string) => void;
  onExecuteAIStep?: (step: AIWhiteboardStep) => void;
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
  onExecuteAIStep,
}) => {
  const [tab, setTab] = useState<DrawerTab>('draw');
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});
  const [topic, setTopic] = useState('Bangun Ruang & Irisan Bidang');
  const [aiPrompt, setAiPrompt] = useState('Buat simulasi fungsi kuadrat dengan parameter a, b, dan c');
  const [activePlan, setActivePlan] = useState<AIWhiteboardPlan | null>(null);
  const [stepCursor, setStepCursor] = useState(0);

  if (!open) return null;

  const handleGeneratePlan = () => {
    const plan = generateLocalAIPlan(aiPrompt);
    setActivePlan(plan);
    setStepCursor(0);
  };

  const handleRunNextStep = () => {
    if (!activePlan || stepCursor >= activePlan.steps.length) return;
    onExecuteAIStep?.(activePlan.steps[stepCursor]);
    setStepCursor((c) => c + 1);
  };

  const handleRunAllSteps = () => {
    if (!activePlan) return;
    for (let i = stepCursor; i < activePlan.steps.length; i++) {
      onExecuteAIStep?.(activePlan.steps[i]);
    }
    setStepCursor(activePlan.steps.length);
  };

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
            { id: 'draw', label: 'Gambar AI' },
            { id: 'chain', label: 'Problem-Chain' },
            { id: 'socratic', label: 'Socratic' },
            { id: 'prep', label: 'RPP' },
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
        {tab === 'draw' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-[11px] text-indigo-900">
              <strong>OpenMAIC AI Drawing & Simulasi Tervalidasi</strong> — AI menyusun langkah visual (Zod schema, tanpa eval) lalu menggambar langsung di papan tulis.
            </div>
            <textarea
              rows={2}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Contoh: Buat simulasi fungsi kuadrat / gerak parabola / peluang dadu / pythagoras..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
            />
            <div className="flex flex-wrap gap-1">
              {[
                'Fungsi kuadrat a, b, c',
                'Simulasi gerak parabola',
                'Peluang dadu',
                'Teorema Pythagoras',
                'Gelombang sinus',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAiPrompt(preset)}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
                >
                  {preset}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-testid="ai-generate-plan-btn"
              onClick={handleGeneratePlan}
              className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Susun Langkah Visual AI
            </button>

            {activePlan && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <div className="text-xs font-bold text-slate-900">{activePlan.title}</div>
                <div className="space-y-1">
                  {activePlan.steps.map((st, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg px-2 py-1 text-[11px] ${
                        idx < stepCursor
                          ? 'bg-emerald-50 text-emerald-800 line-through'
                          : idx === stepCursor
                            ? 'bg-indigo-50 font-semibold text-indigo-800 border border-indigo-200'
                            : 'bg-slate-50 text-slate-500'
                      }`}
                    >
                      {idx + 1}. {st.type === 'speak_caption' ? st.text : `${st.type} (${'templateId' in st ? st.templateId : 'latex' in st ? st.latex : 'solidType' in st ? st.solidType : st.type})`}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    data-testid="ai-run-next-step-btn"
                    disabled={stepCursor >= activePlan.steps.length}
                    onClick={handleRunNextStep}
                    className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
                  >
                    Langkah Berikutnya
                  </button>
                  <button
                    type="button"
                    data-testid="ai-run-all-steps-btn"
                    disabled={stepCursor >= activePlan.steps.length}
                    onClick={handleRunAllSteps}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40"
                  >
                    Jalankan Semua
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
