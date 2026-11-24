/**
 * ExcalidrawToolbar.tsx — Iconic Excalidraw Top-Center Floating Tool Dock (V6)
 *
 * Numbered 1-9 tools + Tool Lock (Q) + Hand (H) + Frame (F) + Laser (K) + More Shapes + Mermaid Diagram!
 * Reusable in BOTH /whiteboard and /notes!
 */
import React, { useState } from 'react';
import type { ToolType } from '@/hooks/useWhiteboardTool';

export interface ExcalidrawToolbarProps {
  activeTool: ToolType;
  toolLocked: boolean;
  darkCanvas?: boolean;
  onSelectTool: (t: ToolType) => void;
  onToggleLock: () => void;
  onInsertImage?: () => void;
  onOpenMermaid?: () => void;
  onOpenCommandPalette?: () => void;
}

interface DockItem {
  tool: ToolType;
  icon: string;
  label: string;
  keyHint: string;
}

const MAIN_DOCK: DockItem[] = [
  { tool: 'hand', icon: '✋', label: 'Geser Kanvas (H / Spasi)', keyHint: 'H' },
  { tool: 'select', icon: '↖', label: 'Seleksi (1 / V)', keyHint: '1' },
  { tool: 'rect', icon: '▭', label: 'Persegi Panjang (2 / R)', keyHint: '2' },
  { tool: 'rhombus', icon: '◇', label: 'Belah Ketupat / Diamond (3 / D)', keyHint: '3' },
  { tool: 'ellipse', icon: '◯', label: 'Elips / Lingkaran (4 / O)', keyHint: '4' },
  { tool: 'arrow', icon: '→', label: 'Panah Terikat (5 / A)', keyHint: '5' },
  { tool: 'line', icon: '╱', label: 'Garis (6 / L)', keyHint: '6' },
  { tool: 'pen', icon: '✏️', label: 'Gambar Bebas (7 / P)', keyHint: '7' },
  { tool: 'text', icon: 'A', label: 'Teks (8 / T)', keyHint: '8' },
  { tool: 'eraser', icon: '⌫', label: 'Penghapus (0 / E)', keyHint: '0' },
  { tool: 'frame', icon: '#', label: 'Frame Slide (F)', keyHint: 'F' },
  { tool: 'laser', icon: '🔴', label: 'Pena Laser (K)', keyHint: 'K' },
];

const EXTRA_SHAPES: DockItem[] = [
  { tool: 'triangle', icon: '△', label: 'Segitiga', keyHint: '' },
  { tool: 'highlighter', icon: '🖍️', label: 'Stabilo', keyHint: '' },
  { tool: 'pentagon', icon: '⬠', label: 'Segi Lima', keyHint: '' },
  { tool: 'hexagon', icon: '⬡', label: 'Segi Enam', keyHint: '' },
  { tool: 'star', icon: '☆', label: 'Bintang', keyHint: '' },
];

export const ExcalidrawToolbar: React.FC<ExcalidrawToolbarProps> = ({
  activeTool,
  toolLocked,
  darkCanvas = false,
  onSelectTool,
  onToggleLock,
  onInsertImage,
  onOpenMermaid,
  onOpenCommandPalette,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const shellCls = darkCanvas
    ? 'border-slate-700 bg-slate-900/95 text-slate-200'
    : 'border-slate-200/90 bg-white/95 text-slate-700';

  return (
    <div
      data-testid="excalidraw-top-dock"
      role="toolbar"
      aria-label="Excalidraw Tool Dock"
      className={`pointer-events-auto relative flex items-center gap-0.5 rounded-2xl border px-1.5 py-1 shadow-xl backdrop-blur-md select-none ${shellCls}`}
    >
      {/* Tool Lock (Q) — Keep tool active after drawing */}
      <button
        type="button"
        data-testid="excalidraw-tool-lock"
        onClick={onToggleLock}
        aria-pressed={toolLocked}
        title="Kunci Alat (Q) — tetap gunakan alat yang sama setelah menggambar"
        className={`flex h-9 w-8 items-center justify-center rounded-xl text-xs font-bold transition ${
          toolLocked
            ? 'bg-indigo-600 text-white shadow-xs'
            : darkCanvas
              ? 'text-slate-400 hover:bg-slate-800'
              : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        {toolLocked ? '🔒' : '🔓'}
      </button>

      <div className={`mx-0.5 h-5 w-px ${darkCanvas ? 'bg-slate-700' : 'bg-slate-200'}`} />

      {MAIN_DOCK.map((item) => {
        const active = activeTool === item.tool;
        return (
          <button
            key={item.tool}
            type="button"
            data-testid={`excalidraw-tool-${item.tool}`}
            onClick={() => {
              onSelectTool(item.tool);
              setMoreOpen(false);
            }}
            aria-label={item.label}
            aria-pressed={active}
            title={item.label}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : darkCanvas
                  ? 'text-slate-200 hover:bg-slate-800'
                  : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>{item.icon}</span>
            {item.keyHint && (
              <span
                className={`absolute bottom-0.5 right-1 text-[8px] font-mono leading-none ${
                  active ? 'text-indigo-200' : 'opacity-45'
                }`}
              >
                {item.keyHint}
              </span>
            )}
          </button>
        );
      })}

      {/* Image Insert (9) */}
      {onInsertImage && (
        <button
          type="button"
          data-testid="excalidraw-tool-image"
          onClick={onInsertImage}
          title="Sisipkan Gambar (9 / Ctrl+V)"
          className={`relative flex h-9 w-9 items-center justify-center rounded-xl text-sm transition ${
            darkCanvas ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>🖼️</span>
          <span className="absolute bottom-0.5 right-1 text-[8px] font-mono leading-none opacity-45">9</span>
        </button>
      )}

      {/* More Tools + Mermaid Diagram */}
      <div className="relative">
        <button
          type="button"
          data-testid="excalidraw-more-tools"
          onClick={() => setMoreOpen((v) => !v)}
          title="Bentuk Lainnya & Mermaid ke Diagram"
          className={`flex h-9 w-8 items-center justify-center rounded-xl text-sm font-bold transition ${
            moreOpen
              ? 'bg-indigo-600 text-white'
              : darkCanvas
                ? 'text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ⋯
        </button>
        {moreOpen && (
          <div
            className={`absolute right-0 top-11 z-50 w-52 rounded-2xl border p-2 shadow-2xl ${shellCls}`}
          >
            <div className="mb-1 px-2 text-[10px] font-bold uppercase opacity-55">Bentuk Tambahan</div>
            <div className="grid grid-cols-5 gap-1 mb-2">
              {EXTRA_SHAPES.map((s) => (
                <button
                  key={s.tool}
                  type="button"
                  onClick={() => {
                    onSelectTool(s.tool);
                    setMoreOpen(false);
                  }}
                  title={s.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                    activeTool === s.tool ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {s.icon}
                </button>
              ))}
            </div>
            {onOpenMermaid && (
              <button
                type="button"
                data-testid="open-mermaid-btn"
                onClick={() => {
                  setMoreOpen(false);
                  onOpenMermaid();
                }}
                className="flex w-full items-center gap-2 rounded-xl bg-indigo-50 px-2.5 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-100"
              >
                <span>🔀</span>
                <span>Mermaid → Diagram</span>
              </button>
            )}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onOpenCommandPalette();
                }}
                className="mt-1 flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs font-medium hover:bg-slate-100"
              >
                <span>Command Palette</span>
                <kbd className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[9px] text-slate-700">Ctrl+K</kbd>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
