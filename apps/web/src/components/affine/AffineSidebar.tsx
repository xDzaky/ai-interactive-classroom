/**
 * AffineSidebar.tsx — Unified Sidebar for AFFiNE Workspace (V7)
 *
 * 3 clean tabs:
 * 1. Dokumen — Local-first Yjs documents CRUD
 * 2. Outline — Native BlockSuite `OutlinePanel` (auto TOC from Headings)
 * 3. Slide Frame — Native BlockSuite `FramePanel` (Edgeless Presentation Frames)
 */
import React, { useEffect, useRef, useState } from 'react';
import { FramePanel, OutlinePanel, type AffineEditorContainer } from '@blocksuite/presets';
import type { AffineDocMeta } from '@/lib/affineWorkspaceStore';

export interface AffineSidebarProps {
  open: boolean;
  docs: AffineDocMeta[];
  activeDocId: string;
  editor: AffineEditorContainer | null;
  onSelectDoc: (docId: string) => void;
  onCreateDoc: () => void;
  onDeleteDoc: (docId: string) => void;
  onClose: () => void;
}

type SidebarTab = 'docs' | 'outline' | 'frames';

export const AffineSidebar: React.FC<AffineSidebarProps> = ({
  open,
  docs,
  activeDocId,
  editor,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  onClose,
}) => {
  const [tab, setTab] = useState<SidebarTab>('docs');
  const widgetMountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = widgetMountRef.current;
    if (!container || !editor) return;
    container.innerHTML = '';

    if (tab === 'outline') {
      const outline = new OutlinePanel();
      outline.editor = editor;
      container.appendChild(outline);
    } else if (tab === 'frames') {
      if (editor.host) {
        const framePanel = new FramePanel();
        framePanel.host = editor.host;
        container.appendChild(framePanel);
      }
    }

    return () => {
      if (container) container.innerHTML = '';
    };
  }, [tab, editor, activeDocId]);

  if (!open) return null;

  return (
    <aside
      data-testid="affine-sidebar"
      className="z-20 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-800"
    >
      {/* Sidebar Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-2 py-2">
        <div className="flex items-center gap-1">
          {(
            [
              ['docs', 'Dokumen'],
              ['outline', 'Outline'],
              ['frames', 'Slide'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-testid={`affine-sidebar-tab-${id}`}
              onClick={() => setTab(id)}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                tab === id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Sembunyikan Sidebar"
          className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          ×
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'docs' ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="p-2.5 border-b border-slate-100">
            <button
              type="button"
              data-testid="affine-new-doc-btn"
              onClick={onCreateDoc}
              className="w-full rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500"
            >
              + Dokumen Baru
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {docs.map((doc) => {
              const active = doc.id === activeDocId;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-xl border px-2.5 py-2 text-xs transition ${
                    active
                      ? 'border-indigo-400 bg-indigo-50/80 text-indigo-900 font-semibold'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{doc.title}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(doc.updatedAt).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  {docs.length > 1 && (
                    <button
                      type="button"
                      title="Hapus Dokumen"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDoc(doc.id);
                      }}
                      className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          ref={widgetMountRef}
          className="aic-affine-sidebar-widget flex-1 overflow-y-auto p-2"
        />
      )}
    </aside>
  );
};
