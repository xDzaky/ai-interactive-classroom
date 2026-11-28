/**
 * NotesPage.tsx — Dedicated Freenote-Style /notes Workspace (V5)
 *
 * Cross-device study notes & infinite board:
 * - Library Home (Pusat Alat Tulis, Belum Difile, Dibuang, Folder) matching Screenshots 234924/234937
 * - Multi-page Thumbnail Sidebar (reorder, bookmark, duplicate, delete) matching Screenshot 235043
 * - Dual Floating Pills + Pen Rack + Laser Pointer + Virtual Ruler + Layers + Study Timer + Audio Recorder + Feynman AI
 */
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type {
  NotebookDocument,
  NotebookFolder,
  NotePage,
  PaperTemplateKind,
  SmartTableProps,
  SubjectHelperKind,
  SubjectHelperProps,
  TablePresetMode,
} from '@ai-classroom/whiteboard-core';
import {
  createDefaultSmartTableProps,
  createDefaultSubjectHelperProps,
  createDefaultIntegerOpsProps,
  createDefaultInequalityGraphProps,
  applyStyleToSmartTableCells,
  type TableCell,
  type TableCellRange,
  type IntegerOpsMode,
  type IntegerOpsWidgetProps,
  type InequalityGraphProps,
} from '@ai-classroom/whiteboard-core';
import { getCachedPlanarRegions } from '@/lib/regionPartition';
import { TableGridPicker } from '@/components/tables/TableGridPicker';
const SmartTableWidget = lazy(() =>
  import('@/components/tables/SmartTableWidget').then((m) => ({ default: m.SmartTableWidget })),
);
const SubjectHelperWidget = lazy(() =>
  import('@/components/helpers/SubjectHelperWidget').then((m) => ({ default: m.SubjectHelperWidget })),
);
const IntegerOpsWidget = lazy(() =>
  import('@/components/helpers/IntegerOpsWidget').then((m) => ({ default: m.IntegerOpsWidget })),
);
const LinearInequalityGraphWidget = lazy(() =>
  import('@/components/math/LinearInequalityGraphWidget').then((m) => ({
    default: m.LinearInequalityGraphWidget,
  })),
);
import {
  createDefaultNotebook,
  createNotePage,
  deleteNotebookPermanently,
  listFolders,
  listNotebooks,
  saveFolder,
  saveNotebook,
} from '@/lib/notesStore';
import { putMediaAsset } from '@/lib/mediaStore';
import type { LaserConfig } from '@/lib/laserPointerEngine';
import {
  ExcalidrawPropertiesPanel,
  getCapabilitiesForSelection,
} from '@/components/whiteboard/ExcalidrawPropertiesPanel';
import {
  ExcalidrawCommandPalette,
  MermaidToDiagramModal,
  type CommandPaletteAction,
} from '@/components/whiteboard/ExcalidrawCommandPalette';
import { useHandwritingToLatex } from '@/hooks/useHandwritingToLatex';
import {
  analyzeForManimGX,
  analyzeSelectionContent,
  type ManimGxAnalysis,
  type SelectionContentItem,
} from '@ai-classroom/math-core';
import {
  DEFAULT_EXCALIDRAW_STYLE,
  exportBasicSceneToSvg,
  type ExcalidrawStyleState,
  type MermaidDiagramResult,
} from '@/lib/excalidrawEngine';
import {
  NotesToolbarPills,
  type EraserSettings,
  type LassoSettings,
  type NotesToolId,
  type PenSettings,
} from './NotesToolbarPills';
import { NotesCanvas } from './NotesCanvas';

const AffineWorkspaceShell = lazy(() =>
  import('@/components/affine/AffineWorkspaceShell').then((m) => ({
    default: m.AffineWorkspaceShell,
  })),
);

export default function NotesPage() {
  const { notebookId } = useParams<{ notebookId?: string }>();
  const navigate = useNavigate();

  const [notebooks, setNotebooks] = useState<NotebookDocument[]>([]);
  const [folders, setFolders] = useState<NotebookFolder[]>([]);
  const [activeNbId, setActiveNbId] = useState<string | null>(notebookId ?? null);
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'editor' | 'library'>('editor');
  const [notesEngine, setNotesEngine] = useState<'freenote' | 'affine'>('freenote');
  const [libraryFilter, setLibraryFilter] = useState<'unfiled' | 'trash' | string>('unfiled');

  // Tool states
  const [activeTool, setActiveTool] = useState<NotesToolId>('fountain');
  const [penSettings, setPenSettings] = useState<PenSettings>({
    color: '#0f172a',
    width: 3.5,
    opacity: 1,
    stability: 3,
    tipTaper: 60,
    sensitivity: 60,
    realtimeBeautify: false,
    strokePrediction: true,
    straightLine: false,
    lineStyle: 'solid',
  });
  const [eraserSettings, setEraserSettings] = useState<EraserSettings>({
    mode: 'stroke',
    size: 18,
    onlyHighlighter: false,
  });
  const [lassoSettings, setLassoSettings] = useState<LassoSettings>({
    mode: 'freehand',
    includeHandwriting: true,
    includeHighlighter: true,
    includeText: true,
    includeImage: true,
    includeTape: true,
  });
  const [laserConfig, setLaserConfig] = useState<LaserConfig>({
    mode: 'trail',
    thickness: 1.0,
    durationSec: 1.2,
    color: '#ef4444',
  });

  // Panels & utilities
  const [excalidrawStyle, setExcalidrawStyle] = useState<ExcalidrawStyleState>(DEFAULT_EXCALIDRAW_STYLE);
  const [toolLocked, setToolLocked] = useState(false);
  const [showExProps, setShowExProps] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState('layer-1');
  const [showTimer, setShowTimer] = useState(false);
  const [timerSec, setTimerSec] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFeynman, setShowFeynman] = useState(false);
  const [feynmanPrompt, setFeynmanPrompt] = useState('');
  const [feynmanAnswer, setFeynmanAnswer] = useState('');
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const handwriting = useHandwritingToLatex({ enabled: true });

  // Undo/Redo stacks per active page
  const [undoStack, setUndoStack] = useState<NotePage[]>([]);
  const [redoStack, setRedoStack] = useState<NotePage[]>([]);

  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const canvasExportRef = useRef<HTMLCanvasElement | null>(null);

  // Load notebooks & folders from Dexie
  useEffect(() => {
    Promise.all([listNotebooks(), listFolders()]).then(([nbs, flds]) => {
      setNotebooks(nbs);
      setFolders(flds);
      if (notebookId && nbs.some((n) => n.id === notebookId)) {
        setActiveNbId(notebookId);
      } else if (nbs.length > 0) {
        setActiveNbId(nbs[0].id);
      }
    });
  }, [notebookId]);

  // Study Timer tick
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2600);
  };

  const activeNotebook = notebooks.find((n) => n.id === activeNbId) ?? notebooks[0] ?? null;
  const activePage = activeNotebook?.pages[activePageIdx] ?? activeNotebook?.pages[0] ?? null;

  const commitNotebook = useCallback((nextNb: NotebookDocument) => {
    setNotebooks((prev) => prev.map((n) => (n.id === nextNb.id ? nextNb : n)));
    void saveNotebook(nextNb);
  }, []);

  const handleUpdatePage = useCallback(
    (updater: (prev: NotePage) => NotePage, pushUndo = true) => {
      if (!activeNotebook || !activePage) return;
      if (pushUndo) {
        setUndoStack((prev) => [...prev.slice(-40), activePage]);
        setRedoStack([]);
      }
      const nextPage = updater(activePage);
      const nextNb: NotebookDocument = {
        ...activeNotebook,
        updatedAt: Date.now(),
        pages: activeNotebook.pages.map((p, idx) => (idx === activePageIdx ? nextPage : p)),
      };
      commitNotebook(nextNb);
    },
    [activeNotebook, activePage, activePageIdx, commitNotebook],
  );

  const handleUndo = () => {
    if (!activeNotebook || !activePage || undoStack.length === 0) return;
    const prevPage = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((r) => [...r, activePage]);
    commitNotebook({
      ...activeNotebook,
      pages: activeNotebook.pages.map((p, i) => (i === activePageIdx ? prevPage : p)),
    });
  };

  const handleRedo = () => {
    if (!activeNotebook || !activePage || redoStack.length === 0) return;
    const nextPage = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((s) => [...s, activePage]);
    commitNotebook({
      ...activeNotebook,
      pages: activeNotebook.pages.map((p, i) => (i === activePageIdx ? nextPage : p)),
    });
  };

  const handleInsertImageBlob = useCallback(
    async (blob: Blob, pos?: { x: number; y: number }, name?: string) => {
      const asset = await putMediaAsset(blob);
      const maxW = Math.min(asset.naturalWidth, 420);
      const scale = maxW / Math.max(1, asset.naturalWidth);
      const w = Math.round(asset.naturalWidth * scale);
      const h = Math.round(asset.naturalHeight * scale);
      handleUpdatePage((prev) => ({
        ...prev,
        objects: [
          ...prev.objects,
          {
            id: `nimg-${Date.now()}`,
            object_type: 'image',
            props: {
              assetId: asset.assetId,
              x: pos ? pos.x - w / 2 : 120,
              y: pos ? pos.y - h / 2 : 120,
              width: w,
              height: h,
              opacity: 1,
              locked: false,
              label: name || 'Gambar Catatan',
            },
            created_at: Date.now(),
            updated_at: Date.now(),
          },
        ],
      }));
      showToast('Gambar ditambahkan ke halaman catatan');
    },
    [handleUpdatePage],
  );

  // Global Ctrl+V image paste in /notes
  useEffect(() => {
    if (viewMode !== 'editor') return;
    const onPaste = (e: ClipboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of Array.from(items)) {
        if (it.kind === 'file' && it.type.startsWith('image/')) {
          const f = it.getAsFile();
          if (f) {
            e.preventDefault();
            void handleInsertImageBlob(f, undefined, f.name);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [viewMode, handleInsertImageBlob]);

  const handleExportPng = () => {
    const c = canvasExportRef.current;
    if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${activeNotebook?.title ?? 'catatan'}-hal-${activePageIdx + 1}.png`;
    a.click();
    showToast('Halaman diekspor ke PNG');
  };

  const handleExportSvg = () => {
    if (!activePage) return;
    const items = [
      ...activePage.objects.map((o) => {
        const p = o.props as Record<string, unknown>;
        return {
          type: o.object_type,
          x: Number(p.x ?? 0), y: Number(p.y ?? 0), w: Number(p.w ?? 100), h: Number(p.h ?? 60),
          x1: Number(p.x1 ?? 0), y1: Number(p.y1 ?? 0), x2: Number(p.x2 ?? 100), y2: Number(p.y2 ?? 100),
          cx: Number(p.cx ?? 0), cy: Number(p.cy ?? 0), rx: Number(p.rx ?? 50), ry: Number(p.ry ?? 35),
          stroke: String(p.stroke ?? '#1e1e1e'), fill: String(p.fill ?? 'none'),
          strokeWidth: Number(p.strokeWidth ?? 2), text: String(p.label ?? ''),
        };
      }),
      ...activePage.strokes.map((s) => ({
        type: 'stroke', points: s.points, stroke: s.color, strokeWidth: s.width,
      })),
    ];
    const svg = exportBasicSceneToSvg(items, activePage.pageSize?.widthPx ?? 820, activePage.pageSize?.heightPx ?? 1120);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeNotebook?.title ?? 'catatan'}-hal-${activePageIdx + 1}.svg`;
    a.click();
    showToast('Halaman diekspor ke SVG vektor');
  };

  const handleInsertMermaidInNotes = (diagram: MermaidDiagramResult) => {
    const now = Date.now();
    const newObjs = [
      ...diagram.nodes.map((n) => ({
        id: `nmm-${now}-${n.id}`,
        object_type: n.shape as 'rect' | 'rhombus' | 'ellipse',
        props:
          n.shape === 'rect'
            ? { x: n.x, y: n.y, w: n.w, h: n.h, stroke: '#1e1e1e', fill: n.bgColor, fillStyle: 'hachure', roughness: 1, strokeWidth: 2, label: n.label }
            : { cx: n.x + n.w / 2, cy: n.y + n.h / 2, rx: n.w / 2, ry: n.h / 2, stroke: '#1e1e1e', fill: n.bgColor, roughness: 1, strokeWidth: 2, label: n.label },
        created_at: now,
        updated_at: now,
      })),
      ...diagram.edges.map((e, i) => ({
        id: `nmme-${now}-${i}`,
        object_type: 'arrow' as const,
        props: { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, stroke: '#1e1e1e', strokeWidth: 2, label: e.label },
        created_at: now,
        updated_at: now,
      })),
    ];
    handleUpdatePage((p) => ({ ...p, objects: [...p.objects, ...newObjs] }));
    showToast(`Diagram Mermaid (${diagram.nodes.length} node) ditambahkan`);
  };

  // Excalidraw keyboard shortcuts in /notes (1-9, Q, F, K, Ctrl+K)
  useEffect(() => {
    if (viewMode !== 'editor') return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
        return;
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'q') setToolLocked((v) => !v);
      else if (k === 'h') setActiveTool('hand');
      else if (k === '1' || k === 'v') setActiveTool('select');
      else if (k === '2' || k === 'r') setActiveTool('rect');
      else if (k === '3' || k === 'd') setActiveTool('rhombus');
      else if (k === '4' || k === 'o') setActiveTool('ellipse');
      else if (k === '5' || k === 'a') setActiveTool('arrow');
      else if (k === '6' || k === 'l') setActiveTool('line');
      else if (k === '7' || k === 'p') setActiveTool('fountain');
      else if (k === '8' || k === 't') setActiveTool('text');
      else if (k === '0' || k === 'e') setActiveTool('eraser');
      else if (k === 'f') setActiveTool('frame');
      else if (k === 'k') setActiveTool('laser');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewMode]);

  const handleConvertPageHandwritingToLatex = useCallback(() => {
    if (!activePage || activePage.strokes.length === 0) {
      showToast('Tulis rumus dengan pena terlebih dahulu di halaman catatan');
      return;
    }
    const recent = activePage.strokes.slice(-8).map((s) => ({
      id: s.id,
      points: s.points,
      color: s.color,
      width: s.width,
    }));
    handwriting.convertStrokesToLatex(recent);
  }, [activePage, handwriting]);

  const handleInsertManimGxInNotes = useCallback(
    (analysis: ManimGxAnalysis, pos?: { x: number; y: number }) => {
      const now = Date.now();
      const existingCount = (activePage?.objects ?? []).filter((o) => o.object_type === 'viz_manimgx').length;
      const x = pos ? Math.max(24, Math.round(pos.x)) : 80 + (existingCount % 4) * 32;
      const y = pos ? Math.max(24, Math.round(pos.y)) : 120 + (existingCount % 4) * 32;
      handleUpdatePage((p) => ({
        ...p,
        objects: [
          ...p.objects,
          {
            id: `nmanim-${now}`,
            object_type: 'viz_manimgx',
            props: {
              x,
              y,
              w: 460,
              h: analysis.templateKind === 'surface_3d' || analysis.templateKind === 'solid_3d' ? 350 : 320,
              title: analysis.scene.title,
              formulaLatex: String(analysis.scene.params.latex ?? '(x - 2)^2 + (y - 1)^2 = 9'),
              templateId: analysis.templateKind,
              sceneCode: analysis.scene.pythonCode,
            },
            created_at: now,
            updated_at: now,
          },
        ],
      }));
      showToast(`ManimGX "${analysis.scene.title}" diletakkan di catatan`);
    },
    [activePage, handleUpdatePage],
  );

  const handleAcceptHandwritingLatex = useCallback(() => {
    const accepted = handwriting.acceptCandidate();
    if (!accepted || !activePage) return;
    handleUpdatePage((p) => ({
      ...p,
      texts: [
        ...(p.texts ?? []),
        {
          id: `nlatex-${Date.now()}`,
          x: Math.max(24, Math.round(accepted.bbox.x)),
          y: Math.max(24, Math.round(accepted.bbox.y)),
          text: accepted.latex,
          fontSize: 18,
          color: '#312e81',
          layerId: activeLayerId,
        },
      ],
    }));
    const analysis = analyzeForManimGX({ latex: accepted.latex });
    if (analysis.eligible) {
      handleInsertManimGxInNotes(analysis, {
        x: accepted.bbox.x,
        y: accepted.bbox.y + 48,
      });
    }
    showToast(`Tulisan diubah ke LaTeX: ${accepted.latex}`);
  }, [handwriting, activePage, handleUpdatePage, activeLayerId, handleInsertManimGxInNotes]);

  const [showTablePicker, setShowTablePicker] = useState(false);
  const [selectedNoteObjIds, setSelectedNoteObjIds] = useState<string[]>([]);
  const [noteTables, setNoteTables] = useState<Array<{ id: string; props: SmartTableProps }>>([]);
  const [noteHelpers, setNoteHelpers] = useState<Array<{ id: string; props: SubjectHelperProps }>>([]);
  const [noteIntegerOps, setNoteIntegerOps] = useState<Array<{ id: string; props: IntegerOpsWidgetProps }>>([]);
  const [noteInequalityGraphs, setNoteInequalityGraphs] = useState<Array<{ id: string; props: InequalityGraphProps }>>([]);

  const handleInsertNoteIntegerOps = useCallback((mode: IntegerOpsMode) => {
    const id = `note-intops-${Date.now()}`;
    setNoteIntegerOps((prev) => [
      ...prev,
      { id, props: createDefaultIntegerOpsProps(mode, { x: 90, y: 95 }) },
    ]);
    setShowTablePicker(false);
    showToast('Alat bantu Bilangan Bulat ditambahkan ke catatan');
  }, []);

  const handleInsertNoteInequalityGraph = useCallback(
    (opts?: Partial<InequalityGraphProps>) => {
      const id = `note-ineq-${Date.now()}`;
      setNoteInequalityGraphs((prev) => [
        ...prev,
        { id, props: createDefaultInequalityGraphProps({ x: 110, y: 90, ...opts }) },
      ]);
      setShowTablePicker(false);
      showToast('Grafik SPtLDV ditambahkan ke catatan');
    },
    [],
  );

  // V10 Selection-to-Visual Analyzer in /notes
  const noteSelectionAnalysis = useMemo(() => {
    if (!activePage || selectedNoteObjIds.length === 0) return null;
    const selSet = new Set(selectedNoteObjIds);
    const items: SelectionContentItem[] = [];
    for (const obj of activePage.objects) {
      if (!selSet.has(obj.id)) continue;
      const p = obj.props as Record<string, unknown>;
      if (obj.object_type === 'math_block') {
        items.push({
          id: obj.id,
          objectType: obj.object_type,
          latex: typeof p.latex === 'string' ? p.latex : undefined,
          text: typeof p.text === 'string' ? p.text : undefined,
        });
      } else if (obj.object_type === 'text' || obj.object_type === 'annotation') {
        items.push({
          id: obj.id,
          objectType: obj.object_type,
          text: typeof p.text === 'string' ? p.text : typeof p.label === 'string' ? p.label : undefined,
        });
      } else if (obj.object_type === 'smart_table' && Array.isArray(p.cells)) {
        items.push({
          id: obj.id,
          objectType: obj.object_type,
          tableCells: p.cells as Array<Array<{ raw: string }>>,
        });
      }
    }
    if (items.length === 0) return null;
    const res = analyzeSelectionContent(items);
    return res.kind === 'none' ? null : res;
  }, [activePage, selectedNoteObjIds]);

  const handleInsertNoteTable = useCallback((preset: TablePresetMode, opts?: { rows?: number; cols?: number }) => {
    const id = `note-table-${Date.now()}`;
    setNoteTables((prev) => [
      ...prev,
      { id, props: createDefaultSmartTableProps(preset, { x: 80, y: 90, rows: opts?.rows, cols: opts?.cols }) },
    ]);
    setShowTablePicker(false);
    showToast('Tabel pintar ditambahkan ke catatan');
  }, []);

  const handleInsertNoteHelper = useCallback((kind: SubjectHelperKind) => {
    const id = `note-helper-${Date.now()}`;
    setNoteHelpers((prev) => [
      ...prev,
      { id, props: createDefaultSubjectHelperProps(kind, { x: 100, y: 100 }) },
    ]);
    setShowTablePicker(false);
    showToast('Alat bantu materi ditambahkan ke catatan');
  }, []);

  const notesCommandActions: CommandPaletteAction[] = [
    { id: 'n-table-picker', label: 'Sisipkan Tabel Custom / Statistika & Alat Bantu (V9)', category: 'Tabel & Alat Bantu', run: () => setShowTablePicker(true) },
    { id: 'n-stat-grouped', label: 'Tabel Statistika Data Kelompok (Mean/Median/Modus)', category: 'Tabel & Alat Bantu', run: () => handleInsertNoteTable('stat_grouped') },
    { id: 'n-stat-ungrouped', label: 'Tabel Statistika Data Tunggal Berbobot', category: 'Tabel & Alat Bantu', run: () => handleInsertNoteTable('stat_ungrouped') },
    { id: 'n-h2l', label: 'Ubah Tulisan Tangan → Rumus LaTeX', category: 'ManimGX & AI', run: handleConvertPageHandwritingToLatex },
    {
      id: 'n-manim-circle',
      label: 'ManimGX: Persamaan Lingkaran (x - 2)² + (y - 1)² = 9',
      category: 'ManimGX & AI',
      run: () => handleInsertManimGxInNotes(analyzeForManimGX({ latex: '(x - 2)^2 + (y - 1)^2 = 9' })),
    },
    {
      id: 'n-manim',
      label: 'Buat Animasi 3D ManimGX (z = sin(x)*cos(y))',
      category: 'ManimGX & AI',
      run: () => handleInsertManimGxInNotes(analyzeForManimGX({ latex: 'z = sin(x) * cos(y)' })),
    },
    { id: 'n-mermaid', label: 'Mermaid → Diagram Flowchart', category: 'Excalidraw', run: () => setShowMermaidModal(true) },
    { id: 'n-svg', label: 'Ekspor Halaman ke SVG Vektor', category: 'Ekspor', run: handleExportSvg },
    { id: 'n-png', label: 'Ekspor Halaman ke PNG', category: 'Ekspor', run: handleExportPng },
    { id: 'n-ruler', label: showRuler ? 'Sembunyikan Penggaris Virtual' : 'Tampilkan Penggaris Virtual', category: 'Alat', run: () => setShowRuler((v) => !v) },
    { id: 'n-props', label: showExProps ? 'Sembunyikan Panel Gaya Excalidraw' : 'Tampilkan Panel Gaya Excalidraw', category: 'Tampilan', run: () => setShowExProps((v) => !v) },
    { id: 'n-timer', label: 'Buka Timer Belajar', category: 'Utilitas', run: () => setShowTimer((v) => !v) },
    { id: 'n-feynman', label: 'Buka Feynman AI', category: 'AI', run: () => setShowFeynman((v) => !v) },
  ];

  const handleToggleSpeechRecord = () => {
    const SpeechRec = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!isRecording) {
      setIsRecording(true);
      if (SpeechRec) {
        try {
          const rec = new SpeechRec() as { lang: string; continuous: boolean; onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; start: () => void };
          rec.lang = 'id-ID';
          rec.continuous = false;
          rec.onresult = (ev) => {
            const text = Array.from(ev.results).map((r) => r[0].transcript).join(' ');
            setTranscript((prev) => `${prev ? prev + ' ' : ''}${text}`);
            setIsRecording(false);
          };
          rec.start();
        } catch {
          // fallback
        }
      } else {
        setTranscript((prev) => `${prev ? prev + '\n' : ''}[Rekaman suara aktif — tempel atau ketik transkripsi di sini]`);
      }
    } else {
      setIsRecording(false);
    }
  };

  // ── AFFiNE DOC & BOARD VIEW (BlockSuite Page ↔ Edgeless Mode) ───────────────
  if (notesEngine === 'affine') {
    return (
      <Suspense
        fallback={
          <div className="flex h-screen w-screen items-center justify-center bg-white text-xs font-semibold text-slate-500">
            Memuat Workspace AFFiNE (Doc & Board)...
          </div>
        }
      >
        <AffineWorkspaceShell
          headerLeftSlot={
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px] font-bold">
              <button
                type="button"
                data-testid="switch-to-freenote-mode-btn"
                onClick={() => setNotesEngine('freenote')}
                className="rounded-md px-2 py-0.5 text-slate-600 hover:text-indigo-700"
              >
                Freenote Ink
              </button>
              <span className="rounded-md bg-white px-2 py-0.5 text-indigo-700 shadow-2xs">
                AFFiNE Doc & Board
              </span>
            </div>
          }
        />
      </Suspense>
    );
  }

  // ── LIBRARY VIEW (Matches Freenote Screenshots 234924 & 234937) ─────────────
  if (viewMode === 'library' || !activeNotebook || !activePage) {
    const visibleNotebooks = notebooks.filter((nb) => {
      if (libraryFilter === 'trash') return Boolean(nb.trashed);
      if (nb.trashed) return false;
      if (libraryFilter === 'unfiled') return nb.folderId === null;
      return nb.folderId === libraryFilter;
    });

    return (
      <div data-testid="notes-library-view" className="flex h-screen w-screen bg-slate-50 text-slate-900">
        {/* Left Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-base font-black text-slate-900">Catatan Belajar</h1>
            <Link to="/whiteboard" className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">
              Whiteboard
            </Link>
          </div>

          <div className="space-y-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLibraryFilter('unfiled')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 ${libraryFilter === 'unfiled' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span>📘 Belum Difile</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{notebooks.filter((n) => !n.trashed && !n.folderId).length}</span>
            </button>
            <button
              type="button"
              onClick={() => setLibraryFilter('trash')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 ${libraryFilter === 'trash' ? 'bg-rose-50 text-rose-700' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span>🗑️ Dibuang</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{notebooks.filter((n) => n.trashed).length}</span>
            </button>
          </div>

          <div className="mt-5 mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Folder</span>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('Nama folder baru:', `Mapel ${folders.length + 1}`);
                if (!name) return;
                const f: NotebookFolder = { id: `fld-${Date.now()}`, name, color: '#2563eb', createdAt: Date.now() };
                setFolders((prev) => [...prev, f]);
                void saveFolder(f);
              }}
              className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-600 hover:bg-blue-100"
            >
              + Folder
            </button>
          </div>
          <div className="space-y-1 text-xs">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setLibraryFilter(f.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 font-medium ${libraryFilter === f.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <span>📁 {f.name}</span>
                <span className="text-[10px] text-slate-400">{notebooks.filter((n) => !n.trashed && n.folderId === f.id).length}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Notebook Grid */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-900">
              {libraryFilter === 'unfiled' ? 'Belum Difile' : libraryFilter === 'trash' ? 'Dibuang' : folders.find((f) => f.id === libraryFilter)?.name ?? 'Catatan'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nb = createDefaultNotebook(`Notebook ${notebooks.length + 1}`, libraryFilter === 'unfiled' || libraryFilter === 'trash' ? null : libraryFilter, 'dot_grid', 'paged');
                  setNotebooks((prev) => [nb, ...prev]);
                  void saveNotebook(nb);
                  setActiveNbId(nb.id);
                  setActivePageIdx(0);
                  setViewMode('editor');
                  navigate(`/notes/${nb.id}`);
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-blue-700"
              >
                + Notebook Halaman A4
              </button>
              <button
                type="button"
                onClick={() => {
                  const nb = createDefaultNotebook(`Papan Infinite ${notebooks.length + 1}`, null, 'dot_grid', 'infinite');
                  setNotebooks((prev) => [nb, ...prev]);
                  void saveNotebook(nb);
                  setActiveNbId(nb.id);
                  setActivePageIdx(0);
                  setViewMode('editor');
                  navigate(`/notes/${nb.id}`);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700"
              >
                + Papan Infinite
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {visibleNotebooks.map((nb) => (
              <div
                key={nb.id}
                onClick={() => {
                  setActiveNbId(nb.id);
                  setActivePageIdx(0);
                  setViewMode('editor');
                  navigate(`/notes/${nb.id}`);
                }}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-xs transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
              >
                <div
                  className="mb-2.5 flex h-40 w-full flex-col justify-between rounded-xl border-l-8 border-sky-300 p-3 text-white shadow-inner"
                  style={{ backgroundColor: nb.coverColor }}
                >
                  <span className="self-end rounded-md bg-black/25 px-1.5 py-0.5 text-[9px] font-bold">
                    {nb.pages.length} hal
                  </span>
                  <span className="line-clamp-2 text-xs font-bold">{nb.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="truncate text-xs font-bold text-slate-800">{nb.title}</div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (nb.trashed) {
                        setNotebooks((p) => p.filter((x) => x.id !== nb.id));
                        void deleteNotebookPermanently(nb.id);
                      } else {
                        commitNotebook({ ...nb, trashed: true });
                      }
                    }}
                    className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    🗑️
                  </button>
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(nb.updatedAt).toLocaleDateString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── EDITOR VIEW ─────────────────────────────────────────────────────────────
  return (
    <div data-testid="notes-editor-page" className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
      <NotesToolbarPills
        notebookTitle={activeNotebook.title}
        onChangeTitle={(t) => commitNotebook({ ...activeNotebook, title: t })}
        pageMode={activePage.mode}
        currentTemplate={activePage.template}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        penSettings={penSettings}
        onChangePen={(p) => setPenSettings((prev) => ({ ...prev, ...p }))}
        eraserSettings={eraserSettings}
        onChangeEraser={(p) => setEraserSettings((prev) => ({ ...prev, ...p }))}
        lassoSettings={lassoSettings}
        onChangeLasso={(p) => setLassoSettings((prev) => ({ ...prev, ...p }))}
        laserConfig={laserConfig}
        onChangeLaser={(p) => setLaserConfig((prev) => ({ ...prev, ...p }))}
        onClearLaser={() => showToast('Jejak laser dibersihkan')}
        showRuler={showRuler}
        onToggleRuler={() => setShowRuler((v) => !v)}
        showThumbnails={showThumbnails}
        onToggleThumbnails={() => setShowThumbnails((v) => !v)}
        showLayers={showLayers}
        onToggleLayers={() => setShowLayers((v) => !v)}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onBackToLibrary={() => setViewMode('library')}
        onAddPage={(tpl) => {
          const newP = createNotePage(activeNotebook.pages.length, tpl, activePage.mode);
          const nextNb = { ...activeNotebook, pages: [...activeNotebook.pages, newP] };
          commitNotebook(nextNb);
          setActivePageIdx(nextNb.pages.length - 1);
          showToast(`Halaman ${nextNb.pages.length} (${tpl}) ditambahkan`);
        }}
        onChangeTemplate={(tpl: PaperTemplateKind) => {
          handleUpdatePage((p) => ({ ...p, template: tpl }));
          showToast(`Template diubah ke ${tpl}`);
        }}
        onTogglePageMode={() => {
          handleUpdatePage((p) => ({ ...p, mode: p.mode === 'infinite' ? 'paged' : 'infinite' }));
        }}
        onImportPdf={() => pdfInputRef.current?.click()}
        onImportImage={() => imgInputRef.current?.click()}
        onExportPng={handleExportPng}
        onClearCurrentLayerHandwriting={() => {
          handleUpdatePage((p) => ({
            ...p,
            strokes: p.strokes.filter((s) => s.layerId !== activeLayerId),
          }));
          showToast('Tulisan tangan di lapisan aktif dihapus');
        }}
        onOpenTimer={() => setShowTimer((v) => !v)}
        onOpenRecorder={() => setShowRecorder((v) => !v)}
        onOpenSearch={() => setShowSearch((v) => !v)}
        onOpenFeynmanAI={() => setShowFeynman((v) => !v)}
        onCapturePhoto={() => imgInputRef.current?.click()}
        onSnipCanvas={handleExportPng}
        toolLocked={toolLocked}
        onToggleToolLock={() => setToolLocked((v) => !v)}
        onOpenMermaid={() => setShowMermaidModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onExportSvg={handleExportSvg}
        onSwitchToAffine={() => setNotesEngine('affine')}
        onConvertHandwritingToLatex={handleConvertPageHandwritingToLatex}
        onLaunchManimGx={() => handleInsertManimGxInNotes(analyzeForManimGX({ latex: '(x - 2)^2 + (y - 1)^2 = 9' }))}
      />

      {/* Hidden File Inputs for Images & PDF */}
      <input
        ref={imgInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          Array.from(e.target.files ?? []).forEach((f) => void handleInsertImageBlob(f, undefined, f.name));
          e.target.value = '';
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const newP = createNotePage(activeNotebook.pages.length, 'blank', 'paged');
            newP.texts = [
              { id: `pdf-hdr-${Date.now()}`, x: 40, y: 32, text: `Dokumen PDF: ${f.name}`, fontSize: 15, color: '#2563eb', layerId: 'layer-1' },
            ];
            const nextNb = { ...activeNotebook, pages: [...activeNotebook.pages, newP] };
            commitNotebook(nextNb);
            setActivePageIdx(nextNb.pages.length - 1);
            showToast(`PDF "${f.name}" dimuat ke halaman baru`);
          }
          e.target.value = '';
        }}
      />

      {/* Main Editor Body */}
      <div className="relative flex flex-1 overflow-hidden">
        <NotesCanvas
          page={activePage}
          activeLayerId={activeLayerId}
          activeTool={activeTool}
          penSettings={penSettings}
          eraserSettings={eraserSettings}
          lassoSettings={lassoSettings}
          laserConfig={laserConfig}
          showRuler={showRuler}
          canvasExportRef={canvasExportRef}
          excalidrawStyle={excalidrawStyle}
          toolLocked={toolLocked}
          onSelectTool={setActiveTool}
          onUpdatePage={handleUpdatePage}
          onSelectedObjIdsChange={setSelectedNoteObjIds}
          onDropImageBlob={(blob, pos, name) => void handleInsertImageBlob(blob, pos, name)}
        />

        {/* Shared Excalidraw Left Style Properties Panel in /notes (supports stroke, whole & per-region background fill!) */}
        <ExcalidrawPropertiesPanel
          open={
            showExProps &&
            (selectedNoteObjIds.length > 0 ||
              activeTool === 'rect' ||
              activeTool === 'rhombus' ||
              activeTool === 'ellipse' ||
              activeTool === 'arrow' ||
              activeTool === 'line' ||
              activeTool === 'frame')
          }
          style={excalidrawStyle}
          selectedCount={selectedNoteObjIds.length}
          capabilities={getCapabilitiesForSelection(
            activePage.objects
              .filter((o) => selectedNoteObjIds.includes(o.id))
              .map((o) => o.object_type),
            activeTool,
          )}
          onChangeStyle={(patch) => {
            setExcalidrawStyle((prev) => ({ ...prev, ...patch }));
            if (selectedNoteObjIds.length === 0) return;
            const selSet = new Set(selectedNoteObjIds);
            handleUpdatePage((prev) => ({
              ...prev,
              objects: prev.objects.map((obj) => {
                if (!selSet.has(obj.id)) return obj;
                const op = { ...(obj.props as Record<string, unknown>) };
                if (obj.object_type === 'smart_table') {
                  const rawCells = Array.isArray(op.cells) ? (op.cells as TableCell[][]) : null;
                  if (rawCells) {
                    const range = (op.selectedRange as TableCellRange | null | undefined) ?? null;
                    const stylePatch: { bgColor?: string | null; textColor?: string | null } = {};
                    if (patch.backgroundColor !== undefined) stylePatch.bgColor = patch.backgroundColor;
                    if (patch.strokeColor !== undefined) stylePatch.textColor = patch.strokeColor;
                    if (stylePatch.bgColor !== undefined || stylePatch.textColor !== undefined) {
                      op.cells = applyStyleToSmartTableCells(rawCells, range, stylePatch);
                    }
                  }
                } else {
                if (patch.strokeColor !== undefined) op.stroke = patch.strokeColor;
                if (patch.strokeWidth !== undefined) op.strokeWidth = patch.strokeWidth;
                if (patch.strokeStyle !== undefined) op.strokeStyle = patch.strokeStyle;
                if (patch.roughness !== undefined) op.roughness = patch.roughness;
                if (patch.opacity !== undefined) op.opacity = patch.opacity;
                if (patch.fillStyle !== undefined) op.fillStyle = patch.fillStyle;
                if (patch.backgroundColor !== undefined) {
                  if (Array.isArray(op.multiSegments) && op.multiSegments.length > 0) {
                    const activeIdx = typeof op.activeRegionIndex === 'number' ? op.activeRegionIndex : -1;
                    if (activeIdx >= 0) {
                      const prevFills =
                        typeof op.regionFills === 'object' && op.regionFills !== null
                          ? { ...(op.regionFills as Record<string, string>) }
                          : {};
                      if (patch.backgroundColor === 'transparent') delete prevFills[String(activeIdx)];
                      else prevFills[String(activeIdx)] = patch.backgroundColor;
                      op.regionFills = prevFills;
                    } else if (patch.backgroundColor === 'transparent') {
                      op.regionFills = {};
                      op.fill = 'transparent';
                    } else {
                      const allRegs = getCachedPlanarRegions(op.multiSegments as number[][]);
                      const allFills: Record<string, string> = {};
                      for (const r of allRegs) allFills[String(r.index)] = patch.backgroundColor;
                      op.regionFills = allFills;
                      op.fill = patch.backgroundColor;
                    }
                  } else {
                    op.fill = patch.backgroundColor;
                  }
                }
                }
                return { ...obj, props: op, updated_at: Date.now() };
              }),
            }));
          }}
          onClose={() => setShowExProps(false)}
        />

        {/* Right Thumbnail Sidebar (Matches Screenshot_20261124-235043.jpg.jpeg!) */}
        {showThumbnails && (
          <aside
            data-testid="notes-thumbnail-sidebar"
            className="z-30 flex w-60 shrink-0 flex-col border-l border-slate-200 bg-white/98 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2.5">
              <span className="text-xs font-bold text-slate-900">Thumbnail ({activeNotebook.pages.length})</span>
              <button type="button" onClick={() => setShowThumbnails(false)} className="text-xs text-slate-400 hover:text-slate-700">×</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {activeNotebook.pages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => setActivePageIdx(idx)}
                  className={`cursor-pointer rounded-xl border-2 p-2 transition ${
                    idx === activePageIdx ? 'border-blue-500 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-slate-600">
                    <span>Halaman {idx + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          commitNotebook({
                            ...activeNotebook,
                            pages: activeNotebook.pages.map((pg, i) => (i === idx ? { ...pg, bookmarked: !pg.bookmarked } : pg)),
                          });
                        }}
                        title="Tandai Bookmark"
                        className={p.bookmarked ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}
                      >
                        ★
                      </button>
                      {activeNotebook.pages.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const filtered = activeNotebook.pages.filter((_, i) => i !== idx);
                            commitNotebook({ ...activeNotebook, pages: filtered });
                            setActivePageIdx(Math.max(0, Math.min(activePageIdx, filtered.length - 1)));
                          }}
                          title="Hapus Halaman"
                          className="text-rose-400 hover:text-rose-600"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex h-24 items-center justify-center rounded-lg border border-slate-100 bg-white text-[10px] text-slate-400">
                    {p.strokes.length} goresan · {p.template}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Layers Drawer */}
        {showLayers && (
          <aside className="z-30 flex w-64 shrink-0 flex-col border-l border-slate-200 bg-white p-3 shadow-xl text-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-slate-900">Lapisan (Layers)</span>
              <button
                type="button"
                onClick={() => {
                  const nid = `layer-${activePage.layers.length + 1}`;
                  handleUpdatePage((p) => ({
                    ...p,
                    layers: [...p.layers, { id: nid, name: `Lapisan ${p.layers.length + 1}`, visible: true, locked: false, opacity: 1, order: p.layers.length }],
                  }));
                  setActiveLayerId(nid);
                }}
                className="rounded-lg bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white"
              >
                + Lapisan
              </button>
            </div>
            <div className="space-y-1.5">
              {activePage.layers.map((layer) => (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`flex items-center justify-between rounded-xl border p-2 cursor-pointer ${
                    activeLayerId === layer.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                  }`}
                >
                  <span className="font-semibold">{layer.name}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePage((p) => ({
                          ...p,
                          layers: p.layers.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l)),
                        }), false);
                      }}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]"
                    >
                      {layer.visible ? '👁️' : '🙈'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdatePage((p) => ({
                          ...p,
                          layers: p.layers.map((l) => (l.id === layer.id ? { ...l, locked: !l.locked } : l)),
                        }), false);
                      }}
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]"
                    >
                      {layer.locked ? '🔒' : '🔓'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Floating Study Timer Widget */}
      {showTimer && (
        <div className="fixed bottom-16 right-4 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-slate-800">⏱️ Timer Belajar</span>
            <button type="button" onClick={() => setShowTimer(false)} className="text-slate-400">×</button>
          </div>
          <div className="my-2 text-center font-mono text-2xl font-black text-indigo-700">
            {String(Math.floor(timerSec / 60)).padStart(2, '0')}:{String(timerSec % 60).padStart(2, '0')}
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setTimerRunning((v) => !v)} className="flex-1 rounded-lg bg-indigo-600 py-1.5 font-bold text-white">
              {timerRunning ? 'Jeda' : 'Mulai'}
            </button>
            <button type="button" onClick={() => { setTimerRunning(false); setTimerSec(25 * 60); }} className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Floating Audio Recorder + Transcription */}
      {showRecorder && (
        <div className="fixed bottom-16 left-4 z-40 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-slate-800">🎙️ Rekam & Transkripsi</span>
            <button type="button" onClick={() => setShowRecorder(false)} className="text-slate-400">×</button>
          </div>
          <button
            type="button"
            onClick={handleToggleSpeechRecord}
            className={`mb-2 w-full rounded-xl py-2 font-bold text-white ${isRecording ? 'bg-rose-600 animate-pulse' : 'bg-blue-600'}`}
          >
            {isRecording ? '⏹ Hentikan Rekaman' : '● Mulai Rekam Suara'}
          </button>
          <textarea
            rows={3}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Hasil transkripsi suara otomatis tampil di sini..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-[11px] outline-none"
          />
        </div>
      )}

      {/* Search Popover */}
      {showSearch && (
        <div className="fixed top-24 left-1/2 z-40 w-80 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl text-xs">
          <div className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari teks di semua halaman..."
              className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 outline-none focus:border-blue-400"
            />
            <button type="button" onClick={() => setShowSearch(false)} className="px-2 text-slate-500">×</button>
          </div>
          {searchQuery && (
            <div className="mt-2 space-y-1">
              {activeNotebook.pages
                .map((p, i) => ({
                  idx: i,
                  hits: (p.texts ?? []).filter((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase())),
                }))
                .filter((x) => x.hits.length > 0)
                .map((x) => (
                  <button
                    key={x.idx}
                    type="button"
                    onClick={() => { setActivePageIdx(x.idx); setShowSearch(false); }}
                    className="block w-full rounded-lg bg-slate-50 px-2.5 py-1.5 text-left hover:bg-blue-50"
                  >
                    <strong>Halaman {x.idx + 1}:</strong> {x.hits[0].text}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Feynman AI Study Helper */}
      {showFeynman && (
        <div className="fixed bottom-16 right-4 z-40 w-80 rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold text-indigo-700">🧠 Feynman AI · Uji Pemahaman</span>
            <button type="button" onClick={() => setShowFeynman(false)} className="text-slate-400">×</button>
          </div>
          <textarea
            rows={2}
            value={feynmanPrompt}
            onChange={(e) => setFeynmanPrompt(e.target.value)}
            placeholder="Jelaskan konsep yang sedang kamu pelajari dengan bahasamu sendiri..."
            className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() =>
              setFeynmanAnswer(
                feynmanPrompt.trim()
                  ? `Penjelasanmu tentang "${feynmanPrompt.slice(0, 40)}" sudah bagus! Coba tambahkan 1 contoh konkret angka atau diagram visual pada catatan agar mudah diingat saat ujian.`
                  : 'Ketik ringkasan konsep terlebih dahulu untuk mendapatkan umpan balik Teknik Feynman.',
              )
            }
            className="w-full rounded-xl bg-indigo-600 py-2 font-bold text-white hover:bg-indigo-700"
          >
            Evaluasi Pemahaman
          </button>
          {feynmanAnswer && <p className="mt-2 rounded-xl bg-indigo-50 p-2.5 text-[11px] text-indigo-900">{feynmanAnswer}</p>}
        </div>
      )}

      <ExcalidrawCommandPalette
        open={showCommandPalette}
        actions={notesCommandActions}
        onClose={() => setShowCommandPalette(false)}
      />
      <MermaidToDiagramModal
        open={showMermaidModal}
        onInsert={handleInsertMermaidInNotes}
        onClose={() => setShowMermaidModal(false)}
      />

      {/* V9 Floating Smart Tables & Subject Helpers in /notes */}
      {noteTables.map((t) => (
        <div
          key={t.id}
          className="fixed z-40"
          style={{ left: t.props.x ?? 80, top: t.props.y ?? 90 }}
        >
          <Suspense fallback={null}>
            <SmartTableWidget
              id={t.id}
              tableProps={t.props}
              onUpdateProps={(patch) =>
                setNoteTables((prev) =>
                  prev.map((item) => (item.id === t.id ? { ...item, props: { ...item.props, ...patch } } : item)),
                )
              }
              onMovePosition={(dx, dy) =>
                setNoteTables((prev) =>
                  prev.map((item) =>
                    item.id === t.id
                      ? { ...item, props: { ...item.props, x: (item.props.x ?? 80) + dx, y: (item.props.y ?? 90) + dy } }
                      : item,
                  ),
                )
              }
              onDelete={() => setNoteTables((prev) => prev.filter((item) => item.id !== t.id))}
            />
          </Suspense>
        </div>
      ))}

      {noteHelpers.map((h) => (
        <div
          key={h.id}
          className="fixed z-40"
          style={{ left: h.props.x ?? 100, top: h.props.y ?? 100 }}
        >
          <Suspense fallback={null}>
            <SubjectHelperWidget
              id={h.id}
              helperProps={h.props}
              onUpdateProps={(patch) =>
                setNoteHelpers((prev) =>
                  prev.map((item) => (item.id === h.id ? { ...item, props: { ...item.props, ...patch } } : item)),
                )
              }
              onMovePosition={(dx, dy) =>
                setNoteHelpers((prev) =>
                  prev.map((item) =>
                    item.id === h.id
                      ? { ...item, props: { ...item.props, x: (item.props.x ?? 100) + dx, y: (item.props.y ?? 100) + dy } }
                      : item,
                  ),
                )
              }
              onDelete={() => setNoteHelpers((prev) => prev.filter((item) => item.id !== h.id))}
            />
          </Suspense>
        </div>
      ))}

      {/* V10 Floating Integer Ops & SPtLDV Graph Widgets in /notes */}
      {noteIntegerOps.map((w) => (
        <div
          key={w.id}
          className="fixed z-40"
          style={{ left: w.props.x ?? 90, top: w.props.y ?? 95 }}
        >
          <Suspense fallback={null}>
            <IntegerOpsWidget
              id={w.id}
              widgetProps={w.props}
              onUpdateProps={(patch) =>
                setNoteIntegerOps((prev) =>
                  prev.map((item) => (item.id === w.id ? { ...item, props: { ...item.props, ...patch } } : item)),
                )
              }
              onMovePosition={(dx, dy) =>
                setNoteIntegerOps((prev) =>
                  prev.map((item) =>
                    item.id === w.id
                      ? { ...item, props: { ...item.props, x: (item.props.x ?? 90) + dx, y: (item.props.y ?? 95) + dy } }
                      : item,
                  ),
                )
              }
              onDelete={() => setNoteIntegerOps((prev) => prev.filter((item) => item.id !== w.id))}
            />
          </Suspense>
        </div>
      ))}

      {noteInequalityGraphs.map((g) => (
        <div
          key={g.id}
          className="fixed z-40"
          style={{ left: g.props.x ?? 110, top: g.props.y ?? 90 }}
        >
          <Suspense fallback={null}>
            <LinearInequalityGraphWidget
              id={g.id}
              graphProps={g.props}
              onUpdateProps={(patch) =>
                setNoteInequalityGraphs((prev) =>
                  prev.map((item) => (item.id === g.id ? { ...item, props: { ...item.props, ...patch } } : item)),
                )
              }
              onMovePosition={(dx, dy) =>
                setNoteInequalityGraphs((prev) =>
                  prev.map((item) =>
                    item.id === g.id
                      ? { ...item, props: { ...item.props, x: (item.props.x ?? 110) + dx, y: (item.props.y ?? 90) + dy } }
                      : item,
                  ),
                )
              }
              onDelete={() => setNoteInequalityGraphs((prev) => prev.filter((item) => item.id !== g.id))}
            />
          </Suspense>
        </div>
      ))}

      {/* V10 Selection-to-Visual Analyzer Pill in /notes (below top toolbar) */}
      {noteSelectionAnalysis && (
        <div
          data-testid="notes-selection-analyzer-bar"
          className="fixed top-[116px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-200 bg-white/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur-md"
        >
          <span className="font-semibold text-slate-700">
            {noteSelectionAnalysis.kind === 'integer_ops'
              ? 'Operasi Bilangan Bulat terdeteksi'
              : `${noteSelectionAnalysis.detectedCount} ekspresi terdeteksi`}
          </span>
          <button
            type="button"
            onClick={() => {
              if (noteSelectionAnalysis.kind === 'integer_ops') {
                setNoteIntegerOps((prev) => [
                  ...prev,
                  {
                    id: `note-intops-${Date.now()}`,
                    props: createDefaultIntegerOpsProps('operations', {
                      x: 100,
                      y: 110,
                      expression: noteSelectionAnalysis.integerExpression ?? '-1 + 3',
                    }),
                  },
                ]);
              } else if (noteSelectionAnalysis.kind === 'sptlsv') {
                handleInsertNoteHelper('number_line');
              } else {
                handleInsertNoteInequalityGraph({
                  rawExpressions: noteSelectionAnalysis.rawExpressions,
                  objectiveExpr: noteSelectionAnalysis.objectiveExpr,
                  studentTablePoints:
                    noteSelectionAnalysis.studentTablePoints.length > 0
                      ? noteSelectionAnalysis.studentTablePoints
                      : undefined,
                });
              }
            }}
            className="rounded-xl bg-emerald-600 px-3 py-1 font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            {noteSelectionAnalysis.actionLabel}
          </button>
        </div>
      )}

      {showTablePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-xs">
          <div className="max-h-[82vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Tabel Pintar & Alat Bantu</h3>
              <button
                type="button"
                onClick={() => setShowTablePicker(false)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
            <TableGridPicker
              onInsertTable={handleInsertNoteTable}
              onInsertHelper={handleInsertNoteHelper}
              onInsertIntegerOps={handleInsertNoteIntegerOps}
              onInsertInequalityGraph={() => handleInsertNoteInequalityGraph()}
            />
          </div>
        </div>
      )}

      {/* V6 Unified Handwriting-to-LaTeX Quick Action (Desktop only — mobile has these cleanly inside bottom dock!) */}
      <div className="fixed bottom-4 right-4 z-40 hidden md:flex items-center gap-2">
        <button
          type="button"
          data-testid="notes-smart-table-btn"
          onClick={() => setShowTablePicker(true)}
          className="rounded-full border border-emerald-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-lg hover:bg-emerald-50"
          title="Sisipkan Tabel Custom, Statistika Mean/Median/Modus, atau Alat Bantu Materi"
        >
          📊 Tabel & Alat
        </button>
        <button
          type="button"
          data-testid="notes-handwriting-latex-btn"
          onClick={handleConvertPageHandwritingToLatex}
          className="rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-lg hover:bg-indigo-50"
          title="Konversi goresan tulisan tangan menjadi rumus LaTeX"
        >
          ✍ Tulisan → LaTeX
        </button>
        <button
          type="button"
          data-testid="notes-manimgx-launch-btn"
          onClick={() => handleInsertManimGxInNotes(analyzeForManimGX({ latex: '(x - 2)^2 + (y - 1)^2 = 9' }))}
          className="rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-lg hover:bg-indigo-50"
          title="Tambahkan Visualisasi ManimGX langsung ke halaman catatan"
        >
          🎬 ManimGX
        </button>
      </div>

      {handwriting.candidate && (
        <div
          data-testid="notes-latex-confirm-chip"
          className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-indigo-200 bg-white/98 px-3.5 py-2 text-xs shadow-2xl"
        >
          <span className="font-semibold text-slate-600">Rumus terdeteksi:</span>
          <code className="rounded bg-indigo-50 px-2 py-0.5 font-mono font-bold text-indigo-800">
            {handwriting.candidate.latex}
          </code>
          <button
            type="button"
            data-testid="notes-latex-accept-btn"
            onClick={handleAcceptHandwritingLatex}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-700"
          >
            ✓ Jadi LaTeX
          </button>
          <button
            type="button"
            onClick={handwriting.dismissCandidate}
            className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {statusToast && (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xl">
          {statusToast}
        </div>
      )}
    </div>
  );
}
