import React, { useState, useMemo } from 'react';
import type { LessonTemplate, KurikulumMerdekaElement } from '@ai-classroom/curriculum-schema';
import { STARTER_LESSON_TEMPLATES } from './lessonTemplates';

export interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: LessonTemplate) => void;
  templates?: LessonTemplate[];
}

const ELEMENT_LABELS: Record<KurikulumMerdekaElement | 'all', string> = {
  all: 'Semua Elemen',
  geometri: 'Geometri',
  aljabar: 'Aljabar',
  pengukuran: 'Pengukuran',
  bilangan: 'Bilangan',
  analisis_data_peluang: 'Data & Peluang',
};

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  templates = STARTER_LESSON_TEMPLATES,
}) => {
  const [selectedElement, setSelectedElement] = useState<KurikulumMerdekaElement | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchElem = selectedElement === 'all' || t.elementCode === selectedElement;
      const matchSearch =
        !search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.grade.toLowerCase().includes(search.toLowerCase());
      return matchElem && matchSearch;
    });
  }, [templates, selectedElement, search]);

  const previewTemplate = useMemo(() => {
    if (selectedPreviewId) {
      const found = filteredTemplates.find((t) => t.id === selectedPreviewId);
      if (found) return found;
    }
    return filteredTemplates[0] || null;
  }, [filteredTemplates, selectedPreviewId]);


  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pustaka Template Pembelajaran Matematika"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800 dark:text-slate-100"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[36rem] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              Pustaka Template Pembelajaran (Kurikulum Merdeka)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih template papan interaktif untuk langsung memulai sesi kelas
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup Pustaka Template"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Element Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {(Object.keys(ELEMENT_LABELS) as Array<KurikulumMerdekaElement | 'all'>).map((elem) => (
              <button
                key={elem}
                onClick={() => setSelectedElement(elem)}
                aria-pressed={selectedElement === elem}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  selectedElement === elem
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {ELEMENT_LABELS[elem]}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Cari topik atau materi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari template pembelajaran"
            className="text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 w-52"
          />
        </div>

        {/* Content: List + Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Template list */}
          <div className="w-1/2 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                Tidak ada template yang cocok dengan pencarian.
              </div>
            ) : (
              filteredTemplates.map((t) => {
                const isSelected = previewTemplate?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedPreviewId(t.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                        {t.phase} • {t.grade}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {ELEMENT_LABELS[t.elementCode]}
                      </span>
                    </div>
                    <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-1">
                      {t.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {t.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Template detail preview */}
          <div className="w-1/2 p-6 flex flex-col justify-between overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30">
            {previewTemplate ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">
                    <span>{previewTemplate.phase}</span>
                    <span>•</span>
                    <span>{previewTemplate.grade}</span>
                    <span>•</span>
                    <span className="capitalize">{ELEMENT_LABELS[previewTemplate.elementCode]}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {previewTemplate.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {previewTemplate.description}
                  </p>
                </div>

                {previewTemplate.teacherNotes && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <span className="font-semibold flex items-center gap-1">
                      💡 Catatan Guru:
                    </span>
                    <p className="text-[11px] leading-relaxed">
                      {previewTemplate.teacherNotes}
                    </p>
                  </div>
                )}

                {previewTemplate.studentQuestions.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pertanyaan Pemantik Siswa:
                    </h4>
                    <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      {previewTemplate.studentQuestions.map((q: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">
                          {q}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-slate-400">
                Pilih salah satu template di samping untuk melihat pratinjau.
              </div>
            )}

            {previewTemplate && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    onSelectTemplate(previewTemplate);
                    onClose();
                  }}
                  aria-label={`Gunakan Template ${previewTemplate.title}`}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-sm transition active:scale-95"
                >
                  Gunakan Template 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
