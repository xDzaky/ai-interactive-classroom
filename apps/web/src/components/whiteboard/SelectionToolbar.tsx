/**
 * SelectionToolbar.tsx — P11-T02 / P12-T02
 * Crisp white floating contextual toolbar anchored near selected whiteboard objects,
 * modeled on the iFLYTEK Tongchuang AI Blackboard floating pill bar with green confirm button.
 */

import React from 'react';
import type { ActionItem, ActionContext } from '@/features/whiteboard/actionRegistry';

export interface SelectionToolbarProps {
  x: number;
  y: number;
  actions: ActionItem[];
  actionContext: ActionContext;
  onOpenMoreMenu: (e: React.MouseEvent) => void;
}

export function SelectionToolbar({
  x,
  y,
  actions,
  actionContext,
  onOpenMoreMenu,
}: SelectionToolbarProps) {
  if (actionContext.selectedIds.length === 0) return null;

  // Primary fast-access actions
  const primaryActionIds = ['merge_to_2d', 'split_regions', 'ungroup_2d', 'convert_3d', 'explain_ai', 'duplicate', 'delete'];
  const quickActions = actions.filter((a) => primaryActionIds.includes(a.id));

  return (
    <div
      data-testid="selection-toolbar"
      role="toolbar"
      aria-label="Bilah Aksi Objek Terpilih"
      className="absolute z-30 flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-white/95 px-2 py-1.5 text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md animate-in fade-in zoom-in-95 select-none"
      style={{
        left: `${Math.max(16, x)}px`,
        top: `${Math.max(16, y - 56)}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {quickActions.map((action) => (
        <button
          key={action.id}
          type="button"
          data-testid={`quick-action-${action.id}`}
          onClick={() => action.run(actionContext)}
          title={`${action.label}${action.shortcut ? ` (${action.shortcut})` : ''}`}
          aria-label={action.label}
          className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-1 text-[11px] font-medium transition active:scale-95 ${
            action.id === 'delete'
              ? 'text-slate-600 hover:bg-red-50 hover:text-red-600'
              : action.id === 'merge_to_2d'
              ? 'text-emerald-700 bg-emerald-50/90 hover:bg-emerald-100'
              : action.id === 'split_regions'
              ? 'text-orange-700 bg-orange-50/90 hover:bg-orange-100'
              : action.id === 'ungroup_2d'
              ? 'text-amber-700 bg-amber-50/90 hover:bg-amber-100'
              : action.id === 'convert_3d'
              ? 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
          }`}
        >
          <span className="text-sm leading-none">{action.icon}</span>
          <span className="mt-0.5 hidden sm:inline leading-tight">{action.label.split(' ')[0]}</span>
        </button>
      ))}

      <div className="mx-0.5 h-6 w-px bg-slate-200" />

      {/* More menu trigger */}
      <button
        type="button"
        onClick={onOpenMoreMenu}
        data-testid="selection-more-btn"
        title="Pilihan Lainnya (Klik Kanan)"
        aria-label="Pilihan Lainnya"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
      >
        ⋯
      </button>

      {/* Signature Tongchuang green confirm / finish selection button */}
      <button
        type="button"
        onClick={() => actionContext.onClearSelection?.()}
        data-testid="selection-confirm-btn"
        title="Selesai (Esc)"
        aria-label="Selesai"
        className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-sm shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-95"
      >
        ✓
      </button>
    </div>
  );
}
