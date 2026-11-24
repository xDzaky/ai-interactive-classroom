/**
 * NotesToolbarPills.tsx — Freenote-Style Dual Floating Pills & Rich Tool Popovers (V5)
 *
 * Implements EVERY tool & popover observed in Freenote screenshots:
 * - Left Floating Pill: < (Library), ⊞ (Thumbnails), Undo, Redo, +Page (AddPagePopover), + (4-tab Utility Menu: Umum|Kanvas|Menulis|Lainnya)
 * - Right Floating Pill (Desktop/Tablet) / Bottom Thumb Bar (Mobile <768px):
 *   Pena Aliran (Fountain), Bolpoin, Stabilo (Highlighter), Penghapus (Guratan/Presisi/Lasso),
 *   Lasso (Kebebasan/Bingkai + filter toggles), Pena Laser, Penggaris Virtual, Pita Perekat, Teks/Rumus, Gambar, Stiker, Reading Mode
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PaperTemplateKind } from '@ai-classroom/whiteboard-core';
import type { LaserConfig } from '@/lib/laserPointerEngine';
import { AddPagePopover } from './AddPagePopover';
import { LaserToolPopover } from './LaserToolPopover';

export type NotesToolId =
  | 'fountain'
  | 'ballpoint'
  | 'highlighter'
  | 'eraser'
  | 'lasso'
  | 'laser'
  | 'tape'
  | 'text'
  | 'sticker'
  | 'reading';

export interface PenSettings {
  color: string;
  width: number;
  opacity: number;
  stability: number; // 0..10
  tipTaper: number; // 0..100
  sensitivity: number; // 0..100
  realtimeBeautify: boolean;
  strokePrediction: boolean;
  straightLine: boolean;
  lineStyle: 'solid' | 'dotted' | 'dashed';
}

export interface EraserSettings {
  mode: 'stroke' | 'precision' | 'lasso';
  size: number;
  onlyHighlighter: boolean;
}

export interface LassoSettings {
  mode: 'freehand' | 'box';
  includeHandwriting: boolean;
  includeHighlighter: boolean;
  includeText: boolean;
  includeImage: boolean;
  includeTape: boolean;
}

export interface NotesToolbarPillsProps {
  notebookTitle: string;
  onChangeTitle: (next: string) => void;
  pageMode: 'infinite' | 'paged';
  currentTemplate: PaperTemplateKind;
  activeTool: NotesToolId;
  onSelectTool: (t: NotesToolId) => void;
  penSettings: PenSettings;
  onChangePen: (patch: Partial<PenSettings>) => void;
  eraserSettings: EraserSettings;
  onChangeEraser: (patch: Partial<EraserSettings>) => void;
  lassoSettings: LassoSettings;
  onChangeLasso: (patch: Partial<LassoSettings>) => void;
  laserConfig: LaserConfig;
  onChangeLaser: (patch: Partial<LaserConfig>) => void;
  onClearLaser: () => void;
  showRuler: boolean;
  onToggleRuler: () => void;
  showThumbnails: boolean;
  onToggleThumbnails: () => void;
  showLayers: boolean;
  onToggleLayers: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBackToLibrary: () => void;
  onAddPage: (template: PaperTemplateKind) => void;
  onChangeTemplate: (template: PaperTemplateKind) => void;
  onTogglePageMode: () => void;
  onImportPdf: () => void;
  onImportImage: () => void;
  onExportPng: () => void;
  onClearCurrentLayerHandwriting: () => void;
  onOpenTimer: () => void;
  onOpenRecorder: () => void;
  onOpenSearch: () => void;
  onOpenFeynmanAI: () => void;
  onCapturePhoto: () => void;
  onSnipCanvas: () => void;
}

const PEN_SWATCHES = [
  '#0f172a', '#2563eb', '#dc2626', '#16a34a', '#7c3aed', '#d97706',
  '#64748b', '#7c8ba1', '#d6c19e', '#e3cec0', '#96b097', '#b8c5d6',
];
const HIGHLIGHT_SWATCHES = ['#fde047', '#4ade80', '#60a5fa', '#fbcfe8', '#99f6e4', '#d8b4fe'];

export const NotesToolbarPills: React.FC<NotesToolbarPillsProps> = ({
  notebookTitle,
  onChangeTitle,
  pageMode,
  currentTemplate,
  activeTool,
  onSelectTool,
  penSettings,
  onChangePen,
  eraserSettings,
  onChangeEraser,
  lassoSettings,
  onChangeLasso,
  laserConfig,
  onChangeLaser,
  onClearLaser,
  showRuler,
  onToggleRuler,
  showThumbnails,
  onToggleThumbnails,
  onToggleLayers,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBackToLibrary,
  onAddPage,
  onChangeTemplate,
  onTogglePageMode,
  onImportPdf,
  onImportImage,
  onExportPng,
  onClearCurrentLayerHandwriting,
  onOpenTimer,
  onOpenRecorder,
  onOpenSearch,
  onOpenFeynmanAI,
  onCapturePhoto,
  onSnipCanvas,
}) => {
  const [openPopover, setOpenPopover] = useState<
    null | 'addPage' | 'utility' | 'pen' | 'highlighter' | 'eraser' | 'lasso' | 'laser'
  >(null);
  const [utilityTab, setUtilityTab] = useState<'umum' | 'kanvas' | 'menulis' | 'lainnya'>('umum');

  const togglePopover = (p: typeof openPopover) =>
    setOpenPopover((cur) => (cur === p ? null : p));

  const handleToolClick = (t: NotesToolId, popoverKey?: typeof openPopover) => {
    if (activeTool === t && popoverKey) {
      togglePopover(popoverKey);
    } else {
      onSelectTool(t);
      if (t === 'laser') {
        if (showThumbnails) onToggleThumbnails();
        setOpenPopover('laser');
      } else {
        setOpenPopover(null);
      }
    }
  };

  return (
    <>
      {/* Top Notebook Header Strip */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 text-xs">
        <div className="flex items-center gap-2">
          <Link
            to="/whiteboard"
            data-testid="nav-whiteboard-link"
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
          >
            ← Whiteboard
          </Link>
          <span className="hidden sm:inline rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {pageMode === 'infinite' ? 'Kanvas Infinite' : 'Mode Halaman A4'}
          </span>
        </div>

        <input
          type="text"
          value={notebookTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          aria-label="Judul Notebook"
          className="w-44 sm:w-64 truncate rounded-lg bg-transparent px-2 py-0.5 text-center text-xs font-bold text-slate-800 outline-none focus:bg-slate-100"
        />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePageMode}
            data-testid="toggle-notes-mode-btn"
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            {pageMode === 'infinite' ? 'Ke Halaman' : 'Ke Infinite'}
          </button>
          <button
            type="button"
            onClick={() => handleToolClick('reading')}
            className={`hidden sm:inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${
              activeTool === 'reading'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            Reading Mode
          </button>
        </div>
      </div>

      {/* Dual Floating Pills Bar (Freenote Layout) */}
      <div className="pointer-events-none relative z-30 flex items-center justify-between gap-2 px-3 py-2">
        {/* LEFT FLOATING PILL: Library, Grid, Undo, Redo, +Page, +Utility */}
        <div
          data-testid="notes-pill-left"
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-md"
        >
          <button
            type="button"
            onClick={onBackToLibrary}
            title="Daftar Notebook"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            ‹
          </button>
          <button
            type="button"
            data-testid="notes-thumbnails-btn"
            onClick={onToggleThumbnails}
            title="Ringkasan Halaman (Thumbnail)"
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
              showThumbnails ? 'bg-blue-100 text-blue-600' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            ⊞
          </button>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-30"
          >
            ↩
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-30"
          >
            ↪
          </button>
          <button
            type="button"
            data-testid="notes-add-page-btn"
            onClick={() => togglePopover('addPage')}
            title="Tambah Halaman"
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition ${
              openPopover === 'addPage' ? 'bg-blue-100 text-blue-600' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            📄+
          </button>
          <button
            type="button"
            data-testid="notes-utility-menu-btn"
            onClick={() => togglePopover('utility')}
            title="Menu Utilitas (Umum · Kanvas · Menulis · Lainnya)"
            className={`flex h-8 w-8 items-center justify-center rounded-full text-base font-bold transition ${
              openPopover === 'utility' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            +
          </button>
        </div>

        {/* RIGHT FLOATING PILL (Desktop/Tablet >= 768px): Freenote Pen Rack */}
        <div
          data-testid="notes-pill-right"
          className="pointer-events-auto hidden md:flex items-center gap-1 rounded-full border border-slate-200/90 bg-white/95 px-2.5 py-1.5 shadow-lg backdrop-blur-md"
        >
          <button
            type="button"
            data-testid="notes-tool-fountain"
            onClick={() => handleToolClick('fountain', 'pen')}
            title="Pena Aliran (Klik lagi untuk pengaturan)"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'fountain' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🖋️</span>
            <span className="hidden lg:inline">Pena</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-ballpoint"
            onClick={() => handleToolClick('ballpoint', 'pen')}
            title="Bolpoin"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'ballpoint' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>✏️</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-highlighter"
            onClick={() => handleToolClick('highlighter', 'highlighter')}
            title="Stabilo (Multiply Blend)"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'highlighter' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🖍️</span>
            <span className="hidden xl:inline">Stabilo</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-eraser"
            onClick={() => handleToolClick('eraser', 'eraser')}
            title="Penghapus (Guratan · Presisi · Lasso)"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'eraser' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>⌫</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-lasso"
            onClick={() => handleToolClick('lasso', 'lasso')}
            title="Lasso (Kebebasan / Bingkai)"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'lasso' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>⭕</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-laser"
            onClick={() => handleToolClick('laser', 'laser')}
            title="Pena Laser (Tidak Ada Ekor / Ekor Memudar)"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'laser' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🔴</span>
            <span className="hidden lg:inline">Laser</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-ruler"
            onClick={onToggleRuler}
            title="Penggaris & Busur Virtual"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              showRuler ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>📏</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-tape"
            onClick={() => handleToolClick('tape')}
            title="Pita Perekat (Tutup/Buka untuk Hafalan)"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'tape' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>🩹</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-text"
            onClick={() => handleToolClick('text')}
            title="Teks & Rumus"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-bold transition ${
              activeTool === 'text' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>T</span>
          </button>
          <button
            type="button"
            onClick={onImportImage}
            title="Sisipkan Gambar (atau tekan Ctrl+V)"
            className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <span>🖼️</span>
          </button>
          <button
            type="button"
            data-testid="notes-tool-sticker"
            onClick={() => handleToolClick('sticker')}
            title="Stiker Belajar"
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
              activeTool === 'sticker' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>⭐</span>
          </button>
        </div>

        {/* POPOVERS */}
        {openPopover === 'addPage' && (
          <div className="pointer-events-auto">
            <AddPagePopover
              currentTemplate={currentTemplate}
              onAddPage={onAddPage}
              onImportPdf={onImportPdf}
              onImportImage={onImportImage}
              onClose={() => setOpenPopover(null)}
            />
          </div>
        )}

        {openPopover === 'laser' && (
          <div className="pointer-events-auto">
            <LaserToolPopover
              config={laserConfig}
              onChange={onChangeLaser}
              onClear={onClearLaser}
              onClose={() => setOpenPopover(null)}
            />
          </div>
        )}

        {/* 4-Tab Freenote Utility Menu (Umum | Kanvas | Menulis | Lainnya) */}
        {openPopover === 'utility' && (
          <div
            data-testid="notes-utility-popover"
            className="pointer-events-auto absolute top-14 left-4 z-40 w-80 rounded-2xl border border-slate-200 bg-white/98 p-3 shadow-2xl backdrop-blur-md"
          >
            <div className="mb-3 grid grid-cols-4 gap-1 border-b border-slate-100 pb-2 text-center text-[11px] font-bold">
              {(['umum', 'kanvas', 'menulis', 'lainnya'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setUtilityTab(tab)}
                  className={`rounded-xl py-1.5 capitalize transition ${
                    utilityTab === tab ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {utilityTab === 'umum' && (
              <div className="space-y-1 text-xs">
                {[
                  { icon: '📚', label: 'Lapisan (Layers)', action: onToggleLayers },
                  { icon: '🔍', label: 'Cari Teks & Rumus', action: onOpenSearch },
                  { icon: '🎙️', label: 'Perekaman Audio + Transkripsi', action: onOpenRecorder },
                  { icon: '⏱️', label: 'Timer Belajar', action: onOpenTimer },
                  { icon: '🧠', label: 'Feynman AI / Asisten Belajar', action: onOpenFeynmanAI },
                  { icon: '📷', label: 'Ambil Foto (Kamera)', action: onCapturePhoto },
                  { icon: '✂️', label: 'Tangkapan Layar (Snip PNG)', action: onSnipCanvas },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      item.action();
                      setOpenPopover(null);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}

            {utilityTab === 'kanvas' && (
              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => { onTogglePageMode(); setOpenPopover(null); }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>Ubah Mode Kanvas</span>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    {pageMode === 'infinite' ? 'Infinite' : 'Halaman'}
                  </span>
                </button>
                <div className="px-3 pt-1 text-[10px] font-bold uppercase text-slate-400">Ubah Template Kertas</div>
                <div className="grid grid-cols-3 gap-1.5 px-2">
                  {(['blank', 'ruled', 'grid', 'dot_grid', 'cornell', 'isometric_dot', 'music_staff'] as PaperTemplateKind[]).map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      onClick={() => { onChangeTemplate(tpl); setOpenPopover(null); }}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] font-semibold capitalize ${
                        currentTemplate === tpl ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tpl.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { onImportPdf(); setOpenPopover(null); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>📄</span><span>Impor PDF ke Halaman</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onExportPng(); setOpenPopover(null); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>📤</span><span>Ekspor PNG Tajam</span>
                </button>
              </div>
            )}

            {utilityTab === 'menulis' && (
              <div className="space-y-2 p-1 text-xs">
                <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-medium text-slate-800">Pemerindahan Tulisan Tangan</span>
                  <input type="checkbox" checked={penSettings.realtimeBeautify} onChange={(e) => onChangePen({ realtimeBeautify: e.target.checked })} className="accent-blue-600" />
                </label>
                <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="font-medium text-slate-800">Prediksi Goresan (Stabilizer)</span>
                  <input type="checkbox" checked={penSettings.strokePrediction} onChange={(e) => onChangePen({ strokePrediction: e.target.checked })} className="accent-blue-600" />
                </label>
                <button
                  type="button"
                  onClick={() => { onToggleRuler(); setOpenPopover(null); }}
                  className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 font-medium text-slate-800 hover:bg-slate-100"
                >
                  <span>Penggaris Virtual</span>
                  <span className="text-blue-600 font-bold">{showRuler ? 'Aktif' : 'Nonaktif'}</span>
                </button>
              </div>
            )}

            {utilityTab === 'lainnya' && (
              <div className="space-y-1 text-xs">
                <button type="button" onClick={() => { onSelectTool('tape'); setOpenPopover(null); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-slate-100">
                  <span>🩹</span><span>Pita Perekat (Mode Hafalan)</span>
                </button>
                <button type="button" onClick={() => { onSelectTool('sticker'); setOpenPopover(null); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-slate-100">
                  <span>⭐</span><span>Stiker Catatan</span>
                </button>
                <button type="button" onClick={() => { onSelectTool('reading'); setOpenPopover(null); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 font-medium hover:bg-slate-100">
                  <span>📖</span><span>Reading Mode (Hanya Baca)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pena Aliran / Bolpoin Popover (Screenshot 235244) */}
        {openPopover === 'pen' && (
          <div className="pointer-events-auto absolute top-14 right-4 z-40 w-72 rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-2xl text-xs">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => onChangePen({ width: 3, opacity: 1, stability: 3, tipTaper: 60 })} className="font-semibold text-blue-600">Setel Ulang</button>
              <span className="font-bold text-slate-900">{activeTool === 'fountain' ? 'Pena Aliran' : 'Bolpoin'}</span>
              <button type="button" onClick={() => setOpenPopover(null)} className="text-slate-400">×</button>
            </div>
            <div className="space-y-2.5">
              <label className="block">
                <div className="flex justify-between"><span>Stabilitas</span><span className="font-mono font-bold">{penSettings.stability}</span></div>
                <input type="range" min={0} max={10} value={penSettings.stability} onChange={(e) => onChangePen({ stability: Number(e.target.value) })} className="w-full accent-blue-600" />
              </label>
              <label className="block">
                <div className="flex justify-between"><span>Tip (Keruncingan)</span><span className="font-mono font-bold">{penSettings.tipTaper}%</span></div>
                <input type="range" min={0} max={100} value={penSettings.tipTaper} onChange={(e) => onChangePen({ tipTaper: Number(e.target.value) })} className="w-full accent-blue-600" />
              </label>
              <label className="block">
                <div className="flex justify-between"><span>Ketebalan</span><span className="font-mono font-bold">{penSettings.width.toFixed(1)}</span></div>
                <input type="range" min={1} max={14} step={0.5} value={penSettings.width} onChange={(e) => onChangePen({ width: Number(e.target.value) })} className="w-full accent-blue-600" />
              </label>
              <label className="block">
                <div className="flex justify-between"><span>Konsentrasi</span><span className="font-mono font-bold">{Math.round(penSettings.opacity * 100)}%</span></div>
                <input type="range" min={0.2} max={1} step={0.05} value={penSettings.opacity} onChange={(e) => onChangePen({ opacity: Number(e.target.value) })} className="w-full accent-blue-600" />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PEN_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChangePen({ color: hex })}
                    className={`h-6 w-6 rounded-full ${penSettings.color === hex ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stabilo Popover (Screenshot 235326) */}
        {openPopover === 'highlighter' && (
          <div className="pointer-events-auto absolute top-14 right-4 z-40 w-72 rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-2xl text-xs">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => onChangePen({ width: 16, opacity: 0.45, straightLine: false, lineStyle: 'solid' })} className="font-semibold text-blue-600">Setel Ulang</button>
              <span className="font-bold text-slate-900">Stabilo</span>
              <button type="button" onClick={() => setOpenPopover(null)} className="text-slate-400">×</button>
            </div>
            <div className="space-y-2.5">
              <label className="block">
                <div className="flex justify-between"><span>Ketebalan</span><span className="font-mono font-bold">{penSettings.width.toFixed(1)}</span></div>
                <input type="range" min={8} max={32} step={1} value={penSettings.width} onChange={(e) => onChangePen({ width: Number(e.target.value) })} className="w-full accent-blue-600" />
              </label>
              <label className="block">
                <div className="flex justify-between"><span>Konsentrasi</span><span className="font-mono font-bold">{Math.round(penSettings.opacity * 100)}%</span></div>
                <input type="range" min={0.2} max={0.8} step={0.05} value={penSettings.opacity} onChange={(e) => onChangePen({ opacity: Number(e.target.value) })} className="w-full accent-blue-600" />
              </label>
              <label className="flex items-center justify-between">
                <span>Gambar dalam Garis Lurus</span>
                <input type="checkbox" checked={penSettings.straightLine} onChange={(e) => onChangePen({ straightLine: e.target.checked })} className="accent-blue-600" />
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['solid', 'dotted', 'dashed'] as const).map((ls) => (
                  <button key={ls} type="button" onClick={() => onChangePen({ lineStyle: ls })} className={`rounded-lg border py-1 font-semibold capitalize ${penSettings.lineStyle === ls ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'}`}>
                    {ls}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {HIGHLIGHT_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onChangePen({ color: hex })}
                    className={`h-7 w-7 rounded-full border border-slate-200 ${penSettings.color === hex ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Penghapus Popover (Screenshot 235237 / 235334) */}
        {openPopover === 'eraser' && (
          <div className="pointer-events-auto absolute top-14 right-4 z-40 w-72 rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-2xl text-xs">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" onClick={() => onChangeEraser({ mode: 'stroke', size: 16, onlyHighlighter: false })} className="font-semibold text-blue-600">Setel Ulang</button>
              <span className="font-bold text-slate-900">Penghapus</span>
              <button type="button" onClick={() => setOpenPopover(null)} className="text-slate-400">×</button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([['stroke', 'Guratan'], ['precision', 'Presisi'], ['lasso', 'Lasso']] as const).map(([m, lbl]) => (
                <button key={m} type="button" onClick={() => onChangeEraser({ mode: m })} className={`rounded-xl border py-2 font-semibold ${eraserSettings.mode === m ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            <label className="block mb-3">
              <div className="flex justify-between"><span>Ketebalan</span><span className="font-mono font-bold">{eraserSettings.size}</span></div>
              <input type="range" min={6} max={48} value={eraserSettings.size} onChange={(e) => onChangeEraser({ size: Number(e.target.value) })} className="w-full accent-blue-600" />
            </label>
            <label className="flex items-center justify-between mb-3">
              <span>Hanya Hapus Stabilo</span>
              <input type="checkbox" checked={eraserSettings.onlyHighlighter} onChange={(e) => onChangeEraser({ onlyHighlighter: e.target.checked })} className="accent-blue-600" />
            </label>
            <button
              type="button"
              onClick={() => { onClearCurrentLayerHandwriting(); setOpenPopover(null); }}
              className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2 font-bold text-rose-600 hover:bg-rose-100"
            >
              Hapus tulisan tangan di lapisan ini
            </button>
          </div>
        )}

        {/* Lasso Popover (Screenshot 235340) */}
        {openPopover === 'lasso' && (
          <div className="pointer-events-auto absolute top-14 right-4 z-40 w-72 rounded-2xl border border-slate-200 bg-white/98 p-4 shadow-2xl text-xs">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-slate-900">Lasso Select</span>
              <button type="button" onClick={() => setOpenPopover(null)} className="text-slate-400">×</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => onChangeLasso({ mode: 'freehand' })} className={`rounded-xl border py-2 font-semibold ${lassoSettings.mode === 'freehand' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'}`}>Kebebasan</button>
              <button type="button" onClick={() => onChangeLasso({ mode: 'box' })} className={`rounded-xl border py-2 font-semibold ${lassoSettings.mode === 'box' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200'}`}>Bingkai</button>
            </div>
            <div className="space-y-2">
              {([
                ['includeHandwriting', 'Tulis Tangan'],
                ['includeHighlighter', 'Stabilo'],
                ['includeText', 'Teks'],
                ['includeImage', 'Gambar'],
                ['includeTape', 'Pita perekat'],
              ] as const).map(([key, lbl]) => (
                <label key={key} className="flex items-center justify-between">
                  <span>{lbl}</span>
                  <input type="checkbox" checked={lassoSettings[key]} onChange={(e) => onChangeLasso({ [key]: e.target.checked })} className="accent-blue-600" />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM THUMB BAR (< 768px) */}
      <div
        data-testid="notes-mobile-pen-bar"
        className="fixed bottom-3 left-1/2 z-30 flex md:hidden -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-2xl backdrop-blur-md"
      >
        {([
          ['fountain', '🖋️', 'pen'],
          ['highlighter', '🖍️', 'highlighter'],
          ['eraser', '⌫', 'eraser'],
          ['lasso', '⭕', 'lasso'],
          ['laser', '🔴', 'laser'],
          ['tape', '🩹', undefined],
          ['text', 'T', undefined],
        ] as const).map(([t, icon, pop]) => (
          <button
            key={t}
            type="button"
            onClick={() => handleToolClick(t, pop)}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              activeTool === t ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {icon}
          </button>
        ))}
        <button
          type="button"
          onClick={onToggleRuler}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${showRuler ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
        >
          📏
        </button>
      </div>
    </>
  );
};
