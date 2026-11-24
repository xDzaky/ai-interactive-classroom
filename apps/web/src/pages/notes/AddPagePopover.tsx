/**
 * AddPagePopover.tsx — Freenote-Style "Tambah Halaman" Popover (V5)
 * Matches Screenshot_20261124-235056.jpg.jpeg:
 * - Current Template, Polos, Bergaris, Grid, Titik, Cornell, Isometrik, Not Balok
 * - More Template toggle, Impor PDF, Impor Gambar
 */
import React, { useState } from 'react';
import type { PaperTemplateKind } from '@ai-classroom/whiteboard-core';

export interface AddPagePopoverProps {
  currentTemplate: PaperTemplateKind;
  onAddPage: (template: PaperTemplateKind) => void;
  onImportPdf: () => void;
  onImportImage: () => void;
  onClose: () => void;
}

const TEMPLATES: Array<{ kind: PaperTemplateKind; label: string; preview: string }> = [
  { kind: 'blank', label: 'Polos', preview: 'bg-white' },
  { kind: 'ruled', label: 'Bergaris', preview: 'bg-[repeating-linear-gradient(to_bottom,#fff_0px,#fff_11px,#cbd5e1_12px)]' },
  { kind: 'grid', label: 'Grid', preview: 'bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:10px_10px]' },
  { kind: 'dot_grid', label: 'Titik', preview: 'bg-[radial-gradient(#94a3b8_1px,transparent_1px)] bg-[size:10px_10px]' },
  { kind: 'cornell', label: 'Cornell', preview: 'bg-amber-50/40' },
  { kind: 'isometric_dot', label: 'Isometrik', preview: 'bg-[radial-gradient(#64748b_1px,transparent_1px)] bg-[size:12px_10px]' },
  { kind: 'music_staff', label: 'Not Balok', preview: 'bg-[repeating-linear-gradient(to_bottom,#fff_0px,#fff_6px,#94a3b8_7px)]' },
];

export const AddPagePopover: React.FC<AddPagePopoverProps> = ({
  currentTemplate,
  onAddPage,
  onImportPdf,
  onImportImage,
  onClose,
}) => {
  const [showMore, setShowMore] = useState(false);
  const visible = showMore ? TEMPLATES : TEMPLATES.slice(0, 3);

  return (
    <div
      data-testid="add-page-popover"
      className="absolute top-14 left-4 z-40 w-72 rounded-2xl border border-slate-200 bg-white/98 p-3.5 shadow-2xl backdrop-blur-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-900">Tambah Halaman</span>
        <button type="button" onClick={onClose} className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-100">
          ×
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => {
            onAddPage(currentTemplate);
            onClose();
          }}
          className="flex flex-col items-center gap-1.5 text-center"
        >
          <div className="h-20 w-full rounded-xl border-2 border-blue-500 bg-white shadow-xs" />
          <span className="text-[10px] font-semibold text-blue-600">Template Saat Ini</span>
        </button>

        {visible.map((tpl) => (
          <button
            key={tpl.kind}
            type="button"
            onClick={() => {
              onAddPage(tpl.kind);
              onClose();
            }}
            className="flex flex-col items-center gap-1.5 text-center group"
          >
            <div className={`h-20 w-full rounded-xl border border-slate-200 group-hover:border-blue-400 transition ${tpl.preview}`} />
            <span className="text-[10px] font-medium text-slate-700">{tpl.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100"
        >
          <span>📑</span>
          <span>{showMore ? 'Ringkas Template' : 'More Template (Cornell, Isometrik, Not)'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onImportPdf();
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100"
        >
          <span>📄</span>
          <span>Impor PDF</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onImportImage();
            onClose();
          }}
          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-slate-800 hover:bg-slate-100"
        >
          <span>🖼️</span>
          <span>Gambar</span>
        </button>
      </div>
    </div>
  );
};
