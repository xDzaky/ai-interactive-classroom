/**
 * QuizLauncherModal.tsx — AI Classroom Quiz & Live Poll (V4)
 *
 * Teacher reviews/edits AI-generated questions, launches live poll to class,
 * inspects real-time answer distribution bar chart, and triggers 1-click
 * "Tampilkan Pembahasan" directly on the whiteboard!
 */
import React, { useState } from 'react';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIdx: number;
  explanationLatex: string;
}

const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Sebuah kubus memiliki panjang rusuk s = 4 cm. Berapakah volumenya?',
    options: ['16 cm³', '48 cm³', '64 cm³', '96 cm³'],
    correctIdx: 2,
    explanationLatex: '4^3',
  },
  {
    id: 'q2',
    question: 'Pada segitiga siku-siku dengan sisi tegak 3 cm dan 4 cm, berapakah sisi miringnya?',
    options: ['5 cm', '6 cm', '7 cm', '12 cm'],
    correctIdx: 0,
    explanationLatex: '\\sqrt{3^2 + 4^2}',
  },
  {
    id: 'q3',
    question: 'Jika koefisien a < 0 pada fungsi kuadrat f(x) = ax² + bx + c, grafik parabola membuka ke arah...',
    options: ['Atas', 'Bawah', 'Kanan', 'Kiri'],
    correctIdx: 1,
    explanationLatex: 'f(x) = -x^2 + 4',
  },
];

export interface QuizLauncherModalProps {
  open: boolean;
  onClose: () => void;
  onShowExplanationOnBoard?: (latex: string) => void;
}

export const QuizLauncherModal: React.FC<QuizLauncherModalProps> = ({
  open,
  onClose,
  onShowExplanationOnBoard,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>(DEFAULT_QUESTIONS);
  const [activeIdx, setActiveIdx] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [votes, setVotes] = useState<number[]>([2, 3, 14, 1]);

  if (!open) return null;

  const q = questions[activeIdx];
  const totalVotes = votes.reduce((s, v) => s + v, 0);

  return (
    <div
      data-testid="quiz-launcher-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Kuis Kelas & Live Poll"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Kuis Kelas & Live Poll</h2>
            <p className="text-[11px] text-slate-500">
              Review soal sebelum diluncurkan ke siswa, lalu tampilkan pembahasan di papan tulis
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>

        {/* Question Selector Tabs */}
        <div className="mb-3 flex gap-1.5">
          {questions.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveIdx(idx);
                setLaunched(false);
              }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                activeIdx === idx
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Soal {idx + 1}
            </button>
          ))}
        </div>

        {/* Editable Question Preview */}
        <textarea
          rows={2}
          value={q.question}
          onChange={(e) => {
            const copy = [...questions];
            copy[activeIdx] = { ...q, question: e.target.value };
            setQuestions(copy);
          }}
          className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
        />

        {/* Options & Live Distribution Bar */}
        <div className="mb-4 space-y-2">
          {q.options.map((opt, idx) => {
            const pct = totalVotes > 0 ? Math.round((votes[idx] / totalVotes) * 100) : 0;
            const isCorrect = idx === q.correctIdx;
            return (
              <div
                key={idx}
                onClick={() => {
                  if (launched) {
                    setVotes((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)));
                  }
                }}
                className={`relative overflow-hidden rounded-xl border p-2.5 text-xs transition cursor-pointer ${
                  launched && isCorrect
                    ? 'border-emerald-400 bg-emerald-50/70'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}
              >
                {launched && (
                  <div
                    className={`absolute inset-y-0 left-0 opacity-20 ${
                      isCorrect ? 'bg-emerald-500' : 'bg-indigo-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="relative flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    {String.fromCharCode(65 + idx)}. {opt}
                  </span>
                  {launched && (
                    <span className="font-mono text-[11px] font-bold text-slate-600">
                      {votes[idx]} ({pct}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          {!launched ? (
            <button
              type="button"
              data-testid="launch-quiz-btn"
              onClick={() => setLaunched(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Luncurkan ke Kelas
            </button>
          ) : (
            <span className="text-xs font-semibold text-emerald-700">
              Live Poll Aktif · {totalVotes} jawaban masuk (klik opsi untuk simulasi jawaban)
            </span>
          )}

          {onShowExplanationOnBoard && (
            <button
              type="button"
              onClick={() => {
                onShowExplanationOnBoard(q.explanationLatex);
                onClose();
              }}
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              Tampilkan Pembahasan
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
