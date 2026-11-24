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
  AIWhiteboardStep,
  SimulationTemplateId,
} from "@ai-classroom/whiteboard-core";
import type { SolidParams, SolidType } from "@ai-classroom/geometry-core";
import type { LessonTemplate } from "@ai-classroom/curriculum-schema";
import type Konva from "konva";
import type { ToolType } from "@/hooks/useWhiteboardTool";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";
import { FormulaToGraphModal } from "@/components/whiteboard/FormulaToGraphModal";
import { VoiceCommandBar } from "@/components/whiteboard/VoiceCommandBar";
import { LessonSummaryModal } from "@/components/whiteboard/LessonSummaryModal";
import { TemplateDrawer } from "@/components/whiteboard/TemplateDrawer";
import type { VisualTemplateItem } from "@/lib/realWorldTemplates";
import { AITeachingDrawer } from "@/components/whiteboard/AITeachingDrawer";
import { FunActivityModal } from "@/components/whiteboard/FunActivityModal";
import { PhETSimulationModal } from "@/components/whiteboard/PhETSimulationWidget";
import { QuizLauncherModal } from "@/components/classroom/QuizLauncherModal";
import { KnowledgeExplorerModal } from "@/components/whiteboard/KnowledgeExplorerModal";
import { LayersPanel } from "@/components/whiteboard/LayersPanel";
import { ExcalidrawToolbar } from "@/components/whiteboard/ExcalidrawToolbar";
import { ExcalidrawPropertiesPanel } from "@/components/whiteboard/ExcalidrawPropertiesPanel";
import {
  ExcalidrawCommandPalette,
  MermaidToDiagramModal,
  type CommandPaletteAction,
} from "@/components/whiteboard/ExcalidrawCommandPalette";
import {
  DEFAULT_EXCALIDRAW_STYLE,
  computeAlignedDeltas,
  computeDistributedDeltas,
  exportBasicSceneToSvg,
  type AlignAction,
  type DistributeAction,
  type ExcalidrawStyleState,
  type MermaidDiagramResult,
} from "@/lib/excalidrawEngine";
import { getItemBBox } from "@/lib/selectionHitTest";
import { ConnectDeviceModal } from "@/components/room/ConnectDeviceModal";
import { RemotePeerBridge, generatePairingCode } from "@/lib/remotePeerBridge";
import { saveBoardOffline, appendReplayEvent } from "@/lib/offlineSync";
import { putMediaAsset } from "@/lib/mediaStore";
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
  const [showPhetModal, setShowPhetModal] = useState(false);
  const [phetInitialSimId, setPhetInitialSimId] = useState<string | undefined>(undefined);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);

  // V6 Excalidraw Full Feature Set State (Toolbar Lock, Style Inspector, Zen, Dark Canvas, Grid Snap, Command Palette, Mermaid)
  const [excalidrawStyle, setExcalidrawStyle] = useState<ExcalidrawStyleState>(DEFAULT_EXCALIDRAW_STYLE);
  const [copiedStyle, setCopiedStyle] = useState<ExcalidrawStyleState | null>(null);
  const [toolLocked, setToolLocked] = useState(false);
  const [gridSnap, setGridSnap] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [darkCanvas, setDarkCanvas] = useState(false);
  const [showPropsPanel, setShowPropsPanel] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMermaidModal, setShowMermaidModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [remoteCode] = useState(() => generatePairingCode());
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteLaser, setRemoteLaser] = useState<{ nx: number; ny: number } | null>(null);
  const [isBlanked, setIsBlanked] = useState(false);
  const [solidParams, setSolidParams] = useState<SolidParams>({ type: "cube", s: 4 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function update() {
      setCanvasSize({
        width: Math.max(320, window.innerWidth),
        height: Math.max(300, window.innerHeight - (zenMode ? 0 : 52)),
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [zenMode]);

  // Global Excalidraw-style Keyboard Shortcuts (1-9, 0, Q, H, V, R, D, O, A, L, P, T, E, F, K, Ctrl+K, Alt+Z, Alt+Shift+D)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.tagName?.toLowerCase() === "math-field" ||
        Boolean(target?.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
        return;
      }
      if (e.altKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setZenMode((v) => !v);
        return;
      }
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDarkCanvas((v) => !v);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        setGridSnap((v) => !v);
        return;
      }
      if (inInput || e.ctrlKey || e.metaKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === "q") setToolLocked((v) => !v);
      else if (k === "h") setActiveTool("hand");
      else if (k === "1" || k === "v") setActiveTool("select");
      else if (k === "2" || k === "r") setActiveTool("rect");
      else if (k === "3" || k === "d") setActiveTool("rhombus");
      else if (k === "4" || k === "o") setActiveTool("ellipse");
      else if (k === "5" || k === "a") setActiveTool("arrow");
      else if (k === "6" || k === "l") setActiveTool("line");
      else if (k === "7" || k === "p") setActiveTool("pen");
      else if (k === "8" || k === "t") setActiveTool("text");
      else if (k === "9") imageFileInputRef.current?.click();
      else if (k === "0" || k === "e") setActiveTool("eraser");
      else if (k === "f") setActiveTool("frame");
      else if (k === "k") setActiveTool("laser");
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
    // Offline-First PWA persistence (Dexie IndexedDB)
    void saveBoardOffline(PERSONAL_ROOM_ID, result.state);
    void appendReplayEvent(PERSONAL_ROOM_ID, event);
  }, []);

  // V5: 3-Way Image Ingestion (Upload, Global Ctrl+V Paste, Drag-and-Drop) -> Dexie mediaStore
  const handleIngestImageBlob = useCallback(
    async (blob: Blob, dropPos?: { x: number; y: number }, fileName?: string) => {
      const asset = await putMediaAsset(blob);
      const maxW = Math.min(asset.naturalWidth, Math.max(320, canvasSize.width * 0.65));
      const scale = maxW / Math.max(1, asset.naturalWidth);
      const w = Math.round(asset.naturalWidth * scale);
      const h = Math.round(asset.naturalHeight * scale);
      const cx = dropPos ? dropPos.x : Math.round(canvasSize.width / 2);
      const cy = dropPos ? dropPos.y : Math.round(canvasSize.height / 2);
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      handleEvent({
        event_type: "object.created",
        payload: {
          id,
          object_type: "image",
          props: {
            assetId: asset.assetId,
            cx,
            cy,
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
            rotation: 0,
            opacity: 1,
            locked: false,
            zLayer: "normal",
            aspectLocked: true,
            label: fileName || "Gambar Sketsa",
          },
        },
      });
      setActiveTool("select");
    },
    [canvasSize.width, canvasSize.height, handleEvent],
  );

  // Global Ctrl+V / Cmd+V clipboard image paste (ignored in text/math inputs)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active?.tagName?.toLowerCase() === "math-field" ||
        (active as HTMLElement | null)?.isContentEditable
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleIngestImageBlob(file, undefined, file.name || "Tempel Gambar");
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleIngestImageBlob]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleInsertSimulation = useCallback(
    (templateId: SimulationTemplateId, config: Record<string, unknown> = {}, pos?: [number, number]) => {
      const id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      handleEvent({
        event_type: "object.created",
        payload: {
          id,
          object_type: "simulation",
          props: {
            template_id: templateId,
            config,
            x: pos ? pos[0] : Math.max(120, Math.round(canvasSize.width / 2 - 180)),
            y: pos ? pos[1] : Math.max(80, Math.round(canvasSize.height / 2 - 155)),
            w: 360,
            h: 310,
          },
        },
      });
    },
    [canvasSize, handleEvent]
  );

  const handleExecuteAIStep = useCallback(
    (step: AIWhiteboardStep) => {
      if (step.type === "speak_caption") {
        setAiCaption(step.text);
        setTimeout(() => setAiCaption((cur) => (cur === step.text ? null : cur)), 6500);
      } else if (step.type === "spawn_math_block") {
        handleEvent({
          event_type: "object.created",
          payload: {
            id: `${step.id}-${Date.now()}`,
            object_type: "math_block",
            props: { x: step.pos[0], y: step.pos[1], w: 320, h: 120, latex: step.latex },
          },
        });
      } else if (step.type === "spawn_simulation") {
        handleInsertSimulation(step.templateId, step.config, step.pos);
      } else if (step.type === "spawn_solid3d") {
        handleEvent({
          event_type: "object.created",
          payload: {
            id: `${step.id}-${Date.now()}`,
            object_type: "viz_solid",
            props: {
              solid_type: step.solidType,
              params: { ...DEFAULT_SOLID_PARAMS[step.solidType], ...step.params, type: step.solidType },
              label: step.label ?? SOLID_LABELS[step.solidType],
              x: step.pos[0],
              y: step.pos[1],
              w: 320,
              h: 320,
            },
          },
        });
      } else if (step.type === "spawn_shape2d") {
        const [cx, cy] = step.pos;
        const w = Number(step.params.w ?? 120);
        const h = Number(step.params.h ?? 100);
        const props =
          step.shapeType === "triangle"
            ? { x1: cx, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2, x3: cx - w / 2, y3: cy + h / 2, stroke: "#0f172a", strokeWidth: 3, fill: "transparent" }
            : step.shapeType === "circle"
              ? { x: cx, y: cy, r: Number(step.params.r ?? 54), stroke: "#0f172a", strokeWidth: 3, fill: "transparent" }
              : { x: cx - w / 2, y: cy - h / 2, w, h, stroke: "#0f172a", strokeWidth: 3, fill: "transparent" };
        handleEvent({
          event_type: "object.created",
          payload: { id: `${step.id}-${Date.now()}`, object_type: step.shapeType, props },
        });
      }
    },
    [handleEvent, handleInsertSimulation]
  );

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

  function handleExportSvg() {
    const scene = boardStateRef.current.scenes[boardStateRef.current.active_scene_id];
    const items = [
      ...Object.values(scene?.objects ?? {}).map((o) => {
        const p = o.props as Record<string, unknown>;
        return {
          type: o.object_type,
          x: Number(p.x ?? 0),
          y: Number(p.y ?? 0),
          w: Number(p.w ?? 100),
          h: Number(p.h ?? 60),
          x1: Number(p.x1 ?? 0),
          y1: Number(p.y1 ?? 0),
          x2: Number(p.x2 ?? 100),
          y2: Number(p.y2 ?? 100),
          r: Number(p.r ?? 40),
          cx: Number(p.cx ?? 0),
          cy: Number(p.cy ?? 0),
          rx: Number(p.rx ?? 50),
          ry: Number(p.ry ?? 35),
          stroke: String(p.stroke ?? "#1e1e1e"),
          fill: String(p.fill ?? "none"),
          strokeWidth: Number(p.strokeWidth ?? 2),
          text: String(p.text ?? p.label ?? ""),
        };
      }),
      ...Object.values(scene?.strokes ?? {}).map((s) => ({
        type: "stroke",
        points: s.points,
        stroke: s.color,
        strokeWidth: s.width,
      })),
    ];
    const svg = exportBasicSceneToSvg(items, canvasSize.width, canvasSize.height, darkCanvas ? "#020617" : "#ffffff");
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.svg`;
    a.click();
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(boardStateRef.current, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.excalidraw.json`;
    a.click();
  }

  const handleChangeExcalidrawStyle = useCallback(
    (patch: Partial<ExcalidrawStyleState>) => {
      setExcalidrawStyle((prev) => {
        const next = { ...prev, ...patch };
        if (patch.strokeColor) setColor(patch.strokeColor);
        if (patch.strokeWidth) setStrokeWidth(patch.strokeWidth);
        return next;
      });
      if (selectedIds.length > 0) {
        const propsPatch: Record<string, unknown> = {};
        if (patch.strokeColor !== undefined) propsPatch.stroke = patch.strokeColor;
        if (patch.backgroundColor !== undefined) propsPatch.fill = patch.backgroundColor;
        if (patch.fillStyle !== undefined) propsPatch.fillStyle = patch.fillStyle;
        if (patch.strokeWidth !== undefined) propsPatch.strokeWidth = patch.strokeWidth;
        if (patch.strokeStyle !== undefined) propsPatch.strokeStyle = patch.strokeStyle;
        if (patch.roughness !== undefined) propsPatch.roughness = patch.roughness;
        if (patch.roundness !== undefined) propsPatch.roundness = patch.roundness;
        if (patch.opacity !== undefined) propsPatch.opacity = patch.opacity;
        if (patch.fontFamily !== undefined) propsPatch.fontFamily = patch.fontFamily;
        if (Object.keys(propsPatch).length > 0) {
          handleEvent({
            event_type: "batch",
            payload: {
              events: selectedIds.map((id) => ({
                event_type: "object.updated",
                payload: { id, props_patch: propsPatch },
              })),
            },
          });
        }
      }
    },
    [selectedIds, handleEvent],
  );

  const handleAlignSelected = useCallback(
    (action: AlignAction) => {
      const scene = boardStateRef.current.scenes[boardStateRef.current.active_scene_id];
      const boxes = selectedIds
        .map((id) => {
          const b = getItemBBox(id, scene);
          return b ? { id, ...b } : null;
        })
        .filter((x): x is { id: string; x: number; y: number; w: number; h: number } => x !== null);
      const deltas = computeAlignedDeltas(boxes, action);
      const events: WhiteboardEvent[] = [];
      for (const [id, d] of Object.entries(deltas)) {
        const obj = scene.objects[id];
        if (!obj || (d.dx === 0 && d.dy === 0)) continue;
        const p = { ...(obj.props as Record<string, unknown>) };
        if (typeof p.x === "number") p.x += d.dx;
        if (typeof p.y === "number") p.y += d.dy;
        if (typeof p.cx === "number") p.cx += d.dx;
        if (typeof p.cy === "number") p.cy += d.dy;
        events.push({ event_type: "object.updated", payload: { id, props_patch: p } });
      }
      if (events.length > 0) handleEvent({ event_type: "batch", payload: { events } });
    },
    [selectedIds, handleEvent],
  );

  const handleDistributeSelected = useCallback(
    (axis: DistributeAction) => {
      const scene = boardStateRef.current.scenes[boardStateRef.current.active_scene_id];
      const boxes = selectedIds
        .map((id) => {
          const b = getItemBBox(id, scene);
          return b ? { id, ...b } : null;
        })
        .filter((x): x is { id: string; x: number; y: number; w: number; h: number } => x !== null);
      const deltas = computeDistributedDeltas(boxes, axis);
      const events: WhiteboardEvent[] = [];
      for (const [id, d] of Object.entries(deltas)) {
        const obj = scene.objects[id];
        if (!obj || (d.dx === 0 && d.dy === 0)) continue;
        const p = { ...(obj.props as Record<string, unknown>) };
        if (typeof p.x === "number") p.x += d.dx;
        if (typeof p.y === "number") p.y += d.dy;
        if (typeof p.cx === "number") p.cx += d.dx;
        if (typeof p.cy === "number") p.cy += d.dy;
        events.push({ event_type: "object.updated", payload: { id, props_patch: p } });
      }
      if (events.length > 0) handleEvent({ event_type: "batch", payload: { events } });
    },
    [selectedIds, handleEvent],
  );

  const handleInsertMermaidDiagram = useCallback(
    (diagram: MermaidDiagramResult) => {
      const events: WhiteboardEvent[] = [];
      const ts = Date.now();
      for (const n of diagram.nodes) {
        if (n.shape === "rect") {
          events.push({
            event_type: "object.created",
            payload: {
              id: `mm-${ts}-${n.id}`,
              object_type: "rect",
              props: {
                x: n.x,
                y: n.y,
                w: n.w,
                h: n.h,
                stroke: "#1e1e1e",
                strokeWidth: 2,
                fill: n.bgColor,
                fillStyle: "hachure",
                roughness: 1,
                roundness: "round",
                label: n.label,
              },
            },
          });
        } else if (n.shape === "rhombus") {
          events.push({
            event_type: "object.created",
            payload: {
              id: `mm-${ts}-${n.id}`,
              object_type: "rhombus",
              props: {
                cx: n.x + n.w / 2,
                cy: n.y + n.h / 2,
                rx: n.w / 2,
                ry: n.h / 2,
                stroke: "#1e1e1e",
                strokeWidth: 2,
                fill: n.bgColor,
                roughness: 1,
                label: n.label,
              },
            },
          });
        } else {
          events.push({
            event_type: "object.created",
            payload: {
              id: `mm-${ts}-${n.id}`,
              object_type: "ellipse",
              props: {
                cx: n.x + n.w / 2,
                cy: n.y + n.h / 2,
                rx: n.w / 2,
                ry: n.h / 2,
                stroke: "#1e1e1e",
                strokeWidth: 2,
                fill: n.bgColor,
                roughness: 1,
                label: n.label,
              },
            },
          });
        }
      }
      for (let i = 0; i < diagram.edges.length; i++) {
        const e = diagram.edges[i];
        events.push({
          event_type: "object.created",
          payload: {
            id: `mme-${ts}-${i}`,
            object_type: "arrow",
            props: {
              x1: e.x1,
              y1: e.y1,
              x2: e.x2,
              y2: e.y2,
              stroke: "#1e1e1e",
              strokeWidth: 2,
              label: e.label,
            },
          },
        });
      }
      if (events.length > 0) {
        handleEvent({ event_type: "batch", payload: { events } });
        setActiveTool("select");
      }
    },
    [handleEvent],
  );

  const commandActions: CommandPaletteAction[] = [
    { id: "mermaid", label: "Mermaid → Diagram Flowchart", category: "Excalidraw", run: () => setShowMermaidModal(true) },
    { id: "zen", label: zenMode ? "Keluar Zen Mode" : "Aktifkan Zen Mode (Tanpa Gangguan)", category: "Tampilan", shortcut: "Alt+Z", run: () => setZenMode((v) => !v) },
    { id: "dark", label: darkCanvas ? "Tema Kanvas Terang" : "Tema Kanvas Gelap (Dark Mode)", category: "Tampilan", shortcut: "Alt+Shift+D", run: () => setDarkCanvas((v) => !v) },
    { id: "snap", label: gridSnap ? "Matikan Snap ke Grid (20px)" : "Aktifkan Snap ke Grid (20px)", category: "Kanvas", shortcut: "Ctrl+'", run: () => setGridSnap((v) => !v) },
    { id: "props", label: showPropsPanel ? "Sembunyikan Panel Properti" : "Tampilkan Panel Properti Gaya", category: "Tampilan", run: () => setShowPropsPanel((v) => !v) },
    { id: "svg", label: "Ekspor Kanvas ke SVG Vektor", category: "Ekspor", run: handleExportSvg },
    { id: "png", label: "Ekspor Kanvas ke PNG", category: "Ekspor", run: handleExportPng },
    { id: "json-exp", label: "Simpan Scene (.excalidraw.json)", category: "Ekspor", run: handleExportJson },
    { id: "json-imp", label: "Buka / Impor Scene JSON", category: "Impor", run: () => jsonImportInputRef.current?.click() },
    { id: "remote", label: "Hubungkan Remote HP", category: "Alat", run: () => setShowRemoteModal(true) },
    { id: "voice", label: "Toggle Perintah Suara AI", category: "AI", run: () => setShowVoiceBar((v) => !v) },
    { id: "fun", label: "Aktivitas Mengajar Interaktif", category: "Kelas", run: () => setShowFunModal(true) },
    { id: "clear", label: "Bersihkan Seluruh Papan", category: "Kanvas", run: handleClearBoard },
  ];

  const handleSelectTemplate = useCallback((template: LessonTemplate) => {
    if (template.boardState) {
      setBoardState(template.boardState as unknown as BoardState);
      setShowTemplatesModal(false);
    }
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-white text-slate-900">
      <FpsMeter />

      {/* Top Navbar (Streamlined — Zero Clipping on 1280px+, hidden in Zen Mode) */}
      {!zenMode && (
      <header className={`z-20 flex h-13 shrink-0 items-center justify-between border-b px-3 shadow-xs backdrop-blur-md transition-colors ${darkCanvas ? "border-slate-800 bg-slate-900/95 text-slate-100" : "border-slate-200 bg-white/95 text-slate-900"}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/login"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-xs font-extrabold text-white shadow-sm"
          >
            AI
          </Link>
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap">AI Smart Whiteboard</span>
            <span className="hidden lg:inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 whitespace-nowrap">
              {isOnline ? "PWA Siap" : "Offline"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="open-catalog-btn"
            onClick={() => setShowCatalogPopover((v) => !v)}
            className={`h-8 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition ${
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
            onClick={() => handleInsertMathBlock("y = sin(x), 0 <= x <= 2\\pi")}
            className="h-8 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Rumus
          </button>
          <button
            type="button"
            data-testid="upload-image-btn"
            onClick={() => imageFileInputRef.current?.click()}
            className="hidden sm:inline-flex h-8 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
            title="Unggah Gambar atau tekan Ctrl+V"
          >
            Gambar
          </button>
          <button
            type="button"
            data-testid="open-layers-btn"
            onClick={() => setShowLayersPanel((v) => !v)}
            className={`h-8 whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium transition ${
              showLayersPanel
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Lapisan
          </button>
          <Link
            to="/notes"
            data-testid="nav-notes-link"
            className="inline-flex h-8 items-center whitespace-nowrap rounded-lg border border-sky-200 bg-sky-50 px-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
          >
            Catatan
          </Link>
          <button
            type="button"
            data-testid="open-ai-drawer-btn"
            onClick={() => setShowAiDrawer((v) => !v)}
            className={`h-8 whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium transition ${
              showAiDrawer
                ? "border-violet-600 bg-violet-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-violet-50 hover:text-violet-700"
            }`}
          >
            Asisten AI
          </button>
          <button
            type="button"
            data-testid="open-command-palette-btn"
            onClick={() => setShowCommandPalette(true)}
            title="Command Palette & Menu Excalidraw (Ctrl+K)"
            className="h-8 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            ⌘ Menu
          </button>
          <Link
            to="/login"
            className="hidden sm:inline-flex h-8 items-center whitespace-nowrap rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-500"
          >
            Masuk Guru
          </Link>
        </div>
      </header>
      )}

      {/* Hidden inputs for Image Upload & Excalidraw JSON Import */}
      <input
        ref={imageFileInputRef}
        data-testid="upload-image-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          files.forEach((f) => void handleIngestImageBlob(f, undefined, f.name));
          e.target.value = "";
        }}
      />
      <input
        ref={jsonImportInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          file.text().then((txt) => {
            try {
              const parsed = JSON.parse(txt) as BoardState;
              if (parsed && parsed.scenes && parsed.active_scene_id) {
                setBoardState(parsed);
                boardStateRef.current = parsed;
              }
            } catch {
              // ignore invalid JSON
            }
          });
          e.target.value = "";
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main White/Dark Canvas (Excalidraw Top-Center Dock + Left Properties Panel + 3D/Math Overlay) */}
        <main
          ref={overlayContainerRef}
          className="relative flex-1 overflow-hidden bg-white select-none"
          style={{ touchAction: "none" }}
          aria-label="Papan tulis pribadi"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
            if (files.length === 0) return;
            e.preventDefault();
            const rect = overlayContainerRef.current?.getBoundingClientRect();
            const x = rect ? e.clientX - rect.left : canvasSize.width / 2;
            const y = rect ? e.clientY - rect.top : canvasSize.height / 2;
            files.forEach((f, idx) => void handleIngestImageBlob(f, { x: x + idx * 30, y: y + idx * 30 }, f.name));
          }}
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
            excalidrawStyle={excalidrawStyle}
            toolLocked={toolLocked}
            gridSnap={gridSnap}
            darkCanvas={darkCanvas}
            onSelectionChange={setSelectedIds}
          />

          {/* Excalidraw Top-Center Floating Tool Dock (Desktop/Tablet) */}
          <div className="pointer-events-none absolute top-3 left-1/2 z-30 hidden md:flex -translate-x-1/2 items-center gap-2">
            <ExcalidrawToolbar
              activeTool={activeTool}
              toolLocked={toolLocked}
              darkCanvas={darkCanvas}
              onSelectTool={setActiveTool}
              onToggleLock={() => setToolLocked((v) => !v)}
              onInsertImage={() => imageFileInputRef.current?.click()}
              onOpenMermaid={() => setShowMermaidModal(true)}
              onOpenCommandPalette={() => setShowCommandPalette(true)}
            />
          </div>

          {/* Zen Mode Floating Exit Pill */}
          {zenMode && (
            <button
              type="button"
              onClick={() => setZenMode(false)}
              className="fixed top-3 right-3 z-40 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg"
            >
              Keluar Zen Mode (Alt+Z)
            </button>
          )}

          {/* Excalidraw Left Floating Properties Panel */}
          {!zenMode && (
            <ExcalidrawPropertiesPanel
              open={showPropsPanel && (selectedIds.length > 0 || (activeTool !== "select" && activeTool !== "hand" && activeTool !== "eraser" && activeTool !== "laser"))}
              style={excalidrawStyle}
              selectedCount={selectedIds.length}
              hasCopiedStyle={Boolean(copiedStyle)}
              darkCanvas={darkCanvas}
              onChangeStyle={handleChangeExcalidrawStyle}
              onAlign={handleAlignSelected}
              onDistribute={handleDistributeSelected}
              onCopyStyle={() => setCopiedStyle({ ...excalidrawStyle })}
              onPasteStyle={() => copiedStyle && handleChangeExcalidrawStyle(copiedStyle)}
              onDuplicate={() => {
                const scene = boardStateRef.current.scenes[boardStateRef.current.active_scene_id];
                const events: WhiteboardEvent[] = [];
                selectedIds.forEach((id) => {
                  const o = scene.objects[id];
                  if (!o) return;
                  const p = o.props as Record<string, unknown>;
                  events.push({
                    event_type: "object.created",
                    payload: {
                      id: `${id}-dup-${Date.now()}`,
                      object_type: o.object_type,
                      props: {
                        ...p,
                        ...(typeof p.x === "number" ? { x: p.x + 28 } : {}),
                        ...(typeof p.y === "number" ? { y: p.y + 28 } : {}),
                        ...(typeof p.cx === "number" ? { cx: p.cx + 28 } : {}),
                        ...(typeof p.cy === "number" ? { cy: p.cy + 28 } : {}),
                      },
                    },
                  });
                });
                if (events.length > 0) handleEvent({ event_type: "batch", payload: { events } });
              }}
              onDelete={() => {
                if (selectedIds.length === 0) return;
                handleEvent({
                  event_type: "batch",
                  payload: {
                    events: selectedIds.map((id) => ({ event_type: "object.deleted", payload: { id } })),
                  },
                });
                setSelectedIds([]);
              }}
              onClose={() => setShowPropsPanel(false)}
            />
          )}

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
              data-testid="open-phet-btn"
              onClick={() => {
                setPhetInitialSimId(undefined);
                setShowPhetModal(true);
              }}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-50"
            >
              <span>Lab Virtual</span>
            </button>
            <button
              type="button"
              data-testid="open-quiz-btn"
              onClick={() => setShowQuizModal(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              <span>Kuis</span>
            </button>
            <button
              type="button"
              data-testid="open-knowledge-btn"
              onClick={() => setShowKnowledgeModal(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 text-xs font-semibold text-slate-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              <span>Peta Konsep</span>
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

      {/* AI Teaching Assistant Slide-Over Drawer (OpenMAIC Drawing, Problem-Chain, Socratic, RPP) */}
      <AITeachingDrawer
        open={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        onInsertSolid={handleInsertSolidOnBoard}
        onInsertMathBlock={handleInsertMathBlock}
        onExecuteAIStep={handleExecuteAIStep}
      />

      {/* OpenMAIC Live AI Narration Caption Pill */}
      {aiCaption && (
        <div
          data-testid="ai-narration-caption"
          className="fixed top-16 left-1/2 z-40 max-w-xl -translate-x-1/2 rounded-2xl border border-indigo-200 bg-indigo-950/92 px-4 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-md"
        >
          {aiCaption}
        </div>
      )}

      {/* Official PhET Interactive Simulations & POE Experiment Mode */}
      <PhETSimulationModal
        open={showPhetModal}
        initialSimId={phetInitialSimId}
        onClose={() => setShowPhetModal(false)}
      />

      {/* AI Classroom Quiz & Live Poll */}
      <QuizLauncherModal
        open={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onShowExplanationOnBoard={(latex) => handleInsertMathBlock(latex)}
      />

      {/* AI Knowledge Explorer Concept Graph */}
      <KnowledgeExplorerModal
        open={showKnowledgeModal}
        onClose={() => setShowKnowledgeModal(false)}
        onInsertFormula={(latex) => handleInsertMathBlock(latex)}
        onInsertSolid={(st) => handleInsertSolidOnBoard(st)}
        onInsertSimulation={(tid) => handleInsertSimulation(tid)}
        onOpenPhET={(simId) => {
          setPhetInitialSimId(simId);
          setShowPhetModal(true);
        }}
      />

      {/* V5 Layers Panel (unlock/visibility/opacity management for tracing images & objects) */}
      <LayersPanel
        open={showLayersPanel}
        objects={Object.values(boardState.scenes[boardState.active_scene_id]?.objects ?? {})}
        selectedIds={[]}
        onClose={() => setShowLayersPanel(false)}
        onSelect={() => setActiveTool("select")}
        onUpdateProps={(id, patch) =>
          handleEvent({
            event_type: "object.updated",
            payload: { id, props_patch: patch },
          })
        }
        onDelete={(id) =>
          handleEvent({
            event_type: "object.deleted",
            payload: { id },
          })
        }
      />

      {/* Excalidraw Command Palette (Ctrl+K) & Mermaid-to-Diagram Modal */}
      <ExcalidrawCommandPalette
        open={showCommandPalette}
        actions={commandActions}
        onClose={() => setShowCommandPalette(false)}
      />
      <MermaidToDiagramModal
        open={showMermaidModal}
        onInsert={handleInsertMermaidDiagram}
        onClose={() => setShowMermaidModal(false)}
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
