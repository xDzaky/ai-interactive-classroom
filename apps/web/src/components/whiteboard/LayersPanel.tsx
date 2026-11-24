/**
 * LayersPanel.tsx — Layers & Locked Tracing-Image Management Panel (V5)
 *
 * Ensures locked tracing images can always be unlocked, re-layered, or hidden in 1 click.
 */
import React from 'react';
import type { BoardObject } from '@ai-classroom/whiteboard-core';

export interface LayersPanelProps {
  open: boolean;
  objects: BoardObject[];
  selectedIds: string[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onUpdateProps: (id: string, patch: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  image: 'Gambar',
  viz_solid: 'Bangun 3D',
  math_block: 'Blok Rumus',
  textbook_graph: 'Grafik Buku',
  stat_chart: 'Chart Statistik',
  trig_proof: 'Bukti Trigonometri',
  simulation: 'Simulasi',
};

export const LayersPanel: React.FC<LayersPanelProps> = ({
  open,
  objects,
  selectedIds,
  onClose,
  onSelect,
  onUpdateProps,
  onDelete,
}) => {
  if (!open) return null;

  return (
    <aside
      data-testid="layers-panel"
      className="fixed top-16 right-4 z-40 flex max-h-[72vh] w-72 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/98 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Lapisan (Layers)</h3>
          <p className="text-[10px] text-slate-500">{objects.length} objek · klik gembok untuk buka kunci</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200"
        >
          Tutup
        </button>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {objects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            Belum ada objek pada papan. Tempel gambar (Ctrl+V) atau tambahkan bangun/rumus.
          </div>
        ) : (
          [...objects].reverse().map((obj) => {
            const p = obj.props as Record<string, unknown>;
            const locked = Boolean(p.locked);
            const visible = p.visible !== false;
            const opacity = typeof p.opacity === 'number' ? p.opacity : 1;
            const label = String(p.label ?? TYPE_LABEL[obj.object_type] ?? obj.object_type);
            const isSel = selectedIds.includes(obj.id);

            return (
              <div
                key={obj.id}
                onClick={() => !locked && onSelect(obj.id)}
                className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-xs transition ${
                  isSel
                    ? 'border-indigo-500 bg-indigo-50/70'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-slate-800">{label}</div>
                  <div className="text-[10px] text-slate-500">
                    {TYPE_LABEL[obj.object_type] ?? obj.object_type}
                    {obj.object_type === 'image' ? ` · ${Math.round(opacity * 100)}%` : ''}
                    {locked ? ' · Terkunci' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    data-testid={`layer-visibility-${obj.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateProps(obj.id, { visible: !visible });
                    }}
                    title={visible ? 'Sembunyikan' : 'Tampilkan'}
                    className={`rounded-md px-1.5 py-1 text-[10px] font-bold ${visible ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-400 line-through'}`}
                  >
                    {visible ? 'Tampil' : 'Sembunyi'}
                  </button>
                  <button
                    type="button"
                    data-testid={`layer-lock-${obj.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateProps(obj.id, { locked: !locked });
                    }}
                    title={locked ? 'Buka Kunci' : 'Kunci'}
                    className={`rounded-md px-1.5 py-1 text-[10px] font-bold ${
                      locked ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {locked ? 'Buka' : 'Kunci'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(obj.id);
                    }}
                    title="Hapus"
                    className="rounded-md px-1.5 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
