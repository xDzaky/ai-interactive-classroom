/**
 * ToolBar.tsx — Minimal, Clean Whiteboard Toolbar
 * Ultra-clean vertical pill toolbar: Select, Hand, Pen, Eraser, Quick Shapes (Kotak, Lingkaran, Segitiga + More popover), Text,
 * compact Color/Stroke popover, and Undo/Redo. Zero scrollbar!
 */
import { useState } from "react";
import type { ToolType } from "@/hooks/useWhiteboardTool";

export type AutoShapeMode = "auto" | "hold" | "off";

interface ToolDef {
  type: ToolType;
  label: string;
  icon: string;
}

const PRIMARY_TOOLS: ToolDef[] = [
  { type: "select", label: "Seleksi (V)", icon: "↖" },
  { type: "hand",   label: "Tangan / Geser (H)", icon: "✋" },
  { type: "pen",    label: "Pena", icon: "✏️" },
  { type: "eraser", label: "Hapus", icon: "⌫" },
  { type: "rect",   label: "Kotak", icon: "▭" },
  { type: "circle", label: "Lingkaran", icon: "◯" },
  { type: "triangle", label: "Segitiga", icon: "△" },
];

const MORE_SHAPES: ToolDef[] = [
  { type: "highlighter", label: "Stabilo", icon: "🖊" },
  { type: "line",     label: "Garis", icon: "╱" },
  { type: "arrow",    label: "Panah", icon: "→" },
  { type: "ellipse",  label: "Elips", icon: "⬭" },
  { type: "rhombus",  label: "Belah Ketupat", icon: "◇" },
  { type: "pentagon", label: "Segi Lima", icon: "⬠" },
  { type: "hexagon",  label: "Segi Enam", icon: "⬡" },
  { type: "star",     label: "Bintang", icon: "☆" },
  { type: "text",     label: "Teks", icon: "T" },
];

const PRESET_COLORS = [
  "#0f172a", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
];

export interface ToolBarProps {
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (w: number) => void;
  autoShapeMode?: AutoShapeMode;
  onAutoShapeModeChange?: (mode: AutoShapeMode) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onExportPng?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function ToolBar({
  activeTool,
  color,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  autoShapeMode = "auto",
  onAutoShapeModeChange,
  onUndo,
  onRedo,
  onExportPng,
  canUndo = false,
  canRedo = false,
}: ToolBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const activeMore = MORE_SHAPES.find((s) => s.type === activeTool);

  const nextMode: Record<AutoShapeMode, AutoShapeMode> = {
    auto: "hold",
    hold: "off",
    off: "auto",
  };
  const modeLabel: Record<AutoShapeMode, string> = {
    auto: "Auto-shape: Otomatis",
    hold: "Auto-shape: Tahan",
    off: "Auto-shape: Mati",
  };

  return (
    <div
      role="toolbar"
      aria-label="Alat papan tulis"
      className="relative flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm select-none w-12"
    >
      {/* Primary clean tools */}
      {PRIMARY_TOOLS.map((tool) => (
        <button
          key={tool.type}
          type="button"
          onClick={() => {
            onToolChange(tool.type);
            setMoreOpen(false);
            setStyleOpen(false);
          }}
          aria-label={tool.label}
          aria-pressed={activeTool === tool.type}
          title={tool.label}
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-base transition-all ${
            activeTool === tool.type
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {tool.icon}
        </button>
      ))}

      {/* Compact More Shapes / Text Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setMoreOpen((v) => !v);
            setStyleOpen(false);
          }}
          aria-label="Bentuk & Alat Lainnya"
          aria-expanded={moreOpen}
          aria-pressed={Boolean(activeMore)}
          title={activeMore ? activeMore.label : "Bentuk & Alat Lainnya"}
          className={`flex h-9 w-9 items-center justify-center rounded-xl text-base transition-all ${
            activeMore || moreOpen
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {activeMore ? activeMore.icon : "⋯"}
        </button>

        {moreOpen && (
          <div
            role="menu"
            aria-label="Daftar Bentuk Geometris"
            className="absolute left-12 top-0 z-40 grid w-40 grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            {MORE_SHAPES.map((shape) => (
              <button
                key={shape.type}
                type="button"
                role="menuitem"
                onClick={() => {
                  onToolChange(shape.type);
                  setMoreOpen(false);
                }}
                aria-label={shape.label}
                aria-pressed={activeTool === shape.type}
                title={shape.label}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm transition ${
                  activeTool === shape.type
                    ? "bg-indigo-600 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {shape.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="my-0.5 h-px w-7 bg-slate-200" />

      {/* Compact Color & Stroke Width Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setStyleOpen((v) => !v);
            setMoreOpen(false);
          }}
          aria-label="Warna dan Ketebalan"
          aria-expanded={styleOpen}
          title="Warna & Ketebalan Garis"
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition"
        >
          <span
            className="h-5 w-5 rounded-full border-2 border-slate-300 shadow-xs"
            style={{ backgroundColor: color }}
          />
        </button>

        {styleOpen && (
          <div className="absolute left-12 top-0 z-40 w-44 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Warna Tinta
            </div>
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onColorChange(c)}
                  aria-label={`Warna ${c}`}
                  className={`h-6 w-6 rounded-full border transition hover:scale-110 ${
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-indigo-500 border-white scale-110"
                      : "border-slate-300"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500">
              <span>Ketebalan: {strokeWidth}px</span>
              <input
                type="range"
                min={1}
                max={16}
                value={strokeWidth}
                onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                aria-label="Ketebalan garis"
                className="w-full accent-indigo-600"
              />
            </label>
          </div>
        )}
      </div>

      {/* Auto-shape toggle */}
      {onAutoShapeModeChange && (
        <button
          type="button"
          onClick={() => onAutoShapeModeChange(nextMode[autoShapeMode])}
          aria-label={modeLabel[autoShapeMode]}
          title={modeLabel[autoShapeMode]}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-slate-600 hover:bg-slate-100"
        >
          {autoShapeMode === "auto" ? "✨" : autoShapeMode === "hold" ? "⏳" : "🚫"}
        </button>
      )}

      <div className="my-0.5 h-px w-7 bg-slate-200" />

      {/* Undo / Redo */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Batalkan"
        title="Batalkan (Ctrl+Z)"
        className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30"
      >
        ↩
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Ulangi"
        title="Ulangi (Ctrl+Y)"
        className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30"
      >
        ↪
      </button>

      {onExportPng && (
        <button
          type="button"
          onClick={onExportPng}
          aria-label="Ekspor PNG"
          title="Ekspor PNG"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-sm text-slate-600 hover:bg-slate-100"
        >
          💾
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShapePropertiesPanel (preserved for backward compatibility)
// ---------------------------------------------------------------------------

export interface ShapePropertiesPanelProps {
  objectType: "rect" | "circle" | "triangle" | "line" | "text" | null;
  values: Record<string, number | string>;
  onChange: (patch: Record<string, number | string>) => void;
  onClose: () => void;
}

export function ShapePropertiesPanel({
  objectType,
  values,
  onChange,
  onClose,
}: ShapePropertiesPanelProps) {
  if (!objectType) return null;

  return (
    <div
      role="dialog"
      aria-label="Properti bentuk"
      className="w-56 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xl"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold capitalize">{objectType}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel properti"
          className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ×
        </button>
      </div>
      <div className="space-y-2">
        <label className="flex items-center justify-between gap-2">
          <span>X</span>
          <input
            type="number"
            aria-label="X"
            value={Number(values.x ?? 0)}
            onChange={(e) => onChange({ x: Number(e.target.value) })}
            className="w-24 rounded border border-slate-200 px-2 py-1"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>Y</span>
          <input
            type="number"
            aria-label="Y"
            value={Number(values.y ?? 0)}
            onChange={(e) => onChange({ y: Number(e.target.value) })}
            className="w-24 rounded border border-slate-200 px-2 py-1"
          />
        </label>
        {objectType === "rect" && (
          <>
            <label className="flex items-center justify-between gap-2">
              <span>Lebar</span>
              <input
                type="number"
                aria-label="Lebar"
                value={Number(values.w ?? 100)}
                onChange={(e) => onChange({ w: Number(e.target.value) })}
                className="w-24 rounded border border-slate-200 px-2 py-1"
              />
            </label>
            <label className="flex items-center justify-between gap-2">
              <span>Tinggi</span>
              <input
                type="number"
                aria-label="Tinggi"
                value={Number(values.h ?? 60)}
                onChange={(e) => onChange({ h: Number(e.target.value) })}
                className="w-24 rounded border border-slate-200 px-2 py-1"
              />
            </label>
          </>
        )}
        {objectType === "circle" && (
          <label className="flex items-center justify-between gap-2">
            <span>Radius</span>
            <input
              type="number"
              aria-label="Radius"
              value={Number(values.r ?? 40)}
              onChange={(e) => onChange({ r: Number(e.target.value) })}
              className="w-24 rounded border border-slate-200 px-2 py-1"
            />
          </label>
        )}
      </div>
    </div>
  );
}
