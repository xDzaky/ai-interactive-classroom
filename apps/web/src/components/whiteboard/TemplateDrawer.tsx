/**
 * TemplateDrawer.tsx — Right Slide-Out Visual Card Drawer (Drag-and-Drop + 1-Click Insert)
 *
 * Non-blocking right panel so teachers can drag visual cards directly onto the WhiteboardCanvas
 * (with floating drag ghost & exact screenToWorld drop coordinates) OR click once to insert.
 */
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  VISUAL_TEMPLATES,
  type TemplateCategory,
  type VisualTemplateItem,
} from '@/lib/realWorldTemplates';
import { TemplateCardThumb } from './TemplateCardThumb';

export interface TemplateDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called on 1-click insert (centered) OR drag-and-drop at exact client coordinates */
  onInsertTemplate: (item: VisualTemplateItem, dropClientPos?: { x: number; y: number }) => void;
}

const CATEGORIES: Array<'Semua' | TemplateCategory> = [
  'Semua',
  'Benda Sehari-hari',
  'Bangun Ruang',
  'Bangun Datar',
];

export const TemplateDrawer: React.FC<TemplateDrawerProps> = ({
  open,
  onClose,
  onInsertTemplate,
}) => {
  const [tab, setTab] = useState<'Semua' | TemplateCategory>('Benda Sehari-hari');
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState<{
    item: VisualTemplateItem;
    x: number;
    y: number;
  } | null>(null);

  const dragStartRef = useRef<{
    item: VisualTemplateItem;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VISUAL_TEMPLATES.filter((item) => {
      if (tab !== 'Semua' && item.category !== tab) return false;
      if (
        q &&
        !item.label.toLowerCase().includes(q) &&
        !item.subtitle.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [tab, query]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = dragStartRef.current;
      if (!st) return;
      if (!st.active && Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 6) {
        st.active = true;
      }
      if (st.active) {
        setDragging({ item: st.item, x: e.clientX, y: e.clientY });
      }
    };

    const onUp = (e: PointerEvent) => {
      const st = dragStartRef.current;
      if (!st) return;
      dragStartRef.current = null;
      if (st.active) {
        setDragging(null);
        // Only drop if released to the left of the right-side drawer!
        const drawerLeft = window.innerWidth - 360;
        if (e.clientX < drawerLeft) {
          onInsertTemplate(st.item, { x: e.clientX, y: e.clientY });
        }
      } else {
        // Pure click -> instant 1-click insert at canvas center
        onInsertTemplate(st.item);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onInsertTemplate]);

  if (!open) return null;

  return (
    <>
      <aside
        data-testid="template-drawer"
        aria-label="Panel Template Visual"
        className="fixed right-0 top-14 bottom-0 z-40 flex w-[340px] sm:w-[370px] flex-col border-l border-slate-200 bg-white/98 shadow-2xl backdrop-blur-md select-none"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Template Visual</h2>
            <p className="text-[11px] text-slate-500">
              Klik untuk pasang instan atau tarik kartu ke papan tulis
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panel Template"
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            Tutup
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari dadu, rubik, rumah, kubus, segitiga..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto px-4 pb-2.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`template-tab-${c}`}
              onClick={() => setTab(c)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                tab === c
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Visual Card Grid */}
        <div className="grid flex-1 grid-cols-2 gap-2.5 overflow-y-auto px-4 pb-6 content-start">
          {filtered.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              data-testid={`template-card-${item.id}`}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                dragStartRef.current = {
                  item,
                  startX: e.clientX,
                  startY: e.clientY,
                  active: false,
                };
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onInsertTemplate(item);
                }
              }}
              className="group relative flex cursor-grab flex-col items-center rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 text-center transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md active:cursor-grabbing"
            >
              <span className="absolute right-2 top-2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-600">
                {item.badge}
              </span>
              <div className="my-1 transition-transform group-hover:scale-105">
                <TemplateCardThumb kind={item.thumbKind} color={item.accentColor} />
              </div>
              <div className="mt-1 text-xs font-bold text-slate-800 leading-tight">
                {item.label}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500 leading-tight">
                {item.subtitle}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Floating Drag Ghost while dragging a card onto the canvas */}
      {dragging && (
        <div
          data-testid="template-drag-ghost"
          style={{
            left: dragging.x,
            top: dragging.y,
          }}
          className="pointer-events-none fixed z-[80] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border-2 border-indigo-500 bg-white/95 px-4 py-2.5 shadow-2xl"
        >
          <TemplateCardThumb kind={dragging.item.thumbKind} color={dragging.item.accentColor} />
          <span className="mt-1 text-[11px] font-bold text-indigo-700 whitespace-nowrap">
            Lepas untuk pasang {dragging.item.label}
          </span>
        </div>
      )}
    </>
  );
};
