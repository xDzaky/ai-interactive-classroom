/**
 * Dev Stroke Recorder (P10-T10)
 * Activated when URL contains ?record=<label>.
 * Captures drawn strokes and provides JSON export for model testing corpus.
 */
import React, { useState, useEffect } from 'react';
import type { Pt } from '@ai-classroom/sketch-core';

export interface RecordedStrokeSample {
  label: string;
  points: Pt[];
  scale: number;
  pointerType: string;
  timestamp: number;
}

export interface StrokeRecorderProps {
  currentScale?: number;
  onSampleCaptured?: (sample: RecordedStrokeSample) => void;
}

export function StrokeRecorder({ currentScale = 1.0 }: StrokeRecorderProps) {
  const [label, setLabel] = useState<string | null>(null);
  const [samples, setSamples] = useState<RecordedStrokeSample[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const recLabel = params.get('record');
    if (recLabel) {
      setLabel(recLabel);
    }
  }, []);

  // Listen for custom stroke capture event dispatched by WhiteboardCanvas
  useEffect(() => {
    if (!label) return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ points: Pt[]; pointerType?: string }>;
      if (!customEvent.detail || !customEvent.detail.points) return;

      const newSample: RecordedStrokeSample = {
        label,
        points: customEvent.detail.points,
        scale: currentScale,
        pointerType: customEvent.detail.pointerType || 'pen',
        timestamp: Date.now(),
      };

      setSamples((prev) => [...prev, newSample]);
    };

    window.addEventListener('whiteboard-stroke-completed', handler);
    return () => window.removeEventListener('whiteboard-stroke-completed', handler);
  }, [label, currentScale]);

  if (!label) return null;

  const downloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(samples, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${label}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      data-testid="stroke-recorder"
      className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 rounded-xl border border-rose-500/50 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md"
      style={{ minWidth: 260 }}
    >
      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-rose-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">RECORDER</span>
        </div>
        <span className="rounded bg-rose-950/80 px-2 py-0.5 font-mono text-xs text-rose-300">
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-400">Sampel terekam:</span>
        <span className="font-mono font-bold text-emerald-400">{samples.length}</span>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={downloadJson}
          disabled={samples.length === 0}
          className="flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:opacity-40"
        >
          Download JSON ({samples.length})
        </button>
        <button
          onClick={() => setSamples([])}
          disabled={samples.length === 0}
          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
