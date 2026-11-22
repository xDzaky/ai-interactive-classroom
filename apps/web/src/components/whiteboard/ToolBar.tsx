/**
 * ToolBar — P02-T05
 * Whiteboard tool selection toolbar with shape builder controls.
 * Renders tool buttons, color picker, stroke width slider, and shape creation.
 */
import type { ToolType } from "@/hooks/useWhiteboardTool";

// ---------------------------------------------------------------------------
// Tool button definitions
// ---------------------------------------------------------------------------

interface ToolDef {
  type: ToolType;
  label: string;
  icon: string;
  group: "select" | "draw" | "shapes" | "other";
}

const TOOLS: ToolDef[] = [
  { type: "select",      label: "Seleksi (V)", icon: "↖",  group: "select" },
  { type: "pen",         label: "Pena",       icon: "✏️",  group: "draw" },
  { type: "highlighter", label: "Stabilo",    icon: "🖊",  group: "draw" },
  { type: "eraser",      label: "Hapus",      icon: "⌫",   group: "draw" },
  { type: "line",        label: "Garis",      icon: "╱",   group: "shapes" },
  { type: "arrow",       label: "Panah",      icon: "→",   group: "shapes" },
  { type: "rect",        label: "Kotak",      icon: "▭",   group: "shapes" },
  { type: "circle",      label: "Lingkaran",  icon: "◯",   group: "shapes" },
  { type: "ellipse",     label: "Elips",      icon: "⬭",   group: "shapes" },
  { type: "triangle",    label: "Segitiga",   icon: "△",   group: "shapes" },
  { type: "rhombus",     label: "Belah Ketupat", icon: "◇", group: "shapes" },
  { type: "pentagon",    label: "Segi Lima",  icon: "⬠",   group: "shapes" },
  { type: "hexagon",     label: "Segi Enam",  icon: "⬡",   group: "shapes" },
  { type: "star",        label: "Bintang",    icon: "☆",   group: "shapes" },
  { type: "text",        label: "Teks",       icon: "T",   group: "other" },
];

const PRESET_COLORS = [
  "#111827", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ffffff", "#6b7280",
];

export type AutoShapeMode = "auto" | "hold" | "off";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ToolBar component
// ---------------------------------------------------------------------------

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
  const nextMode: Record<AutoShapeMode, AutoShapeMode> = {
    auto: "hold",
    hold: "off",
    off: "auto",
  };

  const modeInfo: Record<AutoShapeMode, { label: string; icon: string }> = {
    auto: { label: "Auto-shape: Otomatis", icon: "✨" },
    hold: { label: "Auto-shape: Tahan", icon: "⏳" },
    off: { label: "Auto-shape: Mati", icon: "🚫" },
  };
  return (
    <div
      role="toolbar"
      aria-label="Alat papan tulis"
      className="flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-md w-14 max-h-[calc(100vh-4.5rem)] overflow-y-auto overflow-x-hidden select-none"
    >
      {/* Tool buttons grouped — Select tool at top (P10-T02) */}
      {(["select", "draw", "shapes", "other"] as const).map((group) => (
        <div key={group} className="flex flex-col gap-0.5">
          {TOOLS.filter((t) => t.group === group).map((tool) => (
            <button
              key={tool.type}
              onClick={() => onToolChange(tool.type)}
              aria-label={tool.label}
              aria-pressed={activeTool === tool.type}
              title={tool.label}
              className={[
                "flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors",
                activeTool === tool.type
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              {tool.icon}
            </button>
          ))}
          <div className="my-0.5 h-px bg-gray-100" />
        </div>
      ))}

      {/* Color picker */}
      <div className="flex flex-col gap-0.5" role="group" aria-label="Warna">
        {/* Current color swatch + native picker */}
        <label
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
          title="Pilih warna"
          aria-label="Pilih warna kustom"
          style={{ backgroundColor: color }}
        >
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="sr-only"
            aria-label="Warna kustom"
          />
        </label>
        {/* Preset color dots */}
        <div className="grid grid-cols-2 gap-0.5 py-0.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              aria-label={`Warna ${c}`}
              title={c}
              className={[
                "h-3.5 w-3.5 rounded-full transition-transform hover:scale-125",
                color === c ? "ring-2 ring-blue-500 ring-offset-1" : "",
              ].join(" ")}
              style={{ backgroundColor: c, border: c === "#ffffff" ? "1px solid #d1d5db" : "none" }}
            />
          ))}
        </div>
      </div>

      <div className="my-0.5 h-px bg-gray-100" />

      {/* Stroke width */}
      <div role="group" aria-label="Ketebalan garis" className="flex flex-col items-center gap-1 py-1">
        {[2, 4, 8].map((w) => (
          <button
            key={w}
            onClick={() => onStrokeWidthChange(w)}
            aria-label={`Ketebalan ${w}px`}
            aria-pressed={strokeWidth === w}
            title={`${w}px`}
            className={[
              "flex h-7 w-9 items-center justify-center rounded-md transition-colors",
              strokeWidth === w ? "bg-blue-100" : "hover:bg-gray-100",
            ].join(" ")}
          >
            <div
              className="rounded-full bg-gray-700"
              style={{ width: `${w * 3}px`, height: `${w}px` }}
            />
          </button>
        ))}
      </div>

      <div className="my-0.5 h-px bg-gray-100" />

      {/* Auto-shape mode selector */}
      {onAutoShapeModeChange && (
        <>
          <div className="flex flex-col items-center">
            <button
              onClick={() => onAutoShapeModeChange(nextMode[autoShapeMode])}
              aria-label={modeInfo[autoShapeMode].label}
              title={modeInfo[autoShapeMode].label}
              data-testid="toolbar-autoshape-toggle"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm text-gray-700 transition-colors hover:bg-gray-100"
            >
              {modeInfo[autoShapeMode].icon}
            </button>
          </div>
          <div className="my-0.5 h-px bg-gray-100" />
        </>
      )}

      {/* Undo / Redo */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Batalkan"
          title="Batalkan (Ctrl+Z)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↩
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Ulangi"
          title="Ulangi (Ctrl+Y)"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↪
        </button>
      </div>

      {/* Export */}
      {onExportPng && (
        <>
          <div className="my-0.5 h-px bg-gray-100" />
          <button
            onClick={onExportPng}
            aria-label="Ekspor PNG"
            title="Ekspor sebagai PNG"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 text-xs"
          >
            ⬇
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShapePropertiesPanel — floating panel for numeric shape editing
// ---------------------------------------------------------------------------

export interface ShapePropsValue {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  strokeWidth?: number;
  fill?: string;
  stroke?: string;
  fontSize?: number;
}

export interface ShapePropertiesPanelProps {
  objectType: string | null;
  values: ShapePropsValue;
  onChange: (patch: Partial<ShapePropsValue>) => void;
  onClose: () => void;
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-gray-600">
      <span className="w-10 shrink-0">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded border border-gray-200 px-1.5 py-0.5 text-xs focus:outline-blue-400"
        aria-label={label}
      />
    </label>
  );
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
      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg text-sm w-48"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700 capitalize">{objectType}</span>
        <button
          onClick={onClose}
          aria-label="Tutup panel properti"
          className="text-gray-400 hover:text-gray-700"
        >×</button>
      </div>

      {/* Position */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Posisi</span>
        <NumField label="X" value={values.x} onChange={(v) => onChange({ x: v })} />
        <NumField label="Y" value={values.y} onChange={(v) => onChange({ y: v })} />
      </div>

      {/* Size */}
      {(objectType === "rect" || objectType === "image") && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ukuran</span>
          <NumField label="Lebar" value={values.w} onChange={(v) => onChange({ w: v })} />
          <NumField label="Tinggi" value={values.h} onChange={(v) => onChange({ h: v })} />
        </div>
      )}

      {/* Radius for circle */}
      {objectType === "circle" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ukuran</span>
          <NumField label="Radius" value={values.r} onChange={(v) => onChange({ r: v })} />
        </div>
      )}

      {/* Font size for text */}
      {(objectType === "text" || objectType === "annotation") && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teks</span>
          <NumField label="Ukuran" value={values.fontSize} onChange={(v) => onChange({ fontSize: v })} />
        </div>
      )}

      {/* Stroke width */}
      {objectType !== "text" && objectType !== "annotation" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Garis</span>
          <NumField label="Tebal" value={values.strokeWidth} onChange={(v) => onChange({ strokeWidth: v })} />
        </div>
      )}
    </div>
  );
}
