/**
 * FormulaToGraphModal.tsx — P14-T02 / P14-T03
 * Converts handwritten/typed math equations into live dynamic viz_graph objects
 * directly on the whiteboard, with teacher confirmation and parameter presets.
 */

import React, { useState } from 'react';

export interface FormulaToGraphModalProps {
  initialExpression?: string;
  onConfirm: (expressions: string[]) => void;
  onClose: () => void;
}

const FORMULA_PRESETS = [
  { label: 'Parabola Kuadrat', expr: 'x^2 - 3' },
  { label: 'Fungsi Sinus', expr: '2 * sin(x)' },
  { label: 'Fungsi Linear', expr: '2*x + 1' },
  { label: 'Fungsi Kubik', expr: '0.25 * x^3 - x' },
  { label: 'Cosinus', expr: 'cos(2*x)' },
];

export const FormulaToGraphModal: React.FC<FormulaToGraphModalProps> = ({
  initialExpression = 'x^2 - 3',
  onConfirm,
  onClose,
}) => {
  const [exprInput, setExprInput] = useState(initialExpression);
  const [coefA, setCoefA] = useState(1);

  const normalizedExpr = exprInput
    .trim()
    .replace(/^y\s*=\s*/i, '')
    .replace(/^f\(x\)\s*=\s*/i, '');

  const finalExpr =
    coefA === 1 ? normalizedExpr : `${coefA} * (${normalizedExpr || 'x'})`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!normalizedExpr) return;
    onConfirm([finalExpr]);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Konversi Rumus ke Grafik Dinamis"
      data-testid="formula-to-graph-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📈</span>
            <h3 className="text-sm font-bold text-slate-900">
              Jadikan Rumus → Grafik Dinamis
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Persamaan Matematika f(x) =
        </label>
        <input
          type="text"
          value={exprInput}
          onChange={(e) => setExprInput(e.target.value)}
          placeholder="Contoh: x^2 - 3 atau sin(x)"
          data-testid="formula-input"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
        />

        {/* Parameter slider a */}
        <div className="mt-3 rounded-xl bg-slate-50 p-3 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Skala Parameter (a)</span>
            <span className="font-mono font-bold text-indigo-600">a = {coefA}</span>
          </div>
          <input
            type="range"
            min={-3}
            max={4}
            step={0.5}
            value={coefA}
            onChange={(e) => setCoefA(parseFloat(e.target.value))}
            aria-label="Parameter koefisien a"
            className="w-full accent-indigo-600"
          />
          <div className="mt-1 text-[11px] text-slate-500">
            Pratinjau rumus: <code className="font-mono font-semibold text-slate-800">y = {finalExpr}</code>
          </div>
        </div>

        {/* Presets */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FORMULA_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setExprInput(p.expr);
                setCoefA(1);
              }}
              className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            data-testid="confirm-formula-graph-btn"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95"
          >
            ✓ Tampilkan di Papan
          </button>
        </div>
      </form>
    </div>
  );
};
