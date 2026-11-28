/**
 * BoardInBoardOverlay.tsx — Floating Mini Scratchpad & Transparent Annotation Layer (V8)
 *
 * Adapted from Honghe Whiteboard (`GCBoardInBoard.exe`):
 * - Draggable floating scratchpad above Labs, AFFiNE Docs, Games, or Camera
 * - Mode switch: Transparent Overlay vs White Mini-Board vs Dark Chalkboard
 * - Minimize to edge pill & 1-click "Kirim ke Whiteboard" (exports PNG blob)
 */
import React, { useEffect, useRef, useState } from 'react';

export interface BoardInBoardOverlayProps {
  open: boolean;
  onClose: () => void;
  onSendImageToBoard?: (blob: Blob, label: string) => void;
}

export const BoardInBoardOverlay: React.FC<BoardInBoardOverlayProps> = ({
  open,
  onClose,
  onSendImageToBoard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const [pos, setPos] = useState({ x: 36, y: 84 });
  const [minimized, setMinimized] = useState(false);
  const [surface, setSurface] = useState<'white' | 'transparent' | 'dark'>('white');
  const [penColor, setPenColor] = useState('#0f172a');
  const [penWidth, setPenWidth] = useState(3);
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    if (surface === 'dark' && penColor === '#0f172a') setPenColor('#f8fafc');
    else if (surface !== 'dark' && penColor === '#f8fafc') setPenColor('#0f172a');
  }, [surface, penColor]);

  if (!open) return null;

  if (minimized) {
    return (
      <button
        type="button"
        data-testid="bib-minimized-pill"
        onClick={() => setMinimized(false)}
        className="fixed bottom-20 left-4 z-50 flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white/95 px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-xl hover:bg-indigo-50"
      >
        <span>📝</span>
        <span>Papan Mini</span>
      </button>
    );
  }

  const startDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    let lx = e.clientX;
    let ly = e.clientY;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lx;
      const dy = ev.clientY - ly;
      lx = ev.clientX;
      ly = ev.clientY;
      setPos((p) => ({
        x: Math.max(8, Math.min(window.innerWidth - 220, p.x + dx)),
        y: Math.max(52, Math.min(window.innerHeight - 120, p.y + dy)),
      }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const getPt = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 440,
      y: ((e.clientY - rect.top) / rect.height) * 280,
    };
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
  };

  const handleSendToBoard = () => {
    const c = canvasRef.current;
    if (!c || !onSendImageToBoard) return;
    c.toBlob((blob) => {
      if (blob) onSendImageToBoard(blob, 'Coretan Papan Mini');
    }, 'image/png');
  };

  return (
    <div
      data-testid="board-in-board-overlay"
      style={{ left: pos.x, top: pos.y }}
      className={`fixed z-50 flex w-[440px] max-w-[94vw] flex-col overflow-hidden rounded-2xl border shadow-2xl ${
        surface === 'dark'
          ? 'border-slate-700 bg-slate-900/95 text-slate-100'
          : surface === 'transparent'
            ? 'border-indigo-300 bg-white/35 backdrop-blur-[2px] text-slate-900'
            : 'border-slate-200 bg-white text-slate-900'
      }`}
    >
      {/* Drag Header */}
      <div
        onPointerDown={startDrag}
        className="flex cursor-grab items-center justify-between border-b border-slate-200/70 bg-white/90 px-3 py-1.5 text-[11px] text-slate-800 active:cursor-grabbing"
      >
        <span className="font-bold">📝 Papan Mini (Board-in-Board)</span>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {(
            [
              ['white', 'Putih'],
              ['transparent', 'Transparan'],
              ['dark', 'Gelap'],
            ] as const
          ).map(([m, lbl]) => (
            <button
              key={m}
              type="button"
              onClick={() => setSurface(m)}
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                surface === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lbl}
            </button>
          ))}
          <button type="button" onClick={() => setMinimized(true)} className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-200" title="Perkecil">—</button>
          <button type="button" onClick={onClose} className="rounded px-1.5 py-0.5 text-rose-600 hover:bg-rose-50" title="Tutup">×</button>
        </div>
      </div>

      {/* Scratchpad Canvas */}
      <canvas
        ref={canvasRef}
        width={440}
        height={280}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawingRef.current = true;
          lastPtRef.current = getPt(e);
        }}
        onPointerMove={(e) => {
          if (!drawingRef.current || !lastPtRef.current || !canvasRef.current) return;
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return;
          const pt = getPt(e);
          ctx.save();
          ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
          ctx.strokeStyle = penColor;
          ctx.lineWidth = erasing ? 18 : penWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
          ctx.restore();
          lastPtRef.current = pt;
        }}
        onPointerUp={() => {
          drawingRef.current = false;
          lastPtRef.current = null;
        }}
        style={{ touchAction: 'none' }}
        className="h-[260px] w-full cursor-crosshair"
      />

      {/* Compact Footer Controls */}
      <div className="flex items-center justify-between border-t border-slate-200/70 bg-white/92 px-2.5 py-1.5 text-[10px] text-slate-700">
        <div className="flex items-center gap-1">
          {['#0f172a', '#dc2626', '#2563eb', '#16a34a', '#ea580c'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setErasing(false); setPenColor(c); }}
              className={`h-5 w-5 rounded-full border-2 ${!erasing && penColor === c ? 'border-indigo-500 scale-110' : 'border-white shadow-xs'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <button
            type="button"
            onClick={() => setErasing((v) => !v)}
            className={`ml-1 rounded-md px-2 py-0.5 font-bold ${erasing ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => setPenWidth((w) => (w >= 6 ? 2 : w + 2))}
            className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-600"
          >
            {penWidth}px
          </button>
          <button type="button" onClick={clearCanvas} className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold hover:bg-slate-200">
            Bersih
          </button>
        </div>
        {onSendImageToBoard && (
          <button
            type="button"
            onClick={handleSendToBoard}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-500"
          >
            Kirim ke Papan →
          </button>
        )}
      </div>
    </div>
  );
};
