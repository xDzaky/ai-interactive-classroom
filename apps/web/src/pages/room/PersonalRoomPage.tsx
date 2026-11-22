/**
 * PersonalRoomPage — Tongchuang AI Blackboard Experience (no login required)
 * URL: /whiteboard
 *
 * Implements the full iFLYTEK Tongchuang AI Blackboard (讯飞同窗AI黑板) workflow:
 * - Matte dark slate chalkboard (#2d333f) with crisp white chalk ink
 * - Select, multi-select, marquee, right-click context menu, white floating action bar
 * - Floating white circular AI Radial Wheel with concentric color/width/3D/AI arcs
 * - Live transparent 3D solids via WhiteboardOverlay (360° orbit, 3-point cross-section +
 *   side-by-side 2D interior angle projection, unfold net + dihedral angle badge, explode view)
 * - Formula -> Dynamic Graph (Mafs), Indonesian Voice/Text Commands, Templates, Micro-Lesson Summary
 */
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { Link } from "react-router-dom";
import {
  createInitialBoardState,
  createHistory,
  undo as historyUndo,
  redo as historyRedo,
  pushHistory,
} from "@ai-classroom/whiteboard-core";
import type {
  BoardState,
  BoardObject,
  WhiteboardEvent,
  WhiteboardHistory,
} from "@ai-classroom/whiteboard-core";
import type { SolidParams, SolidType } from "@ai-classroom/geometry-core";
import type { LessonTemplate } from "@ai-classroom/curriculum-schema";
import type Konva from "konva";
import type { ToolType } from "@/hooks/useWhiteboardTool";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";
import { WhiteboardOverlay } from "@/pages/whiteboard/WhiteboardOverlay";
import { ToolBar } from "@/components/whiteboard/ToolBar";
import { TongchuangRadialWheel } from "@/components/whiteboard/TongchuangRadialWheel";
import { FormulaToGraphModal } from "@/components/whiteboard/FormulaToGraphModal";
import { VoiceCommandBar } from "@/components/whiteboard/VoiceCommandBar";
import { LessonSummaryModal } from "@/components/whiteboard/LessonSummaryModal";
import { AiExplainModal } from "@/components/whiteboard/AiExplainModal";
import { TemplatePickerModal } from "@/features/templates/TemplatePickerModal";
import { useVoiceCommands, type ParsedVoiceIntent } from "@/hooks/useVoiceCommands";
import { exportStageToPng } from "@/lib/exportPng";
import { parsePerfParam, makePerfScene } from "@/dev/perfFixture";
import { FpsMeter } from "@/dev/FpsMeter";

const TongchuangSolidWidget = lazy(() =>
  import("@/components/math/TongchuangSolidWidget").then((m) => ({
    default: m.TongchuangSolidWidget,
  })),
);
const GraphViewer = lazy(() =>
  import("@/components/math/GraphViewer").then((m) => ({ default: m.GraphViewer })),
);

const PERSONAL_ROOM_ID = "personal-sandbox";

const DEFAULT_SOLID_PARAMS: Record<SolidType, SolidParams> = {
  cube: { type: "cube", s: 4 },
  cuboid: { type: "cuboid", l: 5, w: 3, h: 3 },
  sphere: { type: "sphere", r: 3 },
  cylinder: { type: "cylinder", r: 2, h: 5 },
  cone: { type: "cone", r: 2.5, h: 5 },
  pyramid: { type: "pyramid", b: 4, h: 5 },
  prism: { type: "prism", a: 4, b: 4, c: 4, h: 5 },
  torus: { type: "torus", R: 3, r: 1 },
};

const SOLID_LABELS: Record<SolidType, string> = {
  cube: "Kubus ABCD.EFGH",
  cuboid: "Balok ABCD.EFGH",
  sphere: "Bola",
  cylinder: "Tabung",
  cone: "Kerucut",
  pyramid: "Limas T.ABCD",
  prism: "Prisma Segitiga",
  torus: "Torus",
};

export default function PersonalRoomPage() {
  const [boardState, setBoardState] = useState<BoardState>(() => {
    const perfConfig = parsePerfParam();
    if (perfConfig) {
      return makePerfScene({ strokes: perfConfig.strokes, shapes: perfConfig.shapes });
    }
    return createInitialBoardState(PERSONAL_ROOM_ID);
  });
  const [history, setHistory] = useState<WhiteboardHistory>(() => createHistory(100));

  const boardStateRef = useRef(boardState);
  boardStateRef.current = boardState;
  const historyRef = useRef(history);
  historyRef.current = history;

  const [activeTool, setActiveTool] = useState<ToolType>("pen");
  const [color, setColor] = useState("#f8fafc");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const stageRef = useRef<Konva.Stage | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);

  const [show3dModal, setShow3dModal] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showVoiceBar, setShowVoiceBar] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [explainObj, setExplainObj] = useState<BoardObject | null>(null);
  const [solidParams, setSolidParams] = useState<SolidParams>({ type: "cube", s: 4 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function update() {
      setCanvasSize({
        width: Math.max(400, window.innerWidth - 56),
        height: Math.max(300, window.innerHeight - 56),
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Global shortcut V for Select tool (P10-T02)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }
      if (e.key.toLowerCase() === "v") {
        setActiveTool("select");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // -------------------------------------------------------------------------
  // Event reducer & history
  // -------------------------------------------------------------------------
  const handleEvent = useCallback((event: WhiteboardEvent) => {
    if (
      event.event_type === "device.pointer.moved" ||
      event.event_type === "device.action"
    )
      return;
    const result = pushHistory(boardStateRef.current, historyRef.current, event);
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  const handleUndo = useCallback(() => {
    const result = historyUndo(boardStateRef.current, historyRef.current);
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  const handleRedo = useCallback(() => {
    const result = historyRedo(boardStateRef.current, historyRef.current);
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  // -------------------------------------------------------------------------
  // Insert live 3D Solid & 2D Graph directly onto the chalkboard
  // -------------------------------------------------------------------------
  const handleInsertSolidOnBoard = useCallback(
    (solidType: SolidType) => {
      const id = `solid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const cx = Math.max(180, Math.round(canvasSize.width / 2 - 150));
      const cy = Math.max(60, Math.round(canvasSize.height / 2 - 160));
      handleEvent({
        event_type: "object.created",
        payload: {
          id,
          object_type: "viz_solid",
          props: {
            solid_type: solidType,
            params: DEFAULT_SOLID_PARAMS[solidType],
            label: SOLID_LABELS[solidType],
            x: cx,
            y: cy,
          },
        },
      });
    },
    [canvasSize.width, canvasSize.height, handleEvent]
  );

  const handleInsertGraphOnBoard = useCallback(
    (expressions: string[]) => {
      const id = `graph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const cx = Math.max(120, Math.round(canvasSize.width / 2 - 180));
      const cy = Math.max(60, Math.round(canvasSize.height / 2 - 120));
      handleEvent({
        event_type: "object.created",
        payload: {
          id,
          object_type: "viz_graph",
          props: {
            expressions,
            x: cx,
            y: cy,
          },
        },
      });
      setShowFormulaModal(false);
    },
    [canvasSize.width, canvasSize.height, handleEvent]
  );

  const handleDeleteOverlayObject = useCallback(
    (id: string) => {
      handleEvent({
        event_type: "object.deleted",
        payload: { id },
      });
    },
    [handleEvent]
  );

  const handleDuplicateOverlayObject = useCallback(
    (obj: BoardObject) => {
      const p = obj.props as Record<string, unknown>;
      handleEvent({
        event_type: "object.created",
        payload: {
          id: `${obj.id}-copy-${Date.now().toString(36)}`,
          object_type: obj.object_type,
          props: {
            ...p,
            x: (typeof p.x === "number" ? p.x : 120) + 40,
            y: (typeof p.y === "number" ? p.y : 80) + 40,
          },
        },
      });
    },
    [handleEvent]
  );

  const handleClearBoard = useCallback(() => {
    if (window.confirm("Yakin ingin menghapus seluruh coretan di papan?")) {
      setBoardState(createInitialBoardState(PERSONAL_ROOM_ID));
      setHistory(createHistory(100));
    }
  }, []);

  // -------------------------------------------------------------------------
  // Voice Commands (P15-T02)
  // -------------------------------------------------------------------------
  const handleVoiceIntent = useCallback(
    (intent: ParsedVoiceIntent) => {
      switch (intent.kind) {
        case "insert_solid":
          handleInsertSolidOnBoard(intent.solidType);
          break;
        case "insert_graph":
          handleInsertGraphOnBoard([intent.expression]);
          break;
        case "set_tool":
          setActiveTool(intent.tool);
          break;
        case "undo":
          handleUndo();
          break;
        case "redo":
          handleRedo();
          break;
        case "open_summary":
          setShowSummaryModal(true);
          break;
        case "clear_board":
          handleClearBoard();
          break;
        default:
          break;
      }
    },
    [handleInsertSolidOnBoard, handleInsertGraphOnBoard, handleUndo, handleRedo, handleClearBoard]
  );

  const voice = useVoiceCommands(handleVoiceIntent);

  function handleExportPng() {
    exportStageToPng(stageRef.current, {
      filename: `tongchuang-whiteboard-${new Date().toISOString().slice(0, 10)}.png`,
      overlayRoot: overlayContainerRef.current,
    });
  }

  const handleSelectTemplate = useCallback((template: LessonTemplate) => {
    if (template.boardState) {
      setBoardState(template.boardState as unknown as BoardState);
      setShowTemplatesModal(false);
    }
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#2d333f] text-white">
      <FpsMeter />

      {/* Top Navbar */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-700/70 bg-slate-900/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-xs font-extrabold text-white shadow-md shadow-cyan-500/20"
          >
            AI
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">AI Smart Blackboard</span>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Mode Tanpa Login
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Gambar 2D → Klik Kanan → Bangun 3D 360°, Irisan 3 Titik, Jaring-Jaring & Roda AI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleInsertSolidOnBoard("cube")}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-600/35 hover:text-white"
          >
            <span>🧊</span>
            <span className="hidden sm:inline">Kubus 3D</span>
          </button>
          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-200 transition hover:bg-blue-600/35 hover:text-white"
          >
            <span>📈</span>
            <span className="hidden sm:inline">Rumus → Grafik</span>
          </button>
          <button
            type="button"
            onClick={() => setShowVoiceBar((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              showVoiceBar
                ? "border-cyan-400 bg-cyan-500/25 text-cyan-200"
                : "border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <span>🎙️</span>
            <span className="hidden md:inline">Suara AI</span>
          </button>
          <button
            type="button"
            onClick={handleExportPng}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <span>💾</span>
            <span className="hidden lg:inline">Export PNG</span>
          </button>
          <button
            type="button"
            onClick={handleClearBoard}
            title="Bersihkan Papan"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-red-500/30 hover:bg-red-950/40 hover:text-red-300"
          >
            <span>🧹</span>
          </button>
          <div className="mx-1 h-5 w-px bg-slate-800" />
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
          >
            👨‍🏫 Masuk Guru
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar (Select tool at top, scrollable) */}
        <aside
          data-toolbar
          className="flex shrink-0 items-start justify-center border-r border-slate-700/60 bg-slate-900/90 p-1.5"
          aria-label="Toolbar Gambar"
          style={{ zIndex: 10 }}
        >
          <ToolBar
            activeTool={activeTool}
            color={color}
            strokeWidth={strokeWidth}
            onToolChange={setActiveTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
          />
        </aside>

        {/* Main Matte Blackboard Canvas + Transparent 3D/Graph Overlay */}
        <main
          className="relative flex-1 overflow-hidden bg-[#2d333f]"
          aria-label="Papan tulis pribadi"
        >
          <WhiteboardCanvas
            boardState={boardState}
            onEvent={handleEvent}
            width={canvasSize.width}
            height={canvasSize.height}
            showGrid
            readOnly={false}
            activeTool={activeTool}
            color={color}
            strokeWidth={strokeWidth}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            stageRef={stageRef}
          />

          {/* Live Transparent Tongchuang 3D Solids & 2D Graphs on top of the board */}
          <div ref={overlayContainerRef} className="pointer-events-none absolute inset-0 z-10">
            <WhiteboardOverlay
              boardState={boardState}
              width={canvasSize.width}
              height={canvasSize.height}
              defaultWidgetSize={320}
              tongchuangMode={true}
              onDeleteObject={handleDeleteOverlayObject}
              onDuplicateObject={handleDuplicateOverlayObject}
              onExplainObject={(obj) => setExplainObj(obj)}
            />
          </div>

          {/* Signature Tongchuang Floating White Bottom Dock (Screenshots 2 & 3) */}
          <div
            data-testid="tongchuang-bottom-dock"
            className="pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 select-none"
          >
            <button
              type="button"
              onClick={() => setShow3dModal(true)}
              className="flex h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-xl transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              <span>🧊</span>
              <span className="hidden sm:inline">Studio 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGraphModal(true)}
              className="flex h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <span>📈</span>
              <span className="hidden sm:inline">Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTemplatesModal(true)}
              className="flex h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-xl transition hover:-translate-y-0.5 hover:bg-amber-50"
            >
              <span>📚</span>
              <span className="hidden sm:inline">Template</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="flex h-11 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-xl transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <span>📝</span>
              <span className="hidden sm:inline">Ringkasan</span>
            </button>
          </div>
        </main>
      </div>

      {/* Signature iFLYTEK Tongchuang Floating White Circular AI Radial Wheel */}
      <TongchuangRadialWheel
        activeTool={activeTool}
        color={color}
        strokeWidth={strokeWidth}
        canUndo={history.past.length > 0}
        isListeningVoice={voice.isListening}
        onToolChange={setActiveTool}
        onColorChange={setColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={handleUndo}
        onInsertSolid={handleInsertSolidOnBoard}
        onOpenFormulaGraph={() => setShowFormulaModal(true)}
        onToggleVoice={() => setShowVoiceBar((v) => !v)}
        onOpenSummary={() => setShowSummaryModal(true)}
        onOpenTemplates={() => setShowTemplatesModal(true)}
      />

      {/* Voice / Text Command Pill (P15-T02) */}
      {showVoiceBar && (
        <VoiceCommandBar
          isSupported={voice.isSupported}
          isListening={voice.isListening}
          lastTranscript={voice.lastTranscript}
          onStartListening={voice.startListening}
          onStopListening={voice.stopListening}
          onSubmitCommand={voice.executeTextCommand}
          onClose={() => setShowVoiceBar(false)}
        />
      )}

      {/* Formula -> Dynamic Graph Modal (P14-T02/T03) */}
      {showFormulaModal && (
        <FormulaToGraphModal
          onConfirm={handleInsertGraphOnBoard}
          onClose={() => setShowFormulaModal(false)}
        />
      )}

      {/* Micro-Lesson Summary Modal (P16-T01/T02) */}
      {showSummaryModal && (
        <LessonSummaryModal
          boardState={boardState}
          history={history}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {/* Template Picker Modal */}
      <TemplatePickerModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Contextual AI Explain Modal for 3D Overlay Objects */}
      {explainObj && (
        <AiExplainModal target={explainObj} onClose={() => setExplainObj(null)} />
      )}

      {/* Fullscreen 3D Studio Modal */}
      {show3dModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-[#2d333f] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/90 px-6 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">🧊</span>
                <h3 className="font-bold text-white">Studio 3D Interaktif (Irisan, Jaring-Jaring & Pisah Sisi)</h3>
              </div>
              <div className="flex items-center gap-2">
                {(["cube", "cuboid", "pyramid", "prism", "cylinder", "cone", "sphere"] as SolidType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSolidParams(DEFAULT_SOLID_PARAMS[st])}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                      solidParams.type === st
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {SOLID_LABELS[st].split(" ")[0]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShow3dModal(false)}
                  className="ml-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Tutup &times;
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden p-6">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                  </div>
                }
              >
                <TongchuangSolidWidget
                  id="studio-modal-solid"
                  params={solidParams}
                  label={SOLID_LABELS[solidParams.type]}
                  selected={true}
                  onCloseToolbar={() => setShow3dModal(false)}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* 2D Graph Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <h3 className="font-bold">Grafik 2D Fungsi Matematika</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGraphModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Tutup &times;
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                  </div>
                }
              >
                <GraphViewer />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
