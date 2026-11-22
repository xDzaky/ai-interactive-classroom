/**
 * TongchuangRadialWheel.tsx — P11-T02
 * Signature floating white circular AI Radial Wheel inspired by iFLYTEK Tongchuang AI Blackboard (讯飞同窗AI黑板).
 *
 * Visual anatomy (matching reference screenshots):
 * - Draggable white circular disc (~128px) with soft elevation shadow
 * - Center glowing "AI" circular hub button (opens contextual AI & 3D actions arc)
 * - 6 radial tool icons around the inner disc (Select, Pen+Color Arc, 3D Solids Arc, Eraser, Undo, Voice/AI)
 * - Concentric expandable white pill arcs for 10 chalk/pen colors + stroke widths
 */

import React, { useState, useEffect, useRef } from 'react';
import type { ToolType } from '@/hooks/useWhiteboardTool';
import type { SolidType } from '@ai-classroom/geometry-core';

export type RadialSubArc = 'none' | 'pen' | 'solid' | 'ai';

export interface TongchuangRadialWheelProps {
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  canUndo?: boolean;
  isListeningVoice?: boolean;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onUndo?: () => void;
  onInsertSolid?: (solidType: SolidType) => void;
  onOpenFormulaGraph?: () => void;
  onToggleVoice?: () => void;
  onOpenSummary?: () => void;
  onOpenTemplates?: () => void;
  defaultPosition?: { x: number; y: number };
}

const STORAGE_KEY = 'tongchuang_ai_wheel_pos';

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
  activeTool,
  color,
  strokeWidth,
  canUndo = false,
  isListeningVoice = false,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo,
  onInsertSolid,
  onOpenFormulaGraph,
  onToggleVoice,
  onOpenSummary,
  onOpenTemplates,
  defaultPosition,
}) => {
  const [expandedArc, setExpandedArc] = useState<RadialSubArc>('none');
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (defaultPosition) return defaultPosition;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 720;
    return { x: Math.max(120, w - 160), y: Math.max(180, h - 190) };
  });

  const dragRef = useRef<{
    dragging: boolean;
    moved: boolean;
    offsetX: number;
    offsetY: number;
  }>({ dragging: false, moved: false, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      dragRef.current.moved = true;
      const nx = Math.max(84, Math.min(window.innerWidth - 84, e.clientX - dragRef.current.offsetX));
      const ny = Math.max(84, Math.min(window.innerHeight - 84, e.clientY - dragRef.current.offsetY));
      setPosition({ x: nx, y: ny });
    };

    const onPointerUp = () => {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [position]);

  // Global Shift+F10 and Escape support (WCAG 2.2 AA)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedArc !== 'none') {
        setExpandedArc('none');
      } else if (e.shiftKey && e.key === 'F10') {
        e.preventDefault();
        setExpandedArc((prev) => (prev === 'ai' ? 'none' : 'ai'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedArc]);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button[data-no-drag="true"]')) return;
    dragRef.current = {
      dragging: true,
      moved: false,
      offsetX: e.clientX - position.x,
      offsetY: e.clientY - position.y,
    };
  };

  const toggleArc = (arc: RadialSubArc) => {
    if (dragRef.current.moved) return;
    setExpandedArc((prev) => (prev === arc ? 'none' : arc));
  };

  // 6 ring slots around the 128px white wheel (radius = 44px)
  const ringSlots = [
    {
      id: 'select',
      label: 'Seleksi (V)',
      icon: '↖',
      angleDeg: -90,
      active: activeTool === 'select',
      onClick: () => {
        onToolChange('select');
        setExpandedArc('none');
      },
    },
    {
      id: 'pen',
      label: 'Pena & Warna',
      icon: '✏️',
      angleDeg: -30,
      active: activeTool === 'pen' || activeTool === 'highlighter' || expandedArc === 'pen',
      onClick: () => {
        onToolChange('pen');
        toggleArc('pen');
      },
    },
    {
      id: 'solid3d',
      label: 'Bangun Ruang 3D',
      icon: '🧊',
      angleDeg: 30,
      active: expandedArc === 'solid',
      onClick: () => toggleArc('solid'),
    },
    {
      id: 'eraser',
      label: 'Penghapus',
      icon: '⌫',
      angleDeg: 90,
      active: activeTool === 'eraser',
      onClick: () => {
        onToolChange('eraser');
        setExpandedArc('none');
      },
    },
    {
      id: 'undo',
      label: 'Undo (Ctrl+Z)',
      icon: '↩',
      angleDeg: 150,
      active: false,
      disabled: !canUndo,
      onClick: () => onUndo?.(),
    },
    {
      id: 'voice',
      label: isListeningVoice ? 'Matikan Suara' : 'Perintah Suara AI',
      icon: isListeningVoice ? '🔴' : '🎙️',
      angleDeg: -150,
      active: isListeningVoice,
      onClick: () => onToggleVoice?.(),
    },
  ];

  const aiArcItems = [
    {
      id: 'ai-cube',
      label: 'Kubus 3D',
      icon: '🧊',
      onClick: () => {
        onInsertSolid?.('cube');
        setExpandedArc('none');
      },
    },
    {
      id: 'ai-graph',
      label: 'Rumus → Grafik',
      icon: '📈',
      onClick: () => {
        onOpenFormulaGraph?.();
        setExpandedArc('none');
      },
    },
    {
      id: 'ai-voice',
      label: 'Suara AI',
      icon: '🎙️',
      onClick: () => {
        onToggleVoice?.();
        setExpandedArc('none');
      },
    },
    {
      id: 'ai-template',
      label: 'Template',
      icon: '📚',
      onClick: () => {
        onOpenTemplates?.();
        setExpandedArc('none');
      },
    },
    {
      id: 'ai-summary',
      label: 'Ringkasan',
      icon: '📝',
      onClick: () => {
        onOpenSummary?.();
        setExpandedArc('none');
      },
    },
  ];

  return (
    <div
      data-testid="tongchuang-radial-wheel"
      role="region"
      aria-label="Roda AI Tongchuang"
      onPointerDown={startDrag}
      className="fixed z-40 select-none touch-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Concentric Expanded Arc: PEN COLORS + STROKE WIDTHS (Screenshot 2) */}
      {expandedArc === 'pen' && (
        <div
          role="menu"
          aria-label="Palet Warna dan Ketebalan Pena"
          data-testid="radial-pen-arc"
          className="pointer-events-none absolute inset-0"
        >
          {/* Inner Arc: 10 vivid chalk/pen color dots */}
          {WHEEL_COLORS.map((c, idx) => {
            const startAngle = -115;
            const endAngle = 155;
            const angleDeg = startAngle + (idx / (WHEEL_COLORS.length - 1)) * (endAngle - startAngle);
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
                data-no-drag="true"
                data-testid={`wheel-color-${c.value}`}
                aria-label={`Warna ${c.label}`}
                title={c.label}
                onClick={() => {
                  onColorChange(c.value);
                  onToolChange('pen');
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

          {/* Outer Arc: Stroke width presets + Highlighter */}
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
                data-no-drag="true"
                aria-label={`Ketebalan ${sw.label}`}
                title={`Ketebalan: ${sw.label} (${sw.value}px)`}
                onClick={() => {
                  onStrokeWidthChange(sw.value);
                  onToolChange('pen');
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

          {/* Highlighter button at end of outer arc */}
          <button
            type="button"
            role="menuitem"
            data-no-drag="true"
            aria-label="Stabilo"
            title="Stabilo"
            onClick={() => onToolChange('highlighter')}
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${Math.round(Math.cos((15 * Math.PI) / 180) * 130)}px), calc(-50% + ${Math.round(Math.sin((15 * Math.PI) / 180) * 130)}px))`,
            }}
            className={`pointer-events-auto absolute flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs shadow-lg transition-transform hover:scale-110 ${
              activeTool === 'highlighter' ? 'ring-2 ring-amber-400 bg-amber-50' : 'border border-slate-200'
            }`}
          >
            🖊
          </button>
        </div>
      )}

      {/* Concentric Expanded Arc: QUICK 3D SOLIDS */}
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
                data-no-drag="true"
                data-testid={`wheel-solid-${s.type}`}
                aria-label={`Sisipkan ${s.label} 3D`}
                title={`Sisipkan ${s.label} 3D`}
                onClick={() => {
                  onInsertSolid?.(s.type);
                  setExpandedArc('none');
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

      {/* Concentric Expanded Arc: AI SMART HUB */}
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
                data-no-drag="true"
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
                <span className="mt-0.5 text-[8px] font-semibold leading-none">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN WHITE CIRCULAR DISC (Exact Tongchuang AI Wheel look) */}
      <div
        className="relative flex h-32 w-32 cursor-move items-center justify-center rounded-full border border-slate-200/90 bg-white/95 shadow-[0_12px_36px_rgba(0,0,0,0.42)] backdrop-blur-md"
        title="Seret untuk memindahkan Roda AI"
      >
        {/* 6 Radial Tool Buttons */}
        {ringSlots.map((slot) => {
          const rad = (slot.angleDeg * Math.PI) / 180;
          const r = 44;
          const x = Math.round(Math.cos(rad) * r);
          const y = Math.round(Math.sin(rad) * r);

          return (
            <button
              key={slot.id}
              type="button"
              data-no-drag="true"
              data-testid={`wheel-slot-${slot.id}`}
              disabled={slot.disabled}
              aria-label={slot.label}
              aria-pressed={slot.active}
              title={slot.label}
              onClick={slot.onClick}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
              className={`absolute flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all active:scale-90 ${
                slot.disabled
                  ? 'cursor-not-allowed text-slate-300'
                  : slot.active
                  ? 'bg-cyan-500/15 text-cyan-700 ring-1 ring-cyan-400/60 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <span>{slot.icon}</span>
            </button>
          );
        })}

        {/* Center Glowing "AI" Hub Button */}
        <button
          type="button"
          data-no-drag="true"
          data-testid="wheel-center-ai"
          aria-expanded={expandedArc === 'ai'}
          aria-label="Buka Menu Cerdas AI"
          title="Klik untuk Aksi Cerdas AI (Shift+F10)"
          onClick={() => toggleArc('ai')}
          className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-extrabold tracking-tight transition-all active:scale-95 ${
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
