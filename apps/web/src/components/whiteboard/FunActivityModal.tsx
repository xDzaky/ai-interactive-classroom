/**
 * FunActivityModal.tsx — AI Fun Teaching (Math Challenge & Geometry Puzzle)
 * Interactive classroom engagement activity launched from the simplified dock.
 */
import React, { useState } from 'react';

interface QuizQuestion {
  q: string;
  options: string[];
  answerIdx: number;
  explanation: string;
}

const QUESTIONS: QuizQuestion[] = [
  {
    q: 'Sebuah kubus memiliki panjang rusuk 5 cm. Berapakah volumenya?',
    options: ['25 cm³', '100 cm³', '125 cm³', '150 cm³'],
    answerIdx: 2,
    explanation: 'Volume kubus V = s³ = 5 × 5 × 5 = 125 cm³.',
  },
  {
    q: 'Menurut rumus Euler untuk setiap polihedron cembung, nilai V − E + F selalu sama dengan...',
    options: ['0', '1', '2', '4'],
    answerIdx: 2,
    explanation: 'Teorema Euler: Titik sudut (V) − Rusuk (E) + Sisi (F) = 2.',
  },
  {
    q: 'Jika sebuah kerucut dipotong oleh bidang miring yang memotong seluruh selimutnya, bentuk penampang irisannya adalah...',
    options: ['Elips', 'Segitiga', 'Persegi', 'Trapesium'],
    answerIdx: 0,
    explanation: 'Irisan kerucut oleh bidang miring tertutup selalu menghasilkan Elips.',
  },
];

export interface FunActivityModalProps {
  open: boolean;
  onClose: () => void;
}

export const FunActivityModal: React.FC<FunActivityModalProps> = ({ open, onClose }) => {
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  if (!open) return null;

  const current = QUESTIONS[qIdx];
  const isCorrect = picked === current.answerIdx;

  const handlePick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === current.answerIdx) setScore((s) => s + 1);
  };

  const handleNext = () => {
    setPicked(null);
    setQIdx((i) => (i + 1) % QUESTIONS.length);
  };

  return (
    <div
      data-testid="fun-activity-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">🎯 Tantangan Geometri & Matematika</h3>
            <p className="text-[11px] text-slate-500">
              Soal {qIdx + 1}/{QUESTIONS.length} · Skor Kelas: <strong>{score}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <p className="mb-3 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-800">
          {current.q}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {current.options.map((opt, idx) => {
            const stateClass =
              picked === null
                ? 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 text-slate-800'
                : idx === current.answerIdx
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                : picked === idx
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-slate-100 bg-slate-50 text-slate-400';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePick(idx)}
                className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${stateClass}`}
              >
                {String.fromCharCode(65 + idx)}. {opt}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div
            className={`mt-3 rounded-xl p-2.5 text-xs ${
              isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
            }`}
          >
            <div className="font-bold">{isCorrect ? '✅ Tepat sekali!' : '💡 Hampir benar!'}</div>
            <div className="mt-0.5">{current.explanation}</div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleNext}
            className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Soal Berikutnya →
          </button>
        </div>
      </div>
    </div>
  );
};
