/**
 * AffineWorkspaceShell.tsx — Complete AFFiNE Page ↔ Edgeless Workspace Shell (V7)
 *
 * Features:
 * - Dual-View Page Mode (Doc) ↔ Edgeless Mode (Infinite Canvas, Mindmap, Frames) on 1 Yjs Tree (Alt+S)
 * - Local-First Yjs + IndexedDB persistence
 * - Native BlockSuite Sidebar (Docs, Outline TOC, Presentation Frames)
 * - 1-click Presentasi Mode & Markdown Import/Export
 * - Full AI Classroom Bridge: /3d (TongchuangSolidWidget), /manimgx (ManimGxWidget),
 *   /lab (12 Virtual Labs), /grafik (GraphViewer), plus Selection-to-3D & Selection-to-ManimGX!
 */
import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AffineEditorContainer } from '@blocksuite/presets';
import type { Doc } from '@blocksuite/store';
import type { SolidParams, SolidType } from '@ai-classroom/geometry-core';
import { analyzeForManimGX, type ManimGxAnalysis } from '@ai-classroom/math-core';
import {
  createAffineDocMeta,
  deleteAffineDocMeta,
  exportAffineDocToMarkdown,
  importMarkdownIntoAffineDoc,
  listAffineDocs,
  renameAffineDocMeta,
  type AffineDocMeta,
} from '@/lib/affineWorkspaceStore';
import {
  analyzeSelectedTextForClassroom,
  consumeWhiteboardToAffineTransfer,
  insertClassroomBlockIntoDoc,
  type ClassroomEmbedKind,
} from '@/lib/classroomBlockBridge';
import { ManimGxWidget } from '@/components/math/ManimGxWidget';
import { PhETSimulationModal } from '@/components/whiteboard/PhETSimulationWidget';
import { AffineEditorHost } from './AffineEditorHost';
import { AffineSidebar } from './AffineSidebar';
import { CLASSROOM_SLASH_ITEMS } from './customSlashItems';

const TongchuangSolidWidget = lazy(() =>
  import('@/components/math/TongchuangSolidWidget').then((m) => ({
    default: m.TongchuangSolidWidget,
  })),
);
const GraphViewer = lazy(() =>
  import('@/components/math/GraphViewer').then((m) => ({
    default: m.GraphViewer,
  })),
);

const DEFAULT_SOLID_PARAMS: Record<SolidType, SolidParams> = {
  cube: { type: 'cube', s: 4 },
  cuboid: { type: 'cuboid', l: 5, w: 3, h: 3 },
  sphere: { type: 'sphere', r: 3 },
  cylinder: { type: 'cylinder', r: 2, h: 5 },
  cone: { type: 'cone', r: 2.5, h: 5 },
  pyramid: { type: 'pyramid', b: 4, h: 5 },
  prism: { type: 'prism', a: 4, b: 4, c: 4, h: 5 },
  torus: { type: 'torus', R: 3, r: 1 },
};

export interface AffineWorkspaceShellProps {
  initialDocId?: string;
  /** Optional mode switcher slot (used when embedded inside /notes alongside Freenote Ink) */
  headerLeftSlot?: React.ReactNode;
}

export const AffineWorkspaceShell: React.FC<AffineWorkspaceShellProps> = ({
  initialDocId,
  headerLeftSlot,
}) => {
  const [docs, setDocs] = useState<AffineDocMeta[]>(() => listAffineDocs());
  const [activeDocId, setActiveDocId] = useState<string>(() => {
    const all = listAffineDocs();
    if (initialDocId && all.some((d) => d.id === initialDocId)) return initialDocId;
    return all[0].id;
  });
  const [mode, setMode] = useState<'page' | 'edgeless'>('page');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [editorInstance, setEditorInstance] = useState<AffineEditorContainer | null>(null);
  const activeDocRef = useRef<Doc | null>(null);
  const mdInputRef = useRef<HTMLInputElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Interactive AI Classroom Bridge Modals/Panels
  const [activeSolid, setActiveSolid] = useState<{ type: SolidType; title: string } | null>(null);
  const [activeManim, setActiveManim] = useState<{ analysis: ManimGxAnalysis; formula: string } | null>(null);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);

  const activeDocMeta = docs.find((d) => d.id === activeDocId) ?? docs[0];

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  }, []);

  // Alt+S shortcut to toggle Page <-> Edgeless
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setMode((m) => (m === 'page' ? 'edgeless' : 'page'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleTriggerClassroomEmbed = useCallback(
    (kind: ClassroomEmbedKind, formula?: string, solidType?: SolidType, title?: string) => {
      setShowInsertMenu(false);
      const doc = activeDocRef.current;

      if (kind === 'solid3d') {
        const st = solidType ?? 'cube';
        const lbl = title ?? `Bangun Ruang 3D (${st})`;
        if (doc) insertClassroomBlockIntoDoc(doc, { kind, title: lbl, solidType: st });
        setActiveSolid({ type: st, title: lbl });
      } else if (kind === 'manimgx') {
        const expr = formula || '(x - 2)^2 + (y - 1)^2 = 9';
        const analysis = analyzeForManimGX({ latex: expr });
        if (doc) insertClassroomBlockIntoDoc(doc, { kind, title: analysis.scene.title, formula: expr });
        setActiveManim({ analysis, formula: expr });
      } else if (kind === 'virtual_lab') {
        if (doc) insertClassroomBlockIntoDoc(doc, { kind, title: 'Laboratorium Virtual POE' });
        setShowLabModal(true);
      } else if (kind === 'math_graph') {
        const expr = formula || 'y = sin(x)';
        if (doc) insertClassroomBlockIntoDoc(doc, { kind, title: 'Grafik Fungsi 2D', formula: expr });
        setShowGraphModal(true);
      }
    },
    [],
  );

  const handleEditorReady = useCallback(
    (editor: AffineEditorContainer, doc: Doc) => {
      setEditorInstance(editor);
      activeDocRef.current = doc;

      // Consume any pending transfer sent from /whiteboard ("Kirim ke AFFiNE")
      const transfer = consumeWhiteboardToAffineTransfer();
      if (transfer) {
        insertClassroomBlockIntoDoc(doc, transfer);
        showToast(`Objek "${transfer.title}" dari Whiteboard disisipkan ke AFFiNE`);
        if (transfer.kind === 'manimgx' && transfer.formula) {
          setActiveManim({
            analysis: analyzeForManimGX({ latex: transfer.formula }),
            formula: transfer.formula,
          });
        } else if (transfer.kind === 'solid3d' && transfer.solidType) {
          setActiveSolid({ type: transfer.solidType, title: transfer.title });
        }
      }
    },
    [showToast],
  );

  const handleStartPresentation = () => {
    setMode('edgeless');
    setSidebarOpen(true);
    showToast('Mode Kanvas Edgeless aktif — buka tab Slide untuk presentasi antar-Frame');
  };

  const handleExportMd = () => {
    const doc = activeDocRef.current;
    if (!doc) return;
    const md = exportAffineDocToMarkdown(doc, activeDocMeta?.title);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeDocMeta?.title ?? 'catatan').replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Dokumen diekspor ke Markdown (.md)');
  };

  const handleImportMdFile = async (file: File) => {
    const doc = activeDocRef.current;
    if (!doc) return;
    const text = await file.text();
    const count = importMarkdownIntoAffineDoc(doc, text);
    showToast(`${count} blok Markdown diimpor ke dokumen`);
  };

  return (
    <div
      data-testid="affine-workspace-shell"
      className="relative flex h-screen w-screen flex-col overflow-hidden bg-white text-slate-900"
    >
      {/* Top Workspace Header */}
      <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-3 shadow-2xs backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            data-testid="affine-toggle-sidebar-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
            title="Toggle Sidebar Dokumen / Outline / Slide"
          >
            ☰
          </button>
          <Link
            to="/whiteboard"
            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 whitespace-nowrap"
          >
            ← Whiteboard
          </Link>
          {headerLeftSlot}
          <input
            type="text"
            value={activeDocMeta?.title ?? ''}
            onChange={(e) => setDocs(renameAffineDocMeta(activeDocId, e.target.value))}
            aria-label="Judul Dokumen AFFiNE"
            className="hidden md:block w-48 truncate rounded-lg bg-transparent px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:bg-slate-100"
          />
        </div>

        {/* Center Page ↔ Edgeless Mode Switcher (Alt+S) */}
        <div
          data-testid="affine-mode-switcher"
          className="flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-0.5 text-[11px] font-bold"
        >
          <button
            type="button"
            data-testid="affine-mode-page-btn"
            onClick={() => setMode('page')}
            className={`rounded-lg px-3 py-1 transition ${
              mode === 'page'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dokumen (Page)
          </button>
          <button
            type="button"
            data-testid="affine-mode-edgeless-btn"
            onClick={() => setMode('edgeless')}
            className={`rounded-lg px-3 py-1 transition ${
              mode === 'edgeless'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kanvas (Edgeless)
          </button>
        </div>

        {/* Right Actions: AI Classroom Bridge, Presentasi, Import/Export MD */}
        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            data-testid="affine-classroom-insert-btn"
            onClick={() => setShowInsertMenu((v) => !v)}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-500 whitespace-nowrap"
          >
            + AI Classroom
          </button>
          <button
            type="button"
            data-testid="affine-present-btn"
            onClick={handleStartPresentation}
            className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            ▶ Presentasi
          </button>
          <button
            type="button"
            onClick={() => mdInputRef.current?.click()}
            className="hidden lg:inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            title="Impor file Markdown (.md)"
          >
            Impor MD
          </button>
          <button
            type="button"
            data-testid="affine-export-md-btn"
            onClick={handleExportMd}
            className="hidden lg:inline-flex rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
            title="Ekspor Dokumen ke Markdown (.md)"
          >
            Ekspor MD
          </button>

          {/* + AI Classroom Slash Popover */}
          {showInsertMenu && (
            <div
              data-testid="affine-classroom-menu"
              className="absolute right-0 top-10 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
            >
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Sisipkan Modul AI Classroom
              </div>
              {CLASSROOM_SLASH_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={item.id}
                  onClick={() =>
                    handleTriggerClassroomEmbed(item.kind, item.defaultFormula, 'cube', item.title)
                  }
                  className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-indigo-50"
                >
                  <span className="text-base leading-none pt-0.5">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-800">{item.title}</span>
                      <code className="rounded bg-slate-100 px-1 py-0.5 text-[9px] text-indigo-600">
                        {item.command}
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-500">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <input
        ref={mdInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportMdFile(f);
          e.target.value = '';
        }}
      />

      {/* Main Workspace Body: Sidebar + BlockSuite AffineEditorContainer */}
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <AffineSidebar
          open={sidebarOpen}
          docs={docs}
          activeDocId={activeDocId}
          editor={editorInstance}
          onSelectDoc={setActiveDocId}
          onCreateDoc={() => {
            const meta = createAffineDocMeta(`Catatan Kelas ${docs.length + 1}`, mode);
            setDocs(listAffineDocs());
            setActiveDocId(meta.id);
          }}
          onDeleteDoc={(id) => {
            const next = deleteAffineDocMeta(id);
            setDocs(next);
            if (activeDocId === id) setActiveDocId(next[0].id);
          }}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="relative flex-1 min-w-0 min-h-0 overflow-hidden bg-white">
          <AffineEditorHost
            docId={activeDocId}
            docTitle={activeDocMeta?.title ?? 'Catatan Kelas'}
            mode={mode}
            onModeChange={setMode}
            onEditorReady={handleEditorReady}
            onTriggerSelection3D={(txt) => {
              const res = analyzeSelectedTextForClassroom(txt);
              handleTriggerClassroomEmbed('solid3d', res.cleaned, res.solidType, `Model 3D: ${res.cleaned.slice(0, 28)}`);
            }}
            onTriggerSelectionManimGx={(txt) => {
              const res = analyzeSelectedTextForClassroom(txt);
              handleTriggerClassroomEmbed('manimgx', res.cleaned);
            }}
          />
        </main>
      </div>

      {/* Floating ManimGX White Card Overlay */}
      {activeManim && (
        <div
          data-testid="affine-manimgx-overlay"
          className="fixed bottom-4 right-4 z-50 h-[360px] w-[500px] max-w-[94vw]"
        >
          <ManimGxWidget
            id="affine-manimgx"
            title={activeManim.analysis.scene.title}
            formulaLatex={activeManim.formula}
            templateId={activeManim.analysis.templateKind}
            sceneCode={activeManim.analysis.scene.pythonCode}
            selected={true}
            onUpdateSceneCode={(next) =>
              setActiveManim((prev) =>
                prev
                  ? { ...prev, analysis: { ...prev.analysis, scene: { ...prev.analysis.scene, pythonCode: next } } }
                  : null,
              )
            }
            onConvertToInteractive3D={() => {
              setActiveManim(null);
              setActiveSolid({ type: 'cube', title: 'Model 3D Interaktif' });
            }}
            onDelete={() => setActiveManim(null)}
          />
        </div>
      )}

      {/* Interactive 3D Studio Modal (TongchuangSolidWidget) */}
      {activeSolid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
          <div className="relative flex h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <span>🧊</span>
                <h3 className="text-sm font-bold text-slate-900">{activeSolid.title}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {(['cube', 'cuboid', 'pyramid', 'prism', 'cylinder', 'cone', 'sphere'] as SolidType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setActiveSolid({ type: st, title: `Bangun Ruang 3D (${st})` })}
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold capitalize ${
                      activeSolid.type === st
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveSolid(null)}
                  className="ml-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Tutup ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Memuat Studio 3D...
                  </div>
                }
              >
                <TongchuangSolidWidget
                  id="affine-studio-3d"
                  params={DEFAULT_SOLID_PARAMS[activeSolid.type]}
                  label={activeSolid.title}
                  selected={true}
                  onCloseToolbar={() => setActiveSolid(null)}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* 12 Native Virtual Labs Modal */}
      <PhETSimulationModal open={showLabModal} onClose={() => setShowLabModal(false)} />

      {/* 2D Graph Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
          <div className="relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h3 className="text-sm font-bold text-slate-900">📈 Grafik Fungsi 2D Interaktif</h3>
              <button
                type="button"
                onClick={() => setShowGraphModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Tutup ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <Suspense fallback={<div className="p-6 text-xs text-slate-500">Memuat Grafik...</div>}>
                <GraphViewer />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900/95 px-4 py-1.5 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};
