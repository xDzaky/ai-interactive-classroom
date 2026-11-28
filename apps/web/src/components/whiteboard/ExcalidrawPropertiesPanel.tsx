/**
 * ExcalidrawPropertiesPanel.tsx — Iconic Excalidraw Left Floating Style & Actions Inspector (V6)
 *
 * Shared cleanly between BOTH /whiteboard and /notes!
 * Controls:
 * - Stroke Color, Background Fill, Fill Style (Arsir/Silang/Solid)
 * - Stroke Width (S/M/L), Stroke Style (Solid/Putus/Titik), Sloppiness/Roughness (0/1/2)
 * - Edges (Siku/Bulat), Arrowheads, Font Family, Opacity (0-100%)
 * - Layer Ordering, Align/Distribute, Group/Ungroup, Copy/Paste Style, Duplicate, Delete
 */
import React from 'react';
import {
  EXCALIDRAW_BG_COLORS,
  EXCALIDRAW_STROKE_COLORS,
  type AlignAction,
  type DistributeAction,
  type ExcalidrawStyleState,
  type FillStyleKind,
  type FontFamilyKind,
  type RoughnessLevel,
  type StrokeStyleKind,
} from '@/lib/excalidrawEngine';

export interface ExcalidrawPropertyCapabilities {
  hasAny: boolean;
  strokeColor: boolean;
  backgroundColor: boolean;
  fillStyle: boolean;
  strokeWidth: boolean;
  strokeStyle: boolean;
  roughness: boolean;
  roundness: boolean;
  fontFamily: boolean;
  opacity: boolean;
}

const NON_EXCALIDRAW_WIDGET_TYPES = new Set([
  'viz_solid',
  'viz_graph',
  'image',
  'math_block',
  'textbook_graph',
  'stat_chart',
  'trig_proof',
  'simulation',
  'viz_manimgx',
]);

function capabilitiesForSingleType(t: string): ExcalidrawPropertyCapabilities {
  if (NON_EXCALIDRAW_WIDGET_TYPES.has(t)) {
    return {
      hasAny: false,
      strokeColor: false,
      backgroundColor: false,
      fillStyle: false,
      strokeWidth: false,
      strokeStyle: false,
      roughness: false,
      roundness: false,
      fontFamily: false,
      opacity: false,
    };
  }
  if (t === 'stroke' || t === 'pen' || t === 'write_pen' || t === 'fountain' || t === 'ballpoint' || t === 'pencil' || t === 'highlighter') {
    return {
      hasAny: true,
      strokeColor: true,
      backgroundColor: false,
      fillStyle: false,
      strokeWidth: true,
      strokeStyle: false,
      roughness: false,
      roundness: false,
      fontFamily: false,
      opacity: false,
    };
  }
  if (t === 'line' || t === 'arrow') {
    return {
      hasAny: true,
      strokeColor: true,
      backgroundColor: false,
      fillStyle: false,
      strokeWidth: true,
      strokeStyle: true,
      roughness: false,
      roundness: false,
      fontFamily: false,
      opacity: true,
    };
  }
  if (t === 'text' || t === 'annotation') {
    return {
      hasAny: true,
      strokeColor: true,
      backgroundColor: false,
      fillStyle: false,
      strokeWidth: false,
      strokeStyle: false,
      roughness: false,
      roundness: false,
      fontFamily: true,
      opacity: true,
    };
  }
  if (t === 'frame') {
    return {
      hasAny: true,
      strokeColor: true,
      backgroundColor: true,
      fillStyle: false,
      strokeWidth: false,
      strokeStyle: false,
      roughness: false,
      roundness: false,
      fontFamily: false,
      opacity: true,
    };
  }
  if (t === 'rect') {
    return {
      hasAny: true,
      strokeColor: true,
      backgroundColor: true,
      fillStyle: true,
      strokeWidth: true,
      strokeStyle: true,
      roughness: true,
      roundness: true,
      fontFamily: true,
      opacity: true,
    };
  }
  if (t === 'ellipse' || t === 'rhombus') {
    return {
      hasAny: true,
      strokeColor: true,
      backgroundColor: true,
      fillStyle: false,
      strokeWidth: true,
      strokeStyle: true,
      roughness: true,
      roundness: false,
      fontFamily: true,
      opacity: true,
    };
  }
  // Other 2D polygons/circles (circle, triangle, trapezoid, parallelogram, kite, pentagon, hexagon, polygon, star)
  return {
    hasAny: true,
    strokeColor: true,
    backgroundColor: true,
    fillStyle: false,
    strokeWidth: true,
    strokeStyle: true,
    roughness: false,
    roundness: false,
    fontFamily: false,
    opacity: true,
  };
}

/**
 * Computes which property controls are genuinely supported by the current selection
 * (or active drawing tool when nothing is selected).
 * Unsupported controls are omitted completely so users never click a no-op control.
 */
export function getCapabilitiesForSelection(
  selectedTypes: string[],
  activeTool?: string,
): ExcalidrawPropertyCapabilities {
  const targets = selectedTypes.length > 0 ? selectedTypes : activeTool ? [activeTool] : [];
  if (targets.length === 0) {
    return capabilitiesForSingleType('viz_solid');
  }
  const caps = targets.map(capabilitiesForSingleType);
  const union: ExcalidrawPropertyCapabilities = {
    hasAny: caps.some((c) => c.hasAny),
    strokeColor: caps.some((c) => c.strokeColor),
    backgroundColor: caps.some((c) => c.backgroundColor),
    fillStyle: caps.some((c) => c.fillStyle),
    strokeWidth: caps.some((c) => c.strokeWidth),
    strokeStyle: caps.some((c) => c.strokeStyle),
    roughness: caps.some((c) => c.roughness),
    roundness: caps.some((c) => c.roundness),
    fontFamily: caps.some((c) => c.fontFamily),
    opacity: caps.some((c) => c.opacity),
  };
  return union;
}

export interface ExcalidrawPropertiesPanelProps {
  open: boolean;
  style: ExcalidrawStyleState;
  selectedCount: number;
  capabilities?: ExcalidrawPropertyCapabilities;
  hasCopiedStyle?: boolean;
  darkCanvas?: boolean;
  onChangeStyle: (patch: Partial<ExcalidrawStyleState>) => void;
  onAlign?: (action: AlignAction) => void;
  onDistribute?: (axis: DistributeAction) => void;
  onLayerAction?: (dir: 'back' | 'backward' | 'forward' | 'front') => void;
  onGroupToggle?: () => void;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
}

const ALL_CAPABILITIES: ExcalidrawPropertyCapabilities = {
  hasAny: true,
  strokeColor: true,
  backgroundColor: true,
  fillStyle: true,
  strokeWidth: true,
  strokeStyle: true,
  roughness: true,
  roundness: true,
  fontFamily: true,
  opacity: true,
};

export const ExcalidrawPropertiesPanel: React.FC<ExcalidrawPropertiesPanelProps> = ({
  open,
  style,
  selectedCount,
  capabilities = ALL_CAPABILITIES,
  hasCopiedStyle = false,
  darkCanvas = false,
  onChangeStyle,
  onAlign,
  onDistribute,
  onLayerAction,
  onGroupToggle,
  onCopyStyle,
  onPasteStyle,
  onDuplicate,
  onDelete,
  onClose,
}) => {
  if (!open || !capabilities.hasAny) return null;

  const panelCls = darkCanvas
    ? 'border-slate-700 bg-slate-900/96 text-slate-100'
    : 'border-slate-200/90 bg-white/96 text-slate-800';
  const btnBase = darkCanvas
    ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';
  const btnActive = 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300';

  return (
    <aside
      data-testid="excalidraw-properties-panel"
      onPointerDown={(e) => e.stopPropagation()}
      className={`fixed top-20 left-3 z-30 flex max-h-[calc(100vh-140px)] w-56 flex-col gap-3 overflow-y-auto rounded-2xl border p-3 text-[11px] shadow-xl backdrop-blur-md select-none ${panelCls}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
          Gaya & Properti
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-200/50"
            title="Sembunyikan Panel Properti"
          >
            ×
          </button>
        )}
      </div>

      {/* Stroke Color */}
      {capabilities.strokeColor && (
      <div data-testid="prop-section-stroke-color">
        <div className="mb-1 text-[10px] font-semibold opacity-70">Garis (Stroke)</div>
        <div className="flex items-center gap-1.5">
          {EXCALIDRAW_STROKE_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChangeStyle({ strokeColor: hex })}
              aria-label={`Stroke ${hex}`}
              className={`h-6 w-6 rounded-md border transition ${
                style.strokeColor.toLowerCase() === hex.toLowerCase()
                  ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105'
                  : 'border-slate-300 hover:scale-105'
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
          <input
            type="color"
            value={style.strokeColor}
            onChange={(e) => onChangeStyle({ strokeColor: e.target.value })}
            aria-label="Warna Stroke Kustom"
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
          />
        </div>
      </div>
      )}

      {/* Background Fill */}
      {capabilities.backgroundColor && (
      <div data-testid="prop-section-background-color">
        <div className="mb-1 text-[10px] font-semibold opacity-70">Isian (Background)</div>
        <div className="flex items-center gap-1.5">
          {EXCALIDRAW_BG_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChangeStyle({ backgroundColor: hex })}
              aria-label={`Fill ${hex}`}
              className={`h-6 w-6 rounded-md border transition ${
                style.backgroundColor.toLowerCase() === hex.toLowerCase()
                  ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105'
                  : 'border-slate-300 hover:scale-105'
              }`}
              style={{
                backgroundColor: hex === 'transparent' ? '#ffffff' : hex,
                backgroundImage:
                  hex === 'transparent'
                    ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)'
                    : undefined,
                backgroundSize: '8px 8px',
              }}
            />
          ))}
          <input
            type="color"
            value={style.backgroundColor === 'transparent' ? '#a5d8ff' : style.backgroundColor}
            onChange={(e) => onChangeStyle({ backgroundColor: e.target.value })}
            aria-label="Warna Fill Kustom"
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
          />
        </div>
      </div>
      )}

      {/* Fill Style */}
      {capabilities.fillStyle && (
      <div data-testid="prop-section-fill-style">
        <div className="mb-1 text-[10px] font-semibold opacity-70">Pola Isian</div>
        <div className="grid grid-cols-3 gap-1">
          {([
            ['hachure', 'Arsir'],
            ['cross-hatch', 'Silang'],
            ['solid', 'Solid'],
          ] as Array<[FillStyleKind, string]>).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => onChangeStyle({ fillStyle: val })}
              className={`rounded-lg border py-1 text-[10px] font-semibold transition ${
                style.fillStyle === val ? btnActive : btnBase
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Stroke Width */}
      {capabilities.strokeWidth && (
      <div data-testid="prop-section-stroke-width">
        <div className="mb-1 text-[10px] font-semibold opacity-70">Ketebalan Garis</div>
        <div className="grid grid-cols-3 gap-1">
          {([
            [2, 'Tipis'],
            [4, 'Sedang'],
            [7, 'Tebal'],
          ] as const).map(([w, lbl]) => (
            <button
              key={w}
              type="button"
              onClick={() => onChangeStyle({ strokeWidth: w })}
              className={`rounded-lg border py-1 text-[10px] font-semibold transition ${
                style.strokeWidth === w ? btnActive : btnBase
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Stroke Style */}
      {capabilities.strokeStyle && (
      <div data-testid="prop-section-stroke-style">
        <div className="mb-1 text-[10px] font-semibold opacity-70">Jenis Garis</div>
        <div className="grid grid-cols-3 gap-1">
          {([
            ['solid', '───'],
            ['dashed', '─ ─'],
            ['dotted', '···'],
          ] as Array<[StrokeStyleKind, string]>).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              onClick={() => onChangeStyle({ strokeStyle: val })}
              className={`rounded-lg border py-1 font-mono text-[10px] font-bold transition ${
                style.strokeStyle === val ? btnActive : btnBase
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Sloppiness / Roughness (Signature Excalidraw hand-drawn feel!) */}
      {capabilities.roughness && (
      <div data-testid="prop-section-roughness">
        <div className="mb-1 text-[10px] font-semibold opacity-70">Gaya Sketsa (Roughness)</div>
        <div className="grid grid-cols-3 gap-1">
          {([
            [0, 'Presisi'],
            [1, 'Sketsa'],
            [2, 'Kartun'],
          ] as Array<[RoughnessLevel, string]>).map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              data-testid={`roughness-btn-${val}`}
              onClick={() => onChangeStyle({ roughness: val })}
              className={`rounded-lg border py-1 text-[10px] font-semibold transition ${
                style.roughness === val ? btnActive : btnBase
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Edges + Font Family */}
      {(capabilities.roundness || capabilities.fontFamily) && (
      <div className={`grid gap-1.5 ${capabilities.roundness && capabilities.fontFamily ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {capabilities.roundness && (
        <div data-testid="prop-section-roundness">
          <div className="mb-1 text-[10px] font-semibold opacity-70">Sudut</div>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onChangeStyle({ roundness: 'sharp' })}
              className={`rounded-lg border py-1 text-[10px] font-semibold ${style.roundness === 'sharp' ? btnActive : btnBase}`}
            >
              Siku
            </button>
            <button
              type="button"
              onClick={() => onChangeStyle({ roundness: 'round' })}
              className={`rounded-lg border py-1 text-[10px] font-semibold ${style.roundness === 'round' ? btnActive : btnBase}`}
            >
              Bulat
            </button>
          </div>
        </div>
        )}
        {capabilities.fontFamily && (
        <div data-testid="prop-section-font-family" className="space-y-2">
          <div>
            <div className="mb-1 text-[10px] font-semibold opacity-70">Font</div>
            <div className="grid grid-cols-3 gap-0.5">
              {([['hand', '✍'], ['sans', 'Aa'], ['mono', '</>']] as Array<[FontFamilyKind, string]>).map(([f, icon]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChangeStyle({ fontFamily: f })}
                  className={`rounded-lg border py-1 text-[10px] font-bold ${style.fontFamily === f ? btnActive : btnBase}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div data-testid="prop-section-font-size">
            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold opacity-70">
              <span>Ukuran Teks</span>
              <span className="font-mono">{style.fontSize ?? 16}px</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {([
                [14, 'S'],
                [18, 'M'],
                [24, 'L'],
                [34, 'XL'],
              ] as Array<[number, string]>).map(([sz, lbl]) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onChangeStyle({ fontSize: sz })}
                  className={`rounded-lg border py-1 text-[10px] font-bold ${
                    Math.abs((style.fontSize ?? 16) - sz) <= 2 ? btnActive : btnBase
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
      )}

      {/* Opacity */}
      {capabilities.opacity && (
      <div data-testid="prop-section-opacity">
        <div className="mb-1 flex justify-between text-[10px] font-semibold opacity-70">
          <span>Opasitas</span>
          <span className="font-mono font-bold">{style.opacity}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={style.opacity}
          onChange={(e) => onChangeStyle({ opacity: Number(e.target.value) })}
          className="w-full accent-indigo-600"
        />
      </div>
      )}

      {/* Layer Ordering */}
      {selectedCount > 0 && onLayerAction && (
        <div>
          <div className="mb-1 text-[10px] font-semibold opacity-70">Urutan Lapisan</div>
          <div className="grid grid-cols-4 gap-1">
            {([
              ['back', '⤓', 'Paling Belakang'],
              ['backward', '↓', 'Mundur'],
              ['forward', '↑', 'Maju'],
              ['front', '⤒', 'Paling Depan'],
            ] as const).map(([dir, icon, title]) => (
              <button
                key={dir}
                type="button"
                title={title}
                onClick={() => onLayerAction(dir)}
                className={`rounded-lg border py-1 text-xs font-bold ${btnBase}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Align & Distribute (Multi-Select >= 2) */}
      {selectedCount >= 2 && onAlign && (
        <div>
          <div className="mb-1 text-[10px] font-semibold opacity-70">Ratakan & Distribusi</div>
          <div className="grid grid-cols-6 gap-1">
            {([
              ['left', '⇤'],
              ['center', '⇹'],
              ['right', '⇥'],
              ['top', '⤒'],
              ['middle', '⇳'],
              ['bottom', '⤓'],
            ] as Array<[AlignAction, string]>).map(([act, icon]) => (
              <button
                key={act}
                type="button"
                title={`Ratakan ${act}`}
                onClick={() => onAlign(act)}
                className={`rounded-lg border py-1 text-xs font-bold ${btnBase}`}
              >
                {icon}
              </button>
            ))}
          </div>
          {selectedCount >= 3 && onDistribute && (
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button type="button" onClick={() => onDistribute('horizontal')} className={`rounded-lg border py-1 text-[10px] font-semibold ${btnBase}`}>
                Sebar H
              </button>
              <button type="button" onClick={() => onDistribute('vertical')} className={`rounded-lg border py-1 text-[10px] font-semibold ${btnBase}`}>
                Sebar V
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {selectedCount > 0 && (
        <div className="grid grid-cols-2 gap-1 border-t border-slate-200/70 pt-2">
          {onCopyStyle && (
            <button type="button" onClick={onCopyStyle} className={`rounded-lg border py-1 text-[10px] font-semibold ${btnBase}`}>
              Salin Gaya
            </button>
          )}
          {onPasteStyle && (
            <button
              type="button"
              disabled={!hasCopiedStyle}
              onClick={onPasteStyle}
              className={`rounded-lg border py-1 text-[10px] font-semibold disabled:opacity-40 ${btnBase}`}
            >
              Tempel Gaya
            </button>
          )}
          {selectedCount >= 2 && onGroupToggle && (
            <button type="button" onClick={onGroupToggle} className={`col-span-2 rounded-lg border py-1 text-[10px] font-semibold ${btnBase}`}>
              Grup / Pisah (Ctrl+G)
            </button>
          )}
          {onDuplicate && (
            <button type="button" onClick={onDuplicate} className={`rounded-lg border py-1 text-[10px] font-semibold ${btnBase}`}>
              Duplikat
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-rose-200 bg-rose-50 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-100"
            >
              Hapus
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
