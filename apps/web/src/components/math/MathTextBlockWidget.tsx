/**
 * MathTextBlockWidget.tsx — Auto-Format Math Editor & Calculator on Whiteboard
 *
 * Uses MathLive (`smartSuperscript`, `smartFence`, `smartMode`, `inlineShortcuts`)
 * so typing `8^2`, `1/2`, `sqrt`, `pi`, `z=sin(x)*cos(y)` formats instantaneously.
 * Provides 1-click `= Hitung`, `Langkah`, and `Visualisasikan` (bidirectional link to 2D/3D objects).
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  classifyMathIntent,
  synthesizeVisualFromFormula,
  type MathVisualIntent,
  type SynthesizedVisualSpec,
} from '@ai-classroom/math-core';

export interface MathTextBlockWidgetProps {
  id: string;
  latex: string;
  selected?: boolean;
  onSelect?: () => void;
  onChangeLatex: (nextLatex: string) => void;
  onVisualize: (intent: MathVisualIntent) => void;
  onSynthesizeVisual?: (spec: SynthesizedVisualSpec) => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const QUICK_SNIPPETS = [
  { label: 'x²', insert: '^2' },
  { label: 'a/b', insert: '\\frac{#0}{#?}' },
  { label: '√x', insert: '\\sqrt{#0}' },
  { label: 'π', insert: '\\pi' },
  { label: '∫', insert: '\\int' },
  { label: 'sin', insert: '\\sin(#0)' },
];

export const MathTextBlockWidget: React.FC<MathTextBlockWidgetProps> = ({
  id,
  latex,
  selected = false,
  onSelect,
  onChangeLatex,
  onVisualize,
  onSynthesizeVisual,
  onMovePosition,
  onDelete,
  onDuplicate,
}) => {
  const mathFieldRef = useRef<HTMLElement | null>(null);
  const [mathLiveReady, setMathLiveReady] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showResult, setShowResult] = useState(true);

  // Lazy-import mathlive web component once in browser
  useEffect(() => {
    let active = true;
    import('mathlive')
      .then((ml) => {
        // Prevent 404 console warning when mathlive fonts are not copied into /assets/fonts
        const mfe = (ml as unknown as { MathfieldElement?: { fontsDirectory?: string | null } }).MathfieldElement;
        if (mfe) mfe.fontsDirectory = null;
        if (active) setMathLiveReady(true);
      })
      .catch(() => {
        // Fallback to plain auto-format input if headless/jsdom
      });
    return () => {
      active = false;
    };
  }, []);

  // Configure MathLive smart options when mounted
  useEffect(() => {
    const mf = mathFieldRef.current as (HTMLElement & {
      value?: string;
      smartMode?: boolean;
      smartFence?: boolean;
      smartSuperscript?: boolean;
      mathVirtualKeyboardPolicy?: string;
      inlineShortcuts?: Record<string, string>;
      executeCommand?: (cmd: unknown) => void;
    }) | null;
    if (!mf || !mathLiveReady) return;

    mf.smartMode = true;
    mf.smartFence = true;
    mf.smartSuperscript = true;
    mf.mathVirtualKeyboardPolicy = 'manual';
    if (mf.value !== latex) {
      mf.value = latex;
    }

    const onInput = () => {
      if (typeof mf.value === 'string') {
        onChangeLatex(mf.value);
      }
    };
    mf.addEventListener('input', onInput);
    return () => mf.removeEventListener('input', onInput);
  }, [mathLiveReady, latex, onChangeLatex]);

  const intent = useMemo(() => classifyMathIntent(latex), [latex]);
  const synthesized = useMemo(() => synthesizeVisualFromFormula(latex), [latex]);

  const handleDragStart = (e: React.PointerEvent) => {
    if (!onMovePosition) return;
    e.stopPropagation();
    let lastX = e.clientX;
    let lastY = e.clientY;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (dx !== 0 || dy !== 0) onMovePosition(dx, dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const insertSnippet = (snippet: string) => {
    const mf = mathFieldRef.current as (HTMLElement & { executeCommand?: (cmd: unknown) => void }) | null;
    if (mf && typeof mf.executeCommand === 'function') {
      mf.executeCommand(['insert', snippet]);
      mf.focus();
    } else {
      onChangeLatex(`${latex}${snippet.replace(/#0|#\?/g, '')}`);
    }
  };

  const visualButtonLabel =
    intent?.kind === 'function_2d'
      ? 'Plot Grafik 2D'
      : intent?.kind === 'surface_3d'
      ? 'Plot Permukaan 3D'
      : intent?.kind === 'solid_3d'
      ? 'Buat Bangun 3D'
      : 'Visualisasikan';

  return (
    <div
      data-testid={`math-block-${id}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={`relative flex flex-col rounded-2xl border bg-white/98 p-3 shadow-lg transition-shadow ${
        selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
      }`}
      style={{ minWidth: 280 }}
    >
      {/* Top Drag Bar */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div
          onPointerDown={handleDragStart}
          className="flex cursor-grab items-center gap-1.5 text-[10px] font-bold tracking-wide text-indigo-600 uppercase active:cursor-grabbing"
          title="Seret blok matematika"
        >
          <span>∑</span>
          <span>Blok Matematika</span>
        </div>
        <div className="flex items-center gap-1">
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              title="Duplikat"
            >
              📋
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-red-50 hover:text-red-600"
              title="Hapus"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* MathLive Interactive Auto-Format Input (or fallback input) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 focus-within:border-indigo-400 focus-within:bg-white">
        {mathLiveReady ? (
          // @ts-expect-error math-field is a MathLive custom web component
          <math-field
            ref={mathFieldRef}
            data-testid={`math-field-${id}`}
            style={{
              width: '100%',
              fontSize: '18px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#0f172a',
            }}
          />
        ) : (
          <input
            type="text"
            data-testid={`math-fallback-input-${id}`}
            value={latex}
            onChange={(e) => onChangeLatex(e.target.value)}
            placeholder="Ketik 8^2, 1/2, y=x^2-3, z=sin(x)*cos(y)..."
            className="w-full bg-transparent font-mono text-sm text-slate-900 outline-none"
          />
        )}
      </div>

      {/* Quick math shortcuts when selected */}
      {selected && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {QUICK_SNIPPETS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => insertSnippet(s.insert)}
              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Live Evaluation Result */}
      {showResult && intent?.kind === 'arithmetic' && (
        <div
          data-testid={`math-result-${id}`}
          className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800"
        >
          <span>= {intent.exactLabel}</span>
        </div>
      )}

      {/* Step-by-Step Breakdown */}
      {showSteps && intent?.kind === 'arithmetic' && (
        <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
          {intent.steps.map((step, i) => (
            <div key={i} className="font-mono">
              {i + 1}. {step}
            </div>
          ))}
        </div>
      )}

      {/* Contextual Action Bar */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2"
      >
        <button
          type="button"
          onClick={() => setShowResult((v) => !v)}
          className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
        >
          = Hitung
        </button>
        <button
          type="button"
          onClick={() => setShowSteps((v) => !v)}
          className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
        >
          Langkah
        </button>
        {synthesized && onSynthesizeVisual ? (
          <button
            type="button"
            data-testid={`math-synthesize-btn-${id}`}
            onClick={() => onSynthesizeVisual(synthesized)}
            className="ml-auto rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            {synthesized.kind === 'trig_identity_proof'
              ? 'Diagram Bukti Trig'
              : synthesized.kind === 'stat_chart'
                ? 'Jadikan Chart'
                : 'Grafik Buku Teks'}
          </button>
        ) : (
          intent &&
          intent.kind !== 'arithmetic' && (
            <button
              type="button"
              data-testid={`math-visualize-btn-${id}`}
              onClick={() => onVisualize(intent)}
              className="ml-auto rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-indigo-700"
            >
              ✨ {visualButtonLabel}
            </button>
          )
        )}
      </div>
    </div>
  );
};
