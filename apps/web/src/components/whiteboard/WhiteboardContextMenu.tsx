/**
 * WhiteboardContextMenu.tsx — P11-T02 / P12-T02
 * Accessible right-click and long-press contextual menu for whiteboard items.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ActionItem, ActionContext } from '@/features/whiteboard/actionRegistry';

export interface WhiteboardContextMenuProps {
  x: number;
  y: number;
  actions: ActionItem[];
  actionContext: ActionContext;
  onClose: () => void;
  onSelectColor?: (color: string) => void;
}

const COLOR_PALETTE = [
  { label: 'Hitam', value: '#111827' },
  { label: 'Merah', value: '#ef4444' },
  { label: 'Biru', value: '#3b82f6' },
  { label: 'Hijau', value: '#10b981' },
  { label: 'Kuning', value: '#f59e0b' },
  { label: 'Ungu', value: '#8b5cf6' },
];

export function WhiteboardContextMenu({
  x,
  y,
  actions,
  actionContext,
  onClose,
  onSelectColor,
}: WhiteboardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Position clamping so menu doesn't overflow viewport
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 12;
    let posX = x;
    let posY = y;

    if (posX + rect.width > window.innerWidth - padding) {
      posX = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    if (posY + rect.height > window.innerHeight - padding) {
      posY = Math.max(padding, window.innerHeight - rect.height - padding);
    }

    setPosition({ x: posX, y: posY });
  }, [x, y]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener('mousedown', handleClickOutside, { capture: true });
    return () => window.removeEventListener('mousedown', handleClickOutside, { capture: true });
  }, [onClose]);

  // Keyboard navigation (Esc, Arrow keys, Enter)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % actions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + actions.length) % actions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (actions[activeIndex]) {
          actions[activeIndex].run(actionContext);
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, actionContext, activeIndex, onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Menu Konteks Objek"
      data-testid="whiteboard-context-menu"
      className="fixed z-50 flex min-w-[200px] flex-col rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 text-xs text-white shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 select-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
        Pilihan Objek ({actionContext.selectedIds.length})
      </div>

      <div className="flex flex-col gap-0.5">
        {actions.map((action, idx) => (
          <button
            key={action.id}
            role="menuitem"
            data-testid={`context-action-${action.id}`}
            onClick={() => {
              action.run(actionContext);
              onClose();
            }}
            onMouseEnter={() => setActiveIndex(idx)}
            className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-left font-medium transition-colors ${
              idx === activeIndex
                ? 'bg-indigo-600 text-white'
                : 'text-slate-200 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">{action.icon}</span>
              <span>{action.label}</span>
            </span>
            {action.shortcut && (
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-700">
                {action.shortcut}
              </kbd>
            )}
          </button>
        ))}
      </div>

      {/* Color quick palette */}
      {onSelectColor && actionContext.selectedIds.length > 0 && (
        <div className="mt-1.5 border-t border-slate-800/80 pt-1.5">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400">
            Warna Garis / Objek
          </div>
          <div className="flex items-center gap-1.5 px-2 pb-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  onSelectColor(c.value);
                  onClose();
                }}
                title={c.label}
                aria-label={c.label}
                data-testid={`color-chip-${c.value}`}
                className="h-5 w-5 rounded-full border border-white/20 transition-transform hover:scale-115 active:scale-95"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
