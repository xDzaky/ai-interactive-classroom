/**
 * ShapeSuggestionChip — P10-T11
 * Floating suggestion chip shown near stroke bounding box when recognizer returns 'suggest'.
 * Also provides revert-to-ink pill when shape was auto-snapped.
 */
import React, { useEffect } from 'react';

export interface ShapeSuggestionChipProps {
  visible: boolean;
  shapeKind: string;
  position: { x: number; y: number };
  onAccept: () => void;
  onDismiss: () => void;
}

export function ShapeSuggestionChip({
  visible,
  shapeKind,
  position,
  onAccept,
  onDismiss,
}: ShapeSuggestionChipProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  const SHAPE_NAMES: Record<string, string> = {
    line: 'Garis',
    circle: 'Lingkaran',
    ellipse: 'Elips',
    triangle: 'Segitiga',
    right_triangle: 'Segitiga Siku-siku',
    rect: 'Persegi Panjang',
    square: 'Persegi',
    rhombus: 'Belah Ketupat',
    pentagon: 'Segi Lima',
    hexagon: 'Segi Enam',
    star: 'Bintang',
  };

  const displayName = SHAPE_NAMES[shapeKind] || shapeKind;

  return (
    <div
      data-testid="shape-suggestion-chip"
      className="absolute z-40 flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-slate-900/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 pointer-events-auto"
      style={{
        left: `${position.x}px`,
        top: `${Math.max(position.y - 38, 10)}px`,
      }}
    >
      <span className="text-indigo-400">✨</span>
      <span>Jadikan <strong className="font-semibold text-indigo-300">{displayName}</strong>?</span>
      <button
        onClick={onAccept}
        aria-label={`Konfirmasi ubah ke ${displayName}`}
        className="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-indigo-500"
      >
        Ya
      </button>
      <button
        onClick={onDismiss}
        aria-label="Tolak saran bentuk"
        className="ml-0.5 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
      >
        ✕
      </button>
    </div>
  );
}

export interface ShapeRevertToastProps {
  visible: boolean;
  shapeKind: string;
  onRevert: () => void;
  onDismiss: () => void;
}

export function ShapeRevertToast({
  visible,
  shapeKind,
  onRevert,
  onDismiss,
}: ShapeRevertToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      data-testid="shape-revert-toast"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2 text-xs text-slate-200 shadow-2xl backdrop-blur-md pointer-events-auto"
    >
      <span className="text-emerald-400 font-medium">Bentuk otomatis dikenali</span>
      <button
        onClick={onRevert}
        className="rounded bg-slate-800 px-2 py-1 font-semibold text-sky-400 transition hover:bg-slate-700 hover:text-sky-300"
      >
        Kembalikan coretan
      </button>
      <button
        onClick={onDismiss}
        className="text-slate-400 transition hover:text-white"
        aria-label="Tutup notifikasi"
      >
        ✕
      </button>
    </div>
  );
}
