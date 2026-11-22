import React from 'react';

export interface SolidDisplaySettings {
  showLabels?: boolean;
  showHiddenEdges?: boolean;
  opacity?: number;
}

export interface SolidContextToolbarProps {
  solidId: string;
  display?: SolidDisplaySettings;
  onUpdateDisplay: (patch: Partial<SolidDisplaySettings>) => void;
  onResetView?: () => void;
  onOpenSectionTool?: () => void;
  onOpenMeasureTool?: () => void;
  onOpenUnfoldTool?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const SolidContextToolbar: React.FC<SolidContextToolbarProps> = ({
  solidId,
  display = { showLabels: true, showHiddenEdges: true, opacity: 0.3 },
  onUpdateDisplay,
  onResetView,
  onOpenSectionTool,
  onOpenMeasureTool,
  onOpenUnfoldTool,
  onDelete,
  className = '',
}) => {
  const showLabels = display.showLabels ?? true;
  const showHiddenEdges = display.showHiddenEdges ?? true;
  const opacity = display.opacity ?? 0.3;

  return (
    <div
      role="toolbar"
      aria-label="Toolbar Kontekstual Bangun Ruang"
      className={`inline-flex items-center gap-1 p-1 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur select-none text-xs ${className}`}
    >
      {/* Reset view */}
      {onResetView && (
        <button
          onClick={onResetView}
          aria-label="Reset Tampilan Kamera"
          title="Reset Kamera 3D"
          className="p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          🔄 Reset
        </button>
      )}

      {/* Toggle labels (A-H) */}
      <button
        onClick={() => onUpdateDisplay({ showLabels: !showLabels })}
        aria-pressed={showLabels}
        aria-label="Toggle Label Titik Sudut"
        title="Tampilkan / Sembunyikan Titik Sudut (A-H)"
        className={`p-1.5 px-2 rounded-lg transition ${
          showLabels
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium'
            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        🏷️ Label
      </button>

      {/* Toggle dashed / hidden edges */}
      <button
        onClick={() => onUpdateDisplay({ showHiddenEdges: !showHiddenEdges })}
        aria-pressed={showHiddenEdges}
        aria-label="Toggle Rusuk Tak Tampak"
        title="Tampilkan Rusuk Tersembunyi (Garis Putus-Putus)"
        className={`p-1.5 px-2 rounded-lg transition ${
          showHiddenEdges
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium'
            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        ╌ Rusuk
      </button>

      {/* Transparency slider */}
      <div className="flex items-center gap-1 px-1.5 border-l border-r border-slate-200 dark:border-slate-800">
        <span className="text-[10px] text-slate-400">Transparansi</span>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.1"
          value={opacity}
          onChange={(e) => onUpdateDisplay({ opacity: parseFloat(e.target.value) })}
          aria-label="Transparansi Sisi Bangun Ruang"
          className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      {/* Section / Irisan tool */}
      {onOpenSectionTool && (
        <button
          onClick={onOpenSectionTool}
          aria-label="Buka Alat Irisan Bidang"
          title="Potong Bangun Ruang dengan Bidang Datar"
          className="p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          ✂️ Irisan
        </button>
      )}

      {/* Measure tool */}
      {onOpenMeasureTool && (
        <button
          onClick={onOpenMeasureTool}
          aria-label="Buka Alat Ukur Dimensi Tiga"
          title="Ukur Jarak, Sudut, dan Diagonal"
          className="p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          📏 Ukur
        </button>
      )}

      {/* Unfold net tool */}
      {onOpenUnfoldTool && (
        <button
          onClick={onOpenUnfoldTool}
          aria-label="Buka Animasi Jaring-Jaring"
          title="Buka / Bentangkan Jaring-Jaring (Unfold)"
          className="p-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        >
          📜 Jaring
        </button>
      )}

      {/* Delete solid */}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Hapus Bangun Ruang"
          title="Hapus Objek 3D Ini"
          className="p-1.5 px-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          🗑
        </button>
      )}
    </div>
  );
};
