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
  WhiteboardEvent,
  WhiteboardHistory,
} from "@ai-classroom/whiteboard-core";
import type { SolidParams, SolidType } from "@ai-classroom/geometry-core";
import type { LessonTemplate } from "@ai-classroom/curriculum-schema";
import type Konva from "konva";
import type { ToolType } from "@/hooks/useWhiteboardTool";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";
import { ToolBar } from "@/components/whiteboard/ToolBar";
import { FormulaToGraphModal } from "@/components/whiteboard/FormulaToGraphModal";
import { VoiceCommandBar } from "@/components/whiteboard/VoiceCommandBar";
import { LessonSummaryModal } from "@/components/whiteboard/LessonSummaryModal";
import { TemplateDrawer } from "@/components/whiteboard/TemplateDrawer";
import type { VisualTemplateItem } from "@/lib/realWorldTemplates";
import { AITeachingDrawer } from "@/components/whiteboard/AITeachingDrawer";
import { FunActivityModal } from "@/components/whiteboard/FunActivityModal";
import { ConnectDeviceModal } from "@/components/room/ConnectDeviceModal";
import { RemotePeerBridge, generatePairingCode } from "@/lib/remotePeerBridge";
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
  const [color, setColor] = useState("#0f172a");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const stageRef = useRef<Konva.Stage | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);

  const [show3dModal, setShow3dModal] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showVoiceBar, setShowVoiceBar] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showCatalogPopover, setShowCatalogPopover] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showFunModal, setShowFunModal] = useState(false);
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteCode] = useState(() => generatePairingCode());
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteLaser, setRemoteLaser] = useState<{ nx: number; ny: number } | null>(null);
  const [isBlanked, setIsBlanked] = useState(false);
  const [solidParams, setSolidParams] = useState<SolidParams>({ type: "cube", s: 4 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function update() {
      const isMobile = window.innerWidth < 768;
      setCanvasSize({
        width: Math.max(320, isMobile ? window.innerWidth : window.innerWidth - 56),
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
      } else if (e.key.toLowerCase() === "h") {
        setActiveTool("hand");
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
    // Update refs synchronously so back-to-back commitEvent calls never read stale state
    boardStateRef.current = result.state;
    historyRef.current = result.history;
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  const handleUndo = useCallback(() => {
    const result = historyUndo(boardStateRef.current, historyRef.current);
    boardStateRef.current = result.state;
    historyRef.current = result.history;
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  const handleRedo = useCallback(() => {
    const result = historyRedo(boardStateRef.current, historyRef.current);
    boardStateRef.current = result.state;
    historyRef.current = result.history;
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  // Dual-Transport Mobile Remote Bridge (works in Mode Tanpa Login!)
  useEffect(() => {
    const bridge = new RemotePeerBridge(remoteCode, "desktop");
    const unsub = bridge.onMessage((msg) => {
      setRemoteConnected(true);
      const p = msg.payload ?? {};
      switch (msg.type) {
        case "ping":
          bridge.send("pong");
          break;
        case "laser_move":
          if (typeof p.nx === "number" && typeof p.ny === "number") {
            setRemoteLaser({ nx: p.nx, ny: p.ny });
          }
          break;
        case "laser_off":
          setRemoteLaser(null);
          break;
        case "solid_orbit":
          window.dispatchEvent(
            new CustomEvent("ai-classroom:remote-solid", {
              detail: { kind: "orbit", dAzimuth: p.dAzimuth, dPolar: p.dPolar },
            }),
          );
          break;
        case "solid_action":
          window.dispatchEvent(
            new CustomEvent("ai-classroom:remote-solid", {
              detail: { kind: "action", action: p.action },
            }),
          );
          break;
        case "remote_stroke":
          if (Array.isArray(p.points) && p.points.length >= 2) {
            const pts = (p.points as [number, number][]).map(([nx, ny]) => [
              nx * Math.max(400, window.innerWidth - 56),
              ny * Math.max(300, window.innerHeight - 56),
              0.5,
            ] as [number, number, number]);
            handleEvent({
              event_type: "stroke.committed",
              payload: {
                id: `remote-stroke-${Date.now()}`,
                points: pts,
                color: String(p.color ?? "#0f172a"),
                width: 3,
                tool: "pen",
              },
            });
          }
          break;
        case "undo":
          handleUndo();
          break;
        case "redo":
          handleRedo();
          break;
        case "blank":
          setIsBlanked(true);
          break;
        case "unblank":
          setIsBlanked(false);
          break;
      }
    });
    return () => {
      unsub();
      bridge.close();
    };
  }, [remoteCode, handleEvent, handleUndo, handleRedo]);

  // -------------------------------------------------------------------------
  // Insert live 3D Solid & 2D Graph directly onto the chalkboard
  // -------------------------------------------------------------------------
  const handleInsertMathBlock = useCallback(
    (initialLatex = "8^2") => {
      const id = `math-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const existingCount = Object.keys(boardStateRef.current.scenes[boardStateRef.current.active_scene_id]?.objects ?? {}).length;
      const offset = (existingCount % 5) * 36;
      const bx = Math.max(80, Math.round(canvasSize.width * 0.14) + offset);
      const by = Math.max(80, Math.round(canvasSize.height * 0.18) + offset);
      handleEvent({
        event_type: "object.created",
        payload: {
          id,
          object_type: "math_block",
          props: { x: bx, y: by, w: 320, h: 120, latex: initialLatex },
        },
      });
    },
    [canvasSize, handleEvent]
  );

  const handleInsertVisualTemplate = useCallback(
    (item: VisualTemplateItem, dropClientPos?: { x: number; y: number }) => {
      let cx = Math.max(220, Math.round(canvasSize.width / 2));
      let cy = Math.max(180, Math.round(canvasSize.height / 2));
      const existingCount = Object.keys(
        boardStateRef.current.scenes[boardStateRef.current.active_scene_id]?.objects ?? {}
      ).length;

      if (dropClientPos && stageRef.current) {
        const stage = stageRef.current;
        const rect = stage.container().getBoundingClientRect();
        const scale = stage.scaleX() || 1;
        cx = (dropClientPos.x - rect.left - stage.x()) / scale;
        cy = (dropClientPos.y - rect.top - stage.y()) / scale;
      } else {
        const cascade = (existingCount % 5) * 28;
        cx += cascade;
        cy += cascade;
      }

      const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      if (item.action.kind === "shape2d") {
        const t = item.action.objectType;
        const baseProps: Record<string, unknown> = {
          stroke: color,
          strokeWidth,
          fill: "transparent",
          ...item.action.props,
        };
        if (t === "rect") {
          const w = Number(baseProps.w ?? 120);
          const h = Number(baseProps.h ?? 90);
          baseProps.x = cx - w / 2;
          baseProps.y = cy - h / 2;
        } else if (t === "triangle") {
          baseProps.x1 = cx;
          baseProps.y1 = cy - 55;
          baseProps.x2 = cx + 65;
          baseProps.y2 = cy + 50;
          baseProps.x3 = cx - 65;
          baseProps.y3 = cy + 50;
        } else if (t === "circle") {
          baseProps.x = cx;
          baseProps.y = cy;
        } else {
          baseProps.cx = cx;
          baseProps.cy = cy;
        }
        handleEvent({
          event_type: "object.created",
          payload: { id, object_type: t, props: baseProps },
        });
        setActiveTool("select");
      } else {
        const sType = item.action.solidType;
        handleEvent({
          event_type: "object.created",
          payload: {
            id,
            object_type: "viz_solid",
            props: {
              solid_type: sType,
              extended_kind: item.action.extendedKind,
              texture_preset: item.action.texturePreset,
              compound_parts: item.action.compoundParts,
              extra_params: item.action.extraParams,
              params: DEFAULT_SOLID_PARAMS[sType] ?? { type: "cube", s: 4 },
              label: item.action.label,
              x: Math.max(24, Math.round(cx - 160)),
              y: Math.max(24, Math.round(cy - 160)),
              w: 320,
              h: 320,
            },
          },
        });
      }
    },
    [canvasSize, color, strokeWidth, handleEvent]
  );

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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-white text-slate-900">
      <FpsMeter />

      {/* Top Navbar (Always-White Theme) */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-xs font-extrabold text-white shadow-sm"
          >
            AI
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">AI Smart Whiteboard</span>
            <span className="hidden sm:inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
              Mode Tanpa Login
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="open-catalog-btn"
            onClick={() => setShowCatalogPopover((v) => !v)}
            className={`h-9 whitespace-nowrap rounded-lg border px-3.5 text-[13px] font-medium transition ${
              showCatalogPopover
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            Template
          </button>
          <button
            type="button"
            data-testid="insert-math-block-btn"
            onClick={() => handleInsertMathBlock("8^2")}
            className="h-9 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Rumus
          </button>
          <button
            type="button"
            data-testid="open-remote-modal-btn"
            onClick={() => setShowRemoteModal(true)}
            className={`h-9 whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium transition ${
              remoteConnected
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="Hubungkan Remote HP (QR / Kode 6 Digit / Link)"
          >
            {remoteConnected ? "HP Aktif" : "Remote HP"}
          </button>
          <button
            type="button"
            data-testid="open-ai-drawer-btn"
            onClick={() => setShowAiDrawer((v) => !v)}
            className={`h-9 whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium transition ${
              showAiDrawer
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-violet-50 hover:text-violet-700"
            }`}
          >
            Asisten AI
          </button>
          <button
            type="button"
            onClick={() => setShowVoiceBar((v) => !v)}
            className={`hidden lg:inline-flex h-9 items-center whitespace-nowrap rounded-lg border px-3 text-[13px] font-medium transition ${
              showVoiceBar
                ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Suara AI
          </button>
          <button
            type="button"
            data-testid="open-fun-activity-btn"
            onClick={() => setShowFunModal(true)}
            className="hidden xl:inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
          >
            Aktivitas
          </button>
          <button
            type="button"
            onClick={handleExportPng}
            className="hidden lg:inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Simpan PNG
          </button>
          <button
            type="button"
            onClick={handleClearBoard}
            className="hidden xl:inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Bersihkan
          </button>
          <div className="hidden sm:block mx-0.5 h-5 w-px bg-slate-200" />
          <Link
            to="/login"
            className="hidden sm:inline-flex h-9 items-center whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 text-[13px] font-semibold text-white shadow-xs transition hover:bg-indigo-500 active:scale-95"
          >
            Masuk Guru
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar — Desktop & Tablet only (hidden on <768px mobile where Bottom Thumb Dock takes over) */}
        <aside
          data-toolbar
          className="hidden md:flex shrink-0 items-start justify-center border-r border-slate-200 bg-slate-50 p-1.5"
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

        {/* Main White Canvas (includes single Tongchuang 3D/Graph Overlay & Right-Click AI Radial Wheel) */}
        <main
          ref={overlayContainerRef}
          className="relative flex-1 overflow-hidden bg-white select-none"
          style={{ touchAction: "none" }}
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
            onToolChange={setActiveTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            isListeningVoice={voice.isListening}
            onInsertSolid={handleInsertSolidOnBoard}
            onOpenFormulaGraph={() => setShowFormulaModal(true)}
            onToggleVoice={() => setShowVoiceBar((v) => !v)}
            onOpenSummary={() => setShowSummaryModal(true)}
            onOpenTemplates={() => setShowTemplatesModal(true)}
            remoteLaser={remoteLaser}
            stageRef={stageRef}
          />

          {/* Mobile Bottom Thumb Dock (< 768px) — thumb-reachable core tools */}
          <div
            data-testid="mobile-thumb-dock"
            className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex md:hidden -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-xl backdrop-blur-md select-none"
          >
            {(
              [
                ["select", "↖", "Pilih"],
                ["hand", "✋", "Geser"],
                ["pen", "✏️", "Pena"],
                ["eraser", "⌫", "Hapus"],
              ] as const
            ).map(([t, icon, lbl]) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTool(t)}
                aria-label={lbl}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-base transition ${
                  activeTool === t ? "bg-indigo-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {icon}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCatalogPopover((v) => !v)}
              aria-label="Katalog 2D/3D"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-base text-indigo-700 bg-indigo-50"
            >
              🧊
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.past.length === 0}
              aria-label="Undo"
              className="flex h-10 w-9 items-center justify-center rounded-xl text-sm text-slate-600 disabled:opacity-35"
            >
              ↩
            </button>
          </div>

          {/* Signature Tongchuang Floating White Bottom Dock (Desktop/Tablet >= 768px) */}
          <div
            data-testid="tongchuang-bottom-dock"
            className="pointer-events-auto absolute bottom-4 left-1/2 z-30 hidden md:flex -translate-x-1/2 items-center gap-2 select-none"
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
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <span>Grafik</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              <span>Ringkasan</span>
            </button>
          </div>
        </main>
      </div>

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

      {/* Fullscreen 3D Studio Modal (Always-White Theme) */}
      {show3dModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="relative flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">🧊</span>
                <h3 className="font-bold text-slate-900">Studio 3D Interaktif (Irisan, Jaring-Jaring & Pisah Sisi)</h3>
              </div>
              <div className="flex items-center gap-2">
                {(["cube", "cuboid", "pyramid", "prism", "cylinder", "cone", "sphere"] as SolidType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSolidParams(DEFAULT_SOLID_PARAMS[st])}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition ${
                      solidParams.type === st
                        ? "bg-indigo-600 text-white"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {SOLID_LABELS[st].split(" ")[0]}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShow3dModal(false)}
                  className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
      {/* Right Slide-Out Visual Card Template Drawer (Drag-and-Drop + 1-Click Insert) */}
      <TemplateDrawer
        open={showCatalogPopover}
        onClose={() => setShowCatalogPopover(false)}
        onInsertTemplate={handleInsertVisualTemplate}
      />

      {/* AI Teaching Assistant Slide-Over Drawer (Problem-Chain, Socratic, RPP) */}
      <AITeachingDrawer
        open={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        onInsertSolid={handleInsertSolidOnBoard}
        onInsertMathBlock={handleInsertMathBlock}
      />

      {/* AI Fun Teaching Activity Modal */}
      <FunActivityModal open={showFunModal} onClose={() => setShowFunModal(false)} />

      {/* Dual-Transport Phone Remote Pairing Modal (QR + 6-Digit Code + Link) */}
      <ConnectDeviceModal
        serverlessCode={remoteCode}
        remoteConnected={remoteConnected}
        open={showRemoteModal}
        onClose={() => setShowRemoteModal(false)}
      />

      {/* Blank Screen Overlay (triggered from Mobile Remote) */}
      {isBlanked && (
        <div
          onClick={() => setIsBlanked(false)}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-slate-950/95 text-slate-400 cursor-pointer"
        >
          <span className="text-4xl mb-2">⬛</span>
          <p className="text-sm font-medium">Layar Papan Tulis Diredam (Klik di mana saja untuk membuka)</p>
        </div>
      )}
    </div>
  );
}
