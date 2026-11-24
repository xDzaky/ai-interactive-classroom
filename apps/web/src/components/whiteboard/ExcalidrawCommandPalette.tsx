/**
 * ExcalidrawCommandPalette.tsx — Shared Excalidraw Command Palette (Ctrl+K) + Mermaid-to-Diagram Modal (V6)
 * Works seamlessly in BOTH /whiteboard and /notes!
 */
import React, { useMemo, useState } from 'react';
import { parseMermaidToDiagram, type MermaidDiagramResult } from '@/lib/excalidrawEngine';

export interface CommandPaletteAction {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  run: () => void;
}

export interface ExcalidrawCommandPaletteProps {
  open: boolean;
  actions: CommandPaletteAction[];
  onClose: () => void;
}

export const ExcalidrawCommandPalette: React.FC<ExcalidrawCommandPaletteProps> = ({
  open,
  actions,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
    );
  }, [actions, query]);

  if (!open) return null;

  return (
    <div
      data-testid="excalidraw-command-palette"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 pt-20 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center border-b border-slate-100 px-4 py-3">
          <span className="mr-2 text-slate-400">⌘</span>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Cari perintah, alat, ekspor SVG/JSON, Zen Mode, Mermaid..."
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 hover:bg-slate-200"
          >
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">Perintah tidak ditemukan</div>
          ) : (
            filtered.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  act.run();
                  setQuery('');
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs hover:bg-indigo-50"
              >
                <div>
                  <span className="font-semibold text-slate-800">{act.label}</span>
                  <span className="ml-2 text-[10px] text-slate-400">{act.category}</span>
                </div>
                {act.shortcut && (
                  <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                    {act.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * Mermaid -> Editable Excalidraw Diagram Modal
 * ========================================================================== */

const DEFAULT_MERMAID = `flowchart TD
  A[Mulai Materi] --> B{Paham Rumus?}
  B -->|Ya| C((Latihan Kuis))
  B -->|Belum| D[Lihat Contoh 3D]
  D --> B`;

export interface MermaidToDiagramModalProps {
  open: boolean;
  onInsert: (diagram: MermaidDiagramResult) => void;
  onClose: () => void;
}

export const MermaidToDiagramModal: React.FC<MermaidToDiagramModalProps> = ({
  open,
  onInsert,
  onClose,
}) => {
  const [code, setCode] = useState(DEFAULT_MERMAID);
  const preview = useMemo(() => parseMermaidToDiagram(code, 40, 30), [code]);

  if (!open) return null;

  return (
    <div
      data-testid="mermaid-diagram-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
    >
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Mermaid → Diagram Kanvas (Gaya Excalidraw)</h3>
            <p className="text-[11px] text-slate-500">
              Ketik sintaks flowchart Mermaid — otomatis diubah menjadi kotak, belah ketupat, elips, dan panah yang bisa diedit
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200">
            Tutup
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          <textarea
            rows={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-emerald-300 outline-none focus:border-indigo-400"
          />
          <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-1 text-[10px] font-bold uppercase text-slate-400">
              Pratinjau ({preview.nodes.length} node, {preview.edges.length} panah)
            </div>
            <svg viewBox="0 0 560 440" className="h-64 w-full bg-white rounded-lg border border-slate-100">
              {preview.edges.map((e, i) => (
                <g key={i}>
                  <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="#1e1e1e" strokeWidth="2" />
                  {e.label && (
                    <text x={(e.x1 + e.x2) / 2} y={(e.y1 + e.y2) / 2 - 4} textAnchor="middle" fontSize="10" fill="#4f46e5" fontWeight="bold">
                      {e.label}
                    </text>
                  )}
                </g>
              ))}
              {preview.nodes.map((n) => (
                <g key={n.id}>
                  {n.shape === 'rect' && (
                    <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="10" fill={n.bgColor} stroke="#1e1e1e" strokeWidth="2" />
                  )}
                  {n.shape === 'ellipse' && (
                    <ellipse cx={n.x + n.w / 2} cy={n.y + n.h / 2} rx={n.w / 2} ry={n.h / 2} fill={n.bgColor} stroke="#1e1e1e" strokeWidth="2" />
                  )}
                  {n.shape === 'rhombus' && (
                    <polygon
                      points={`${n.x + n.w / 2},${n.y} ${n.x + n.w},${n.y + n.h / 2} ${n.x + n.w / 2},${n.y + n.h} ${n.x},${n.y + n.h / 2}`}
                      fill={n.bgColor}
                      stroke="#1e1e1e"
                      strokeWidth="2"
                    />
                  )}
                  <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e1e1e">
                    {n.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
            Batal
          </button>
          <button
            type="button"
            data-testid="insert-mermaid-diagram-btn"
            onClick={() => {
              onInsert(parseMermaidToDiagram(code, 220, 120));
              onClose();
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Pasang ke Kanvas
          </button>
        </div>
      </div>
    </div>
  );
};
