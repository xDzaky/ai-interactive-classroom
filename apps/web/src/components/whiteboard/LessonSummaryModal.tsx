/**
 * LessonSummaryModal.tsx — P16-T01 / P16-T02
 * Deterministic Micro-Lesson & Classroom Highlights generated purely from the
 * whiteboard event log (zero audio/video recording, UU PDP compliant).
 */

import React, { useMemo } from 'react';
import type { BoardState, WhiteboardHistory } from '@ai-classroom/whiteboard-core';
import { getActiveScene } from '@ai-classroom/whiteboard-core';

export interface LessonSummaryModalProps {
  boardState: BoardState;
  history: WhiteboardHistory;
  onClose: () => void;
}

export const LessonSummaryModal: React.FC<LessonSummaryModalProps> = ({
  boardState,
  history,
  onClose,
}) => {
  const stats = useMemo(() => {
    const scene = getActiveScene(boardState);
    const objects = Object.values(scene.objects);
    const strokes = Object.values(scene.strokes);
    const solids = objects.filter((o) => o.object_type === 'viz_solid');
    const graphs = objects.filter((o) => o.object_type === 'viz_graph');
    const shapes2D = objects.filter(
      (o) => !['viz_solid', 'viz_graph', 'text', 'annotation'].includes(o.object_type)
    );

    const highlights = history.past.slice(-8).map((entry, idx) => {
      const type = entry.event.event_type;
      const p = entry.event.payload as Record<string, unknown>;
      if (type === 'batch') {
        return { id: idx, icon: '🧊', label: 'Konversi Sketsa 2D → Bangun Ruang 3D' };
      }
      if (type === 'object.created' && p.object_type === 'viz_solid') {
        const props = (p.props as Record<string, unknown>) ?? {};
        return { id: idx, icon: '🧊', label: `Menampilkan Bangun 3D (${String(props.label ?? props.solid_type ?? 'Solid')})` };
      }
      if (type === 'object.created' && p.object_type === 'viz_graph') {
        return { id: idx, icon: '📈', label: 'Menampilkan Grafik Fungsi Dinamis' };
      }
      if (type === 'object.created') {
        return { id: idx, icon: '📐', label: `Menggambar Bentuk Geometris (${String(p.object_type)})` };
      }
      if (type === 'stroke.committed') {
        return { id: idx, icon: '✏️', label: 'Coretan Penjelasan Guru' };
      }
      return { id: idx, icon: '✨', label: `Aksi Papan: ${type}` };
    });

    return {
      strokeCount: strokes.length,
      shape2DCount: shapes2D.length,
      solidCount: solids.length,
      graphCount: graphs.length,
      totalEvents: history.past.length,
      highlights,
    };
  }, [boardState, history]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ringkasan Micro-Lesson"
      data-testid="lesson-summary-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ringkasan Micro-Lesson & Highlight Kelas
              </h3>
              <p className="text-[11px] text-slate-500">
                Dihasilkan dari log aktivitas papan (tanpa rekaman audio/video siswa)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Ringkasan"
            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200">
            <div className="text-lg font-extrabold text-slate-800">{stats.strokeCount}</div>
            <div className="text-[10px] font-medium text-slate-500">Coretan</div>
          </div>
          <div className="rounded-xl bg-indigo-50 p-2.5 border border-indigo-200">
            <div className="text-lg font-extrabold text-indigo-700">{stats.shape2DCount}</div>
            <div className="text-[10px] font-medium text-indigo-600">Bentuk 2D</div>
          </div>
          <div className="rounded-xl bg-cyan-50 p-2.5 border border-cyan-200">
            <div className="text-lg font-extrabold text-cyan-700">{stats.solidCount}</div>
            <div className="text-[10px] font-medium text-cyan-600">Bangun 3D</div>
          </div>
          <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200">
            <div className="text-lg font-extrabold text-emerald-700">{stats.graphCount}</div>
            <div className="text-[10px] font-medium text-emerald-600">Grafik 2D</div>
          </div>
        </div>

        {/* Timeline Highlights */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-700 mb-2">
            Urutan Momen Pembelajaran ({stats.totalEvents} total aksi)
          </div>
          {stats.highlights.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Belum ada aktivitas di papan. Mulai menggambar atau sisipkan Bangun 3D untuk merekam micro-lesson.
            </div>
          ) : (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
              {stats.highlights.map((h) => (
                <li
                  key={h.id}
                  className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 border border-slate-100"
                >
                  <span>{h.icon}</span>
                  <span>{h.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-600"
          >
            ✓ Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
