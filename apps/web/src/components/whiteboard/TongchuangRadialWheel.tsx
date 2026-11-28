/**
 * TongchuangRadialWheel.tsx — P11-T02
 * Context-aware white circular AI Radial Wheel triggered on Right-Click (or long-press / Shift+F10),
 * inspired by iFLYTEK Tongchuang AI Blackboard (讯飞同窗AI黑板).
 *
 * Two automatic modes:
 * - mode="object" (right-click on an object):
 *     Center "AI" -> Jelaskan AI
 *     6 slots -> Ubah ke 3D / Rumus→Grafik, Warna (expands 10-color arc), Duplikat, Hapus, Kunci, Ke Depan
 * - mode="canvas" (right-click on empty canvas):
 *     Center "AI" -> expands AI Smart Hub arc (Kubus 3D, Rumus→Grafik, Suara AI, Template, Ringkasan)
 *     6 slots -> Seleksi, Pena & Warna (expands 10-color + stroke-width arcs), Bangun 3D (expands 7 solids), Penghapus, Undo, Suara AI
 */

import React, { useState, useEffect, useRef } from 'react';
import type { ToolType } from '@/hooks/useWhiteboardTool';
import type { SolidType } from '@ai-classroom/geometry-core';

export type RadialSubArc = 'none' | 'pen' | 'solid' | 'ai' | 'object_color';

export interface TongchuangRadialWheelProps {
  /** Whether right-clicked on a selected object or empty canvas */
  mode?: 'canvas' | 'object';
  /** Screen position (clientX, clientY) where the radial wheel opens */
  position?: { x: number; y: number };
  /** Callback to close the right-click radial wheel */
  onClose?: () => void;

  // Canvas-mode props
  activeTool?: ToolType;
  color?: string;
  strokeWidth?: number;
  canUndo?: boolean;
  isListeningVoice?: boolean;
  onToolChange?: (tool: ToolType) => void;
  onColorChange?: (color: string) => void;
  onStrokeWidthChange?: (width: number) => void;
  onUndo?: () => void;
  onInsertSolid?: (solidType: SolidType) => void;
  onInsertFormula?: () => void;
  onOpenFormulaGraph?: () => void;
  onToggleVoice?: () => void;
  onOpenSummary?: () => void;
  onOpenTemplates?: () => void;

  // Object-mode props
  selectedCount?: number;
  canConvert3D?: boolean;
  canMergeTo2D?: boolean;
  canUngroup?: boolean;
  isLocked?: boolean;
  onConvert3D?: () => void;
  onMergeTo2D?: () => void;
  onUngroup?: () => void;
  onExplainAi?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onToggleLock?: () => void;
  onBringToFront?: () => void;
  onRecolorObject?: (color: string) => void;
}

const WHEEL_COLORS = [
  { label: 'Putih Kapur', value: '#f8fafc' },
  { label: 'Merah', value: '#ef4444' },
  { label: 'Biru', value: '#3b82f6' },
  { label: 'Kuning', value: '#facc15' },
  { label: 'Mint', value: '#10b981' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Ungu', value: '#8b5cf6' },
  { label: 'Hijau Limau', value: '#84cc16' },
  { label: 'Oranye', value: '#f97316' },
  { label: 'Hitam', value: '#111827' },
];

const STROKE_WIDTHS = [
  { label: 'Tipis', value: 2 },
  { label: 'Sedang', value: 4 },
  { label: 'Tebal', value: 7 },
  { label: 'Sangat Tebal', value: 12 },
];

const QUICK_SOLIDS: { type: SolidType; label: string; icon: string }[] = [
  { type: 'cube', label: 'Kubus', icon: '🧊' },
  { type: 'cuboid', label: 'Balok', icon: '📦' },
  { type: 'pyramid', label: 'Limas', icon: '🔺' },
  { type: 'prism', label: 'Prisma', icon: '📐' },
  { type: 'cylinder', label: 'Tabung', icon: '🥫' },
  { type: 'cone', label: 'Kerucut', icon: '🎉' },
  { type: 'sphere', label: 'Bola', icon: '🌐' },
];

export const TongchuangRadialWheel: React.FC<TongchuangRadialWheelProps> = ({
  mode = 'canvas',
  position,
  onClose,
  activeTool = 'pen',
  color = '#f8fafc',
  strokeWidth = 3,
  canUndo = false,
  isListeningVoice = false,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onInsertSolid,
  onInsertFormula,
  onOpenFormulaGraph,
  onToggleVoice,
  onOpenSummary,
  onOpenTemplates,
  selectedCount = 0,
  canConvert3D = false,
  canMergeTo2D = false,
  canUngroup = false,
  isLocked = false,
  onConvert3D,
  onMergeTo2D,
  onUngroup,
  onExplainAi,
  onDuplicate,
  onDelete,
  onToggleLock,
  onBringToFront,
  onRecolorObject,
}) => {
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const [expandedArc, setExpandedArc] = useState<RadialSubArc>('none');

  // Clamp wheel position safely inside viewport (accounting for expanded outer arcs)
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 720;
  const rawX = position?.x ?? w / 2;
  const rawY = position?.y ?? h / 2;
  const clampedX = Math.max(150, Math.min(w - 150, rawX));
  const clampedY = Math.max(150, Math.min(h - 150, rawY));

  // Click outside to close
  useEffect(() => {
    if (!onClose) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside, { capture: true });
    return () => window.removeEventListener('mousedown', handleClickOutside, { capture: true });
  }, [onClose]);

  // Escape closes expanded arc first, then wheel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedArc !== 'none') {
          setExpandedArc('none');
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedArc, onClose]);

  const toggleArc = (arc: RadialSubArc) => {
    setExpandedArc((prev) => (prev === arc ? 'none' : arc));
  };

  // ── 6 Radial Slots depending on mode ("object" vs "canvas") ──────────────
  const ringSlots =
    mode === 'object'
      ? [
          canConvert3D
            ? {
                id: 'convert3d',
                label: 'Ubah ke 3D',
                icon: '🧊',
                angleDeg: -90,
                active: false,
                disabled: false,
                onClick: () => {
                  onConvert3D?.();
                  onClose?.();
                },
              }
            : {
                id: 'graph',
                label: 'Rumus → Grafik',
                icon: '📈',
                angleDeg: -90,
                active: false,
                disabled: false,
                onClick: () => {
                  onOpenFormulaGraph?.();
                  onClose?.();
                },
              },
          {
            id: 'obj_color',
            label: 'Ubah Warna',
            icon: '🎨',
            angleDeg: -30,
            active: expandedArc === 'object_color',
            disabled: false,
            onClick: () => toggleArc('object_color'),
          },
          {
            id: 'duplicate',
            label: 'Duplikat (Ctrl+D)',
            icon: '📋',
            angleDeg: 30,
            active: false,
            disabled: false,
            onClick: () => {
              onDuplicate?.();
              onClose?.();
            },
          },
          {
            id: 'delete',
            label: 'Hapus (Del)',
            icon: '🗑️',
            angleDeg: 90,
            active: false,
            disabled: false,
            onClick: () => {
              onDelete?.();
              onClose?.();
            },
          },
          {
            id: 'lock',
            label: isLocked ? 'Buka Kunci' : 'Kunci Objek',
            icon: isLocked ? '🔓' : '🔒',
            angleDeg: 150,
            active: isLocked,
            disabled: false,
            onClick: () => {
              onToggleLock?.();
              onClose?.();
            },
          },
          canMergeTo2D
            ? {
                id: 'merge_2d',
                label: 'Gabung Objek',
                icon: '🔗',
                angleDeg: -150,
                active: false,
                disabled: false,
                onClick: () => {
                  onMergeTo2D?.();
                  onClose?.();
                },
              }
            : canUngroup
              ? {
                  id: 'ungroup_2d',
                  label: 'Pisah Grup',
                  icon: '✂️',
                  angleDeg: -150,
                  active: false,
                  disabled: false,
                  onClick: () => {
                    onUngroup?.();
                    onClose?.();
                  },
                }
              : {
                  id: 'formula_calc',
                  label: 'Hitung Rumus (∑)',
                  icon: '∑',
                  angleDeg: -150,
                  active: false,
                  disabled: false,
                  onClick: () => {
                    onInsertFormula?.();
                    onClose?.();
                  },
                },
        ]
      : [
          {
            id: 'select',
            label: 'Seleksi (V)',
            icon: '↖',
            angleDeg: -90,
            active: activeTool === 'select',
            disabled: false,
            onClick: () => {
              onToolChange?.('select');
              onClose?.();
            },
          },
          {
            id: 'pen',
            label: 'Pena & Warna',
            icon: '✏️',
            angleDeg: -30,
            active: activeTool === 'pen' || activeTool === 'highlighter' || expandedArc === 'pen',
            disabled: false,
            onClick: () => {
              onToolChange?.('pen');
              toggleArc('pen');
            },
          },
          {
            id: 'solid3d',
            label: 'Sisipkan Bangun 3D',
            icon: '🧊',
            angleDeg: 30,
            active: expandedArc === 'solid',
            disabled: false,
            onClick: () => toggleArc('solid'),
          },
          {
            id: 'eraser',
            label: 'Penghapus',
            icon: '⌫',
            angleDeg: 90,
            active: activeTool === 'eraser',
            disabled: false,
            onClick: () => {
              onToolChange?.('eraser');
              onClose?.();
            },
          },
          {
            id: 'undo',
            label: 'Undo (Ctrl+Z)',
            icon: '↩',
            angleDeg: 150,
            active: false,
            disabled: !canUndo,
            onClick: () => {
              onUndo?.();
              onClose?.();
            },
          },
          {
            id: 'formula_calc',
            label: 'Hitung Rumus (∑)',
            icon: '∑',
            angleDeg: -150,
            active: false,
            disabled: false,
            onClick: () => {
              onInsertFormula?.();
              onClose?.();
            },
          },
        ];

  const aiArcItems = [
    {
      id: 'ai-cube',
      label: 'Kubus 3D',
      icon: '🧊',
      onClick: () => {
        onInsertSolid?.('cube');
        onClose?.();
      },
    },
    {
      id: 'ai-graph',
      label: 'Grafik',
      icon: '📈',
      onClick: () => {
        onOpenFormulaGraph?.();
        onClose?.();
      },
    },
    {
      id: 'ai-voice',
      label: 'Suara',
      icon: '🎙️',
      onClick: () => {
        onToggleVoice?.();
        onClose?.();
      },
    },
    {
      id: 'ai-template',
      label: 'Template',
      icon: '📚',
      onClick: () => {
        onOpenTemplates?.();
        onClose?.();
      },
    },
    {
      id: 'ai-summary',
      label: 'Ringkas',
      icon: '📝',
      onClick: () => {
        onOpenSummary?.();
        onClose?.();
      },
    },
  ];

  return (
    <div
      ref={wheelRef}
      data-testid="tongchuang-radial-wheel"
      role="menu"
      aria-label={mode === 'object' ? 'Menu Radial Objek' : 'Menu Radial Kanvas AI'}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Mode Badge above wheel */}
      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200/80 bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-md">
        {mode === 'object' ? `Objek Terpilih (${Math.max(1, selectedCount)})` : 'Menu Kanvas AI'}
      </div>

      {/* Concentric Arc: OBJECT RECOLOR (10 colors) */}
      {expandedArc === 'object_color' && (
        <div
          role="menu"
          aria-label="Ubah Warna Objek"
          data-testid="radial-object-color-arc"
          className="pointer-events-none absolute inset-0"
        >
          {WHEEL_COLORS.map((c, idx) => {
            const angleDeg = -115 + (idx / (WHEEL_COLORS.length - 1)) * 270;
            const rad = (angleDeg * Math.PI) / 180;
            const r = 92;
            const x = Math.round(Math.cos(rad) * r);
            const y = Math.round(Math.sin(rad) * r);

            return (
              <button
                key={c.value}
                type="button"
                role="menuitem"
                data-testid={`wheel-obj-color-${c.value}`}
                aria-label={`Ubah warna ${c.label}`}
                title={c.label}
                onClick={() => {
                  onRecolorObject?.(c.value);
                  // Keep menu open so user can preview/switch colors without re-opening
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                className="pointer-events-auto absolute flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white shadow-lg transition-transform hover:scale-115 active:scale-95"
              >
                <span
                  className="h-4 w-4 rounded-full border border-slate-300/60"
                  style={{ backgroundColor: c.value }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Concentric Arc: PEN COLORS + STROKE WIDTHS (Canvas mode) */}
      {expandedArc === 'pen' && (
        <div
          role="menu"
          aria-label="Palet Warna dan Ketebalan Pena"
          data-testid="radial-pen-arc"
          className="pointer-events-none absolute inset-0"
        >
          {WHEEL_COLORS.map((c, idx) => {
            const angleDeg = -115 + (idx / (WHEEL_COLORS.length - 1)) * 270;
            const rad = (angleDeg * Math.PI) / 180;
            const r = 90;
            const x = Math.round(Math.cos(rad) * r);
            const y = Math.round(Math.sin(rad) * r);
            const isSelected = color.toLowerCase() === c.value.toLowerCase();

            return (
              <button
                key={c.value}
                type="button"
                role="menuitem"
                data-testid={`wheel-color-${c.value}`}
                aria-label={`Warna ${c.label}`}
                title={c.label}
                onClick={() => {
                  onColorChange?.(c.value);
                  onToolChange?.('pen');
                  // Stay open until user clicks outside
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                className={`pointer-events-auto absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-115 active:scale-95 ${
                  isSelected ? 'ring-2 ring-cyan-500 scale-115' : 'border border-slate-200'
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-slate-300/60"
                  style={{ backgroundColor: c.value }}
                />
              </button>
            );
          })}

          {STROKE_WIDTHS.map((sw, idx) => {
            const angleDeg = -85 + idx * 24;
            const rad = (angleDeg * Math.PI) / 180;
            const r = 130;
            const x = Math.round(Math.cos(rad) * r);
            const y = Math.round(Math.sin(rad) * r);
            const isSelected = strokeWidth === sw.value && activeTool === 'pen';

            return (
              <button
                key={sw.value}
                type="button"
                role="menuitem"
                aria-label={`Ketebalan ${sw.label}`}
                title={`Ketebalan: ${sw.label} (${sw.value}px)`}
                onClick={() => {
                  onStrokeWidthChange?.(sw.value);
                  onToolChange?.('pen');
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                className={`pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-110 ${
                  isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'border border-slate-200'
                }`}
              >
                <span
                  className="rounded-full bg-slate-800"
                  style={{
                    width: `${Math.min(16, sw.value + 3)}px`,
                    height: `${Math.min(16, sw.value + 3)}px`,
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Concentric Arc: QUICK 3D SOLIDS */}
      {expandedArc === 'solid' && (
        <div
          role="menu"
          aria-label="Sisipkan Bangun Ruang 3D"
          data-testid="radial-solid-arc"
          className="pointer-events-none absolute inset-0"
        >
          {QUICK_SOLIDS.map((s, idx) => {
            const angleDeg = -135 + (idx / (QUICK_SOLIDS.length - 1)) * 210;
            const rad = (angleDeg * Math.PI) / 180;
            const r = 98;
            const x = Math.round(Math.cos(rad) * r);
            const y = Math.round(Math.sin(rad) * r);

            return (
              <button
                key={s.type}
                type="button"
                role="menuitem"
                data-testid={`wheel-solid-${s.type}`}
                aria-label={`Sisipkan ${s.label} 3D`}
                title={`Sisipkan ${s.label} 3D`}
                onClick={() => {
                  onInsertSolid?.(s.type);
                  onClose?.();
                }}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                className="pointer-events-auto absolute flex h-11 w-11 flex-col items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-800 shadow-xl transition-transform hover:scale-110 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95"
              >
                <span className="text-sm leading-none">{s.icon}</span>
                <span className="mt-0.5 text-[8px] font-semibold leading-none">{s.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Concentric Arc: AI SMART HUB */}
      {expandedArc === 'ai' && (
        <div
          role="menu"
          aria-label="Menu Cerdas AI"
          data-testid="radial-ai-arc"
          className="pointer-events-none absolute inset-0"
        >
          {aiArcItems.map((item, idx) => {
            const angleDeg = -165 + (idx / (aiArcItems.length - 1)) * 150;
            const rad = (angleDeg * Math.PI) / 180;
            const r = 100;
            const x = Math.round(Math.cos(rad) * r);
            const y = Math.round(Math.sin(rad) * r);

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                data-testid={`wheel-${item.id}`}
                aria-label={item.label}
                title={item.label}
                onClick={item.onClick}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                className="pointer-events-auto absolute flex h-12 w-12 flex-col items-center justify-center rounded-full border border-cyan-200 bg-white/95 text-slate-800 shadow-xl transition-transform hover:scale-110 hover:bg-cyan-50 hover:text-cyan-700 active:scale-95"
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span className="mt-0.5 text-[8px] font-semibold leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN WHITE CIRCULAR DISC WITH CRISP 6-SECTOR DIVIDER LINES */}
      <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 shadow-[0_12px_36px_rgba(0,0,0,0.22)] backdrop-blur-md">
        {/* Radial divider lines separating every feature sector */}
        <svg
          aria-hidden="true"
          viewBox="0 0 144 144"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 72 + Math.cos(rad) * 28;
            const y1 = 72 + Math.sin(rad) * 28;
            const x2 = 72 + Math.cos(rad) * 70;
            const y2 = 72 + Math.sin(rad) * 70;
            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#e2e8f0"
                strokeWidth="1.25"
              />
            );
          })}
        </svg>

        {ringSlots.map((slot) => {
          const rad = (slot.angleDeg * Math.PI) / 180;
          const r = 48;
          const x = Math.round(Math.cos(rad) * r);
          const y = Math.round(Math.sin(rad) * r);

          const handleHover = () => {
            if (slot.id === 'obj_color') setExpandedArc('object_color');
            else if (slot.id === 'pen') setExpandedArc('pen');
            else if (slot.id === 'solid3d') setExpandedArc('solid');
          };

          return (
            <button
              key={slot.id}
              type="button"
              role="menuitem"
              data-testid={`wheel-slot-${slot.id}`}
              disabled={slot.disabled}
              aria-label={slot.label}
              title={slot.label}
              onMouseEnter={handleHover}
              onClick={slot.onClick}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
              className={`absolute flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all active:scale-90 ${
                slot.disabled
                  ? 'cursor-not-allowed text-slate-300'
                  : slot.id === 'delete'
                  ? 'text-slate-600 hover:bg-red-50 hover:text-red-600'
                  : slot.active
                  ? 'bg-cyan-500/15 text-cyan-700 ring-1 ring-cyan-400/60 font-bold'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <span>{slot.icon}</span>
            </button>
          );
        })}

        {/* Center Glowing "AI" Hub Button */}
        <button
          type="button"
          role="menuitem"
          data-testid="wheel-center-ai"
          aria-label={mode === 'object' ? 'Jelaskan Objek dengan AI' : 'Buka Menu Cerdas AI'}
          title={mode === 'object' ? 'Jelaskan Objek dengan AI' : 'Menu Cerdas AI'}
          onMouseEnter={() => {
            if (mode === 'canvas') setExpandedArc('ai');
          }}
          onClick={() => {
            if (mode === 'object') {
              onExplainAi?.();
              onClose?.();
            } else {
              toggleArc('ai');
            }
          }}
          className={`relative z-10 flex h-13 w-13 items-center justify-center rounded-full border-2 text-base font-extrabold tracking-tight transition-all active:scale-95 ${
            expandedArc === 'ai'
              ? 'border-cyan-400 bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.55)]'
              : 'border-cyan-300/80 bg-gradient-to-b from-white to-slate-50 text-slate-700 shadow-[0_0_14px_rgba(56,189,248,0.35)] hover:border-cyan-400 hover:text-cyan-700'
          }`}
        >
          AI
        </button>
      </div>
    </div>
  );
};
