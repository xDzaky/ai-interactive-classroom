/**
 * WhiteboardCanvas — Figma-quality drawing engine
 *
 * Architecture (no infinite loop):
 * - Props (activeTool, color, strokeWidth) are stored in refs → used directly in
 *   pointer handlers WITHOUT any useEffect sync. This eliminates the
 *   "Maximum update depth exceeded" loop.
 * - Live preview uses IMPERATIVE Konva layer (previewLayerRef.batchDraw()) →
 *   zero React setState on pointer move → no drawing lag.
 * - Stroke accumulation lives in plain refs (strokePointsRef, dragStartRef) →
 *   no React state involved until the stroke is committed.
 * - Sketch recognition fires on pointerUp for pen tool.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Arrow } from "react-konva";
import Konva from "konva";
import { getStroke } from "perfect-freehand";
import type {
  BoardState,
  BoardObject,
  BoardStroke,
  WhiteboardEvent,
} from "@ai-classroom/whiteboard-core";
import { getActiveScene, applyEvent } from "@ai-classroom/whiteboard-core";
import type { ToolType } from "@/hooks/useWhiteboardTool";
import { ViewportController } from "@/lib/viewport";
import { GridBackground } from "@/components/whiteboard/GridBackground";
import { reducePoints } from "@/lib/strokePath";
import { StrokeNode } from "./objects/StrokeNode";
import {
  RenderObject,
  generateEllipsePoints,
  generateRegularPolygonPoints,
  generateRhombusPoints,
  generateStarPoints,
} from "./objects/RenderObject";
import {
  recognizeShape as recognizeShapeV2,
  recognizeMultiStroke3D,
  clusterRecentStrokes,
  type Pt,
  type ShapeCandidate,
  type TimedStroke,
  type MultiStroke3DResult,
  computeBBox,
} from "@ai-classroom/sketch-core";
import { TouchGestureEngine } from "@/lib/touchGestureEngine";
import {
  ShapeSuggestionChip,
  ShapeRevertToast,
} from "@/components/whiteboard/ShapeSuggestionChip";
import type { AutoShapeMode } from "@/components/whiteboard/ToolBar";
import { WhiteboardOverlay } from "./WhiteboardOverlay";
import {
  findHitItem,
  findItemsInMarquee,
  getItemBBox,
} from "@/lib/selectionHitTest";
import {
  resolveActions,
  WHITEBOARD_ACTIONS,
  is2DConvertible,
  getPrimarySelected,
  type ActionContext,
} from "@/features/whiteboard/actionRegistry";
import { TongchuangRadialWheel } from "@/components/whiteboard/TongchuangRadialWheel";
import { SelectionToolbar } from "@/components/whiteboard/SelectionToolbar";
import {
  getShapeVertices,
  getShapeHandles,
  findHitResizeHandle,
  computeResizedProps,
  insertVertexAtPoint,
  type ResizeHandleKind,
  type BBox,
} from "@/lib/resizeHandles";
import { ShapeToSolidMenu } from "@/components/whiteboard/ShapeToSolidMenu";
import {
  createConvertShapeToSolidEvent,
  type SolidProposal,
  type Input2DShape,
} from "@/lib/shapeToSolid";
import { AiExplainModal } from "@/components/whiteboard/AiExplainModal";
import {
  extractBaseProfile2D,
  mergeProfiles2DUnion,
  normalizeProfile2D,
  type SolidType,
  type SolidParams,
  type CompoundSolidPart,
} from "@ai-classroom/geometry-core";
import { WORLD_UNITS_PER_CM } from "@/lib/shapeToSolid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhiteboardCanvasProps {
  boardState: BoardState;
  onBoardStateChange?: (state: BoardState) => void;
  /** @deprecated backward-compat — callers that only have onEvent still work */
  onEvent?: (event: WhiteboardEvent) => void;
  roomId?: string;
  actorId?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  readOnly?: boolean;
  stageRef?: React.RefObject<Konva.Stage | null>;
  activeTool?: ToolType;
  color?: string;
  strokeWidth?: number;
  onToolChange?: (tool: ToolType) => void;
  onColorChange?: (color: string) => void;
  onStrokeWidthChange?: (w: number) => void;
  autoShapeMode?: AutoShapeMode;
  onAutoShapeModeChange?: (mode: AutoShapeMode) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isListeningVoice?: boolean;
  onInsertSolid?: (solidType: SolidType) => void;
  onOpenFormulaGraph?: () => void;
  onToggleVoice?: () => void;
  onOpenSummary?: () => void;
  onOpenTemplates?: () => void;
  remoteLaser?: { nx: number; ny: number } | null;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

// ---------------------------------------------------------------------------
// perfect-freehand helpers
// ---------------------------------------------------------------------------

function getSvgPathPoints(
  pts: [number, number, number][],
  width: number,
): number[] {
  if (pts.length < 2) return [];
  const freehand = getStroke(pts, {
    size: width * 2.2,
    thinning: 0.55,
    smoothing: 0.5,
    streamline: 0.45,
    easing: (t: number) => Math.sin((t * Math.PI) / 2),
    simulatePressure: pts[0][2] < 0.1,
  });
  return freehand.flatMap(([x, y]) => [x, y]);
}

function strokeToPoints(stroke: BoardStroke): number[] {
  return getSvgPathPoints(stroke.points, stroke.width);
}

function perpendicularDistance(
  p: [number, number, number],
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function ramerDouglasPeucker(
  pts: [number, number, number][],
  epsilon: number,
): [number, number, number][] {
  if (pts.length < 3) return pts;
  let dmax = 0;
  let index = 0;
  const end = pts.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(pts[i], pts[0], pts[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }
  if (dmax > epsilon) {
    const recResults1 = ramerDouglasPeucker(pts.slice(0, index + 1), epsilon);
    const recResults2 = ramerDouglasPeucker(pts.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  }
  return [pts[0], pts[end]];
}

// ---------------------------------------------------------------------------
// Sketch recognition — pen strokes → clean shapes
// ---------------------------------------------------------------------------

type RecognizedShape =
  | { type: "none" }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "circle"; cx: number; cy: number; r: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "triangle"; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }
  | { type: "rhombus"; cx: number; cy: number; rx: number; ry: number }
  | { type: "pentagon"; cx: number; cy: number; r: number }
  | { type: "hexagon"; cx: number; cy: number; r: number }
  | { type: "star"; cx: number; cy: number; outerR: number; innerR: number };

function legacyRecognizeShape(pts: [number, number, number][]): RecognizedShape {
  if (pts.length < 5) return { type: "none" };

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  if (bboxW < 12 && bboxH < 12) return { type: "none" };

  const first = pts[0];
  const last = pts[pts.length - 1];
  const strokeLen = Math.hypot(last[0] - first[0], last[1] - first[1]);
  const pathLen = pts.reduce((sum, p, i) => {
    if (i === 0) return sum;
    return sum + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
  }, 0);

  // --- Line (open stroke) ---
  const maxDeviation = pts.reduce((max, p) => {
    if (strokeLen < 1) return max;
    const d =
      Math.abs(
        (last[1] - first[1]) * p[0] -
          (last[0] - first[0]) * p[1] +
          last[0] * first[1] -
          last[1] * first[0],
      ) / strokeLen;
    return Math.max(max, d);
  }, 0);

  if (strokeLen > 25 && maxDeviation / Math.max(strokeLen, 1) < 0.08 && strokeLen / pathLen > 0.88) {
    return { type: "line", x1: first[0], y1: first[1], x2: last[0], y2: last[1] };
  }

  // --- Closed shape check ---
  const startEndDist = Math.hypot(last[0] - first[0], last[1] - first[1]);
  const isClosed = startEndDist < Math.max(bboxW, bboxH) * 0.45 || startEndDist < 40;
  if (!isClosed) return { type: "none" };

  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  const radii = pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy));
  const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
  const maxRDev = Math.max(...radii.map((r) => Math.abs(r - avgR)));
  const stdDevR = Math.sqrt(radii.reduce((s, r) => s + Math.pow(r - avgR, 2), 0) / radii.length);
  const aspect = bboxW / Math.max(bboxH, 1);

  // --- Circle ---
  if (stdDevR / Math.max(avgR, 1) < 0.16 && aspect >= 0.78 && aspect <= 1.28 && avgR > 10) {
    return { type: "circle", cx, cy, r: (bboxW + bboxH) / 4 };
  }

  // --- Ellipse (elongated) ---
  const rx = bboxW / 2;
  const ry = bboxH / 2;
  if (rx > 10 && ry > 10 && (aspect < 0.75 || aspect > 1.33)) {
    const normErrors = pts.map((p) =>
      Math.abs(Math.pow((p[0] - cx) / rx, 2) + Math.pow((p[1] - cy) / ry, 2) - 1),
    );
    const avgNormError = normErrors.reduce((a, b) => a + b, 0) / normErrors.length;
    if (avgNormError < 0.28) {
      return { type: "ellipse", cx, cy, rx, ry };
    }
  }

  // --- Polygon detection using Ramer-Douglas-Peucker (RDP) ---
  const epsilon = Math.max(bboxW, bboxH) * 0.08;
  const rdpPoints = ramerDouglasPeucker(pts, epsilon);

  // Filter corners: remove closing point if close to first point
  const corners: [number, number, number][] = [];
  for (let i = 0; i < rdpPoints.length; i++) {
    const pt = rdpPoints[i];
    if (i === rdpPoints.length - 1 && Math.hypot(pt[0] - rdpPoints[0][0], pt[1] - rdpPoints[0][1]) < 25) {
      continue;
    }
    if (
      corners.length === 0 ||
      Math.hypot(pt[0] - corners[corners.length - 1][0], pt[1] - corners[corners.length - 1][1]) >
        Math.max(bboxW, bboxH) * 0.12
    ) {
      corners.push(pt);
    }
  }

  // 1. Triangle (3 corners)
  if (corners.length === 3) {
    return {
      type: "triangle",
      x1: corners[0][0],
      y1: corners[0][1],
      x2: corners[1][0],
      y2: corners[1][1],
      x3: corners[2][0],
      y3: corners[2][1],
    };
  }

  // 2. 4 corners: Rhombus (Belah Ketupat) vs Rectangle
  if (corners.length === 4) {
    const diamondPoints = [
      { x: cx, y: minY },
      { x: maxX, y: cy },
      { x: cx, y: maxY },
      { x: minX, y: cy },
    ];
    const isDiamond = corners.every((c) =>
      diamondPoints.some((dp) => Math.hypot(c[0] - dp.x, c[1] - dp.y) < Math.max(bboxW, bboxH) * 0.28),
    );

    if (isDiamond) {
      return { type: "rhombus", cx, cy, rx: bboxW / 2, ry: bboxH / 2 };
    }
    return { type: "rect", x: minX, y: minY, w: bboxW, h: bboxH };
  }

  // 3. 5 corners: Star vs Pentagon
  if (corners.length === 5) {
    let peakCount = 0;
    for (let i = 1; i < radii.length - 1; i++) {
      if (radii[i] > radii[i - 1] && radii[i] > radii[i + 1] && radii[i] > avgR * 1.15) {
        peakCount++;
      }
    }
    if (peakCount >= 4) {
      return { type: "star", cx, cy, outerR: Math.max(bboxW, bboxH) / 2, innerR: Math.max(bboxW, bboxH) / 4.5 };
    }
    return { type: "pentagon", cx, cy, r: Math.max(bboxW, bboxH) / 2 };
  }

  // 4. 6 corners: Hexagon
  if (corners.length === 6) {
    return { type: "hexagon", cx, cy, r: Math.max(bboxW, bboxH) / 2 };
  }

  // Fallback rectangle check
  const bboxPerimeter = 2 * (bboxW + bboxH);
  if (pathLen / bboxPerimeter > 0.8 && pathLen / bboxPerimeter < 1.25 && bboxW > 20 && bboxH > 20) {
    return { type: "rect", x: minX, y: minY, w: bboxW, h: bboxH };
  }

  return { type: "none" };
}

function candidateToShapeEvent(
  id: string,
  cand: ShapeCandidate,
  strokeColor: string,
  strokeWidth: number,
): WhiteboardEvent {
  const sw = Math.max(strokeWidth, 2);
  const geom = cand.geometry;

  if (cand.kind === 'line') {
    const g = geom as { type: 'line'; a: Pt; b: Pt };
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: 'line',
        props: {
          x1: g.a.x,
          y1: g.a.y,
          x2: g.b.x,
          y2: g.b.y,
          stroke: strokeColor,
          strokeWidth: sw,
        },
      },
    };
  }

  if (cand.kind === 'circle') {
    const g = geom as { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number };
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: 'circle',
        props: {
          x: g.cx,
          y: g.cy,
          r: g.rx,
          stroke: strokeColor,
          strokeWidth: sw,
          fill: 'transparent',
        },
      },
    };
  }

  if (cand.kind === 'ellipse') {
    const g = geom as { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number };
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: 'ellipse',
        props: {
          cx: g.cx,
          cy: g.cy,
          rx: g.rx,
          ry: g.ry,
          stroke: strokeColor,
          strokeWidth: sw,
          fill: 'transparent',
        },
      },
    };
  }

  if (cand.kind === 'rect' || cand.kind === 'square') {
    const g = geom as { type: 'polygon'; points: Pt[] };
    const polyBox = computeBBox(g.points);
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: 'rect',
        props: {
          x: polyBox.minX,
          y: polyBox.minY,
          w: polyBox.width,
          h: polyBox.height,
          stroke: strokeColor,
          strokeWidth: sw,
          fill: 'transparent',
        },
      },
    };
  }

  if (cand.kind === 'triangle' || cand.kind === 'right_triangle') {
    const g = geom as { type: 'polygon'; points: Pt[] };
    const pts = g.points;
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: 'triangle',
        props: {
          x1: pts[0]?.x ?? 0,
          y1: pts[0]?.y ?? 0,
          x2: pts[1]?.x ?? 0,
          y2: pts[1]?.y ?? 0,
          x3: pts[2]?.x ?? 0,
          y3: pts[2]?.y ?? 0,
          stroke: strokeColor,
          strokeWidth: sw,
          fill: 'transparent',
        },
      },
    };
  }

  if (cand.kind === 'rhombus') {
    const g = geom as { type: 'polygon'; points: Pt[] };
    const b = computeBBox(g.points);
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: 'rhombus',
        props: {
          cx: b.centerX,
          cy: b.centerY,
          rx: b.width / 2,
          ry: b.height / 2,
          stroke: strokeColor,
          strokeWidth: sw,
          fill: 'transparent',
        },
      },
    };
  }

  if (cand.kind === 'pentagon' || cand.kind === 'hexagon') {
    const g = geom as { type: 'polygon'; points: Pt[] };
    const b = computeBBox(g.points);
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: cand.kind,
        props: {
          cx: b.centerX,
          cy: b.centerY,
          r: Math.max(b.width, b.height) / 2,
          stroke: strokeColor,
          strokeWidth: sw,
          fill: 'transparent',
        },
      },
    };
  }

  if (cand.kind === 'star') {
    const g = geom as { type: 'polygon'; points: Pt[] };
    const b = computeBBox(g.points);
    return {
      event_type: 'object.created',
      payload: {
        id,
        object_type: 'star',
        props: {
          cx: b.centerX,
          cy: b.centerY,
          outerR: Math.max(b.width, b.height) / 2,
          innerR: Math.max(b.width, b.height) / 4.5,
          stroke: strokeColor,
          strokeWidth: sw,
          fill: 'transparent',
        },
      },
    };
  }

  // Fallback to rect
  const b = computeBBox((geom as { type: 'polygon'; points: Pt[] }).points || []);
  return {
    event_type: 'object.created',
    payload: {
      id,
      object_type: 'rect',
      props: {
        x: b.minX,
        y: b.minY,
        w: b.width,
        h: b.height,
        stroke: strokeColor,
        strokeWidth: sw,
        fill: 'transparent',
      },
    },
  };
}

// ---------------------------------------------------------------------------
// WhiteboardCanvas
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.05;
const MAX_SCALE = 20;
const ZOOM_STEP = 1.12;
const DEFAULT_ROOM_ID = "personal-sandbox";
const DEFAULT_ACTOR_ID = "guest-me";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function WhiteboardCanvas({
  boardState,
  onBoardStateChange,
  onEvent: legacyOnEvent,
  roomId = DEFAULT_ROOM_ID,
  actorId = DEFAULT_ACTOR_ID,
  width = 800,
  height = 600,
  showGrid = true,
  readOnly = false,
  stageRef: externalStageRef,
  activeTool = "pen",
  color = "#0f172a",
  strokeWidth = 3,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  autoShapeMode,
  onAutoShapeModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isListeningVoice,
  onInsertSolid,
  onOpenFormulaGraph,
  onToggleVoice,
  onOpenSummary,
  onOpenTemplates,
  remoteLaser = null,
}: WhiteboardCanvasProps) {
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = externalStageRef ?? internalStageRef;
  const previewLayerRef = useRef<Konva.Layer | null>(null);
  const uiLayerRef = useRef<Konva.Layer | null>(null);
  const lastTouchDist = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Auto-shape recognition state & hold tracker (P10-T11)
  // ---------------------------------------------------------------------------
  const [autoShapeModeState, setAutoShapeModeState] = useState<AutoShapeMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("whiteboard_autoshape_mode");
      if (saved === "auto" || saved === "hold" || saved === "off") return saved;
    }
    return autoShapeMode ?? "auto";
  });

  useEffect(() => {
    if (autoShapeMode) {
      setAutoShapeModeState(autoShapeMode);
    }
  }, [autoShapeMode]);

  const [suggestionChip, setSuggestionChip] = useState<{
    visible: boolean;
    strokeId: string;
    candidate: ShapeCandidate | null;
    position: { x: number; y: number };
    color: string;
    width: number;
  }>({
    visible: false,
    strokeId: "",
    candidate: null,
    position: { x: 0, y: 0 },
    color: "#f8fafc",
    width: 3,
  });

  const [revertToast, setRevertToast] = useState<{
    visible: boolean;
    shapeKind: string;
  }>({
    visible: false,
    shapeKind: "",
  });

  const lastSnappedRef = useRef<{
    shapeId: string;
    originalPoints: [number, number, number][];
    color: string;
    width: number;
    timestamp: number;
  } | null>(null);

  const pointerHoldRef = useRef<{
    startPos: { x: number; y: number };
    startTime: number;
  }>({
    startPos: { x: 0, y: 0 },
    startTime: 0,
  });

  // ---------------------------------------------------------------------------
  // Imperative Viewport Controller (P10-T03: zero React re-render on zoom/pan)
  // ---------------------------------------------------------------------------
  const viewportController = useMemo(
    () => new ViewportController({ minScale: MIN_SCALE, maxScale: MAX_SCALE }),
    [],
  );
  const [zoomDisplay, setZoomDisplay] = useState(100);

  useEffect(() => {
    viewportController.attachStage(stageRef.current);
    let timer: any = null;
    const unsub = viewportController.subscribe((v) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setZoomDisplay(Math.round(v.scale * 100));
      }, 120);
    });
    return () => {
      clearTimeout(timer);
      unsub();
      viewportController.destroy();
    };
  }, [viewportController, stageRef]);

  // ---------------------------------------------------------------------------
  // KEY FIX: Store mutable tool/color/strokeWidth in refs — NO useEffect sync.
  // Pointer handlers always read the latest value from refs without causing
  // re-renders or dependency cycles.
  // ---------------------------------------------------------------------------
  const activeToolRef = useRef<ToolType>(activeTool);
  activeToolRef.current = activeTool; // updated every render, no effect needed

  const colorRef = useRef<string>(color);
  colorRef.current = color;

  const strokeWidthRef = useRef<number>(strokeWidth);
  strokeWidthRef.current = strokeWidth;

  // Drawing state refs — no React state, no re-renders during drawing
  const isPointerDown = useRef(false);
  const livePointsRef = useRef<[number, number, number][]>([]);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeIdRef = useRef<string>("");

  const scene = getActiveScene(boardState);

  // ── Interactive Selection & Context Menu state (P10-T02, P11-T02) ─────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [convert3DShape, setConvert3DShape] = useState<Input2DShape | null>(null);
  const [explainTarget, setExplainTarget] = useState<BoardObject | BoardStroke | null>(null);
  const [dynamicCursor, setDynamicCursor] = useState<string | null>(null);
  const isHandPanning = useRef(false);
  const handPanLast = useRef<{ x: number; y: number } | null>(null);
  const activeResizeRef = useRef<{
    id: string;
    handle: ResizeHandleKind;
    origBBox: BBox;
    origProps: Record<string, unknown>;
  } | null>(null);

  // Always-fresh refs so pointer handlers NEVER suffer from stale closures
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;

  const isMarquee = useRef(false);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);
  const isDraggingSelection = useRef(false);
  const dragSelectionStart = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<any>(null);

  // ---------------------------------------------------------------------------
  // Commit event (dispatch to board state)
  // ---------------------------------------------------------------------------
  const commitEvent = useCallback(
    (event: WhiteboardEvent) => {
      if (legacyOnEvent) {
        legacyOnEvent(event);
        return;
      }
      if (onBoardStateChange) {
        const [newState] = applyEvent(boardState, event);
        onBoardStateChange(newState);
      }
    },
    [legacyOnEvent, onBoardStateChange, boardState],
  );
  const commitEventRef = useRef(commitEvent);
  commitEventRef.current = commitEvent;

  // Helper: translate any mix of selected 2D objects & freehand strokes smoothly by (dx, dy)
  const translateSelectedLive = useCallback((dx: number, dy: number) => {
    const curScene = sceneRef.current;
    const ids = selectedIdsRef.current;
    const commit = commitEventRef.current;
    if (ids.length === 0) return;

    const events: WhiteboardEvent[] = [];
    for (const id of ids) {
      const obj = curScene.objects[id];
      if (obj) {
        const props = { ...(obj.props as Record<string, unknown>) };
        if (Array.isArray(props.customPoints)) {
          props.customPoints = (props.customPoints as number[]).map((v, i) =>
            i % 2 === 0 ? v + dx : v + dy
          );
        } else {
          if (typeof props.x === "number") props.x += dx;
          if (typeof props.y === "number") props.y += dy;
          if (typeof props.cx === "number") props.cx += dx;
          if (typeof props.cy === "number") props.cy += dy;
          if (typeof props.x1 === "number") {
            props.x1 += dx;
            props.y1 = (props.y1 as number) + dy;
            props.x2 = (props.x2 as number) + dx;
            props.y2 = (props.y2 as number) + dy;
            if (typeof props.x3 === "number") {
              props.x3 += dx;
              props.y3 = (props.y3 as number) + dy;
            }
          }
        }
        events.push({
          event_type: "object.updated",
          payload: { id, props_patch: props },
        } as unknown as WhiteboardEvent);
        continue;
      }
      const stroke = curScene.strokes[id];
      if (stroke) {
        events.push({
          event_type: "object.updated",
          payload: {
            id,
            props_patch: {
              points: stroke.points.map(([px, py, pr]) => [px + dx, py + dy, pr]),
            },
          },
        } as unknown as WhiteboardEvent);
      }
    }

    if (events.length === 1) {
      commit(events[0]);
    } else if (events.length > 1) {
      commit({ event_type: "batch", payload: { events } });
    }
  }, []);

  const selectionBBox = useMemo(() => {
    if (selectedIds.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of selectedIds) {
      const b = getItemBBox(id, scene);
      if (b) {
        minX = Math.min(minX, b.x);
        minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w);
        maxY = Math.max(maxY, b.y + b.h);
      }
    }
    if (!isFinite(minX)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [selectedIds, scene]);

  const actionContext: ActionContext = useMemo(
    () => ({
      selectedIds,
      scene,
      boardState,
      roomId,
      actorId,
      onEvent: commitEvent,
      onOpenConvert3D: (shape) => setConvert3DShape(shape),
      onOpenAiExplain: (target) => setExplainTarget(target),
      onClearSelection: () => setSelectedIds([]),
    }),
    [selectedIds, scene, boardState, roomId, actorId, commitEvent]
  );

  const resolvedActions = useMemo(
    () => resolveActions(actionContext),
    [actionContext]
  );

  // Auto-detect mergeable 2D shape group: either 2+ selected 2D shapes OR 1 selected 2D shape touching/near adjacent 2D shapes (<= 24px)
  const mergeable2DIds = useMemo(() => {
    const is2D = (sid: string) => {
      const o = scene.objects[sid];
      return Boolean(
        o &&
          o.object_type !== "viz_solid" &&
          o.object_type !== "viz_graph" &&
          o.object_type !== "math_block" &&
          o.object_type !== "text" &&
          o.object_type !== "line" &&
          o.object_type !== "arrow",
      );
    };
    const sel2D = selectedIds.filter(is2D);
    if (sel2D.length >= 2) return sel2D;
    if (sel2D.length === 1) {
      const baseId = sel2D[0];
      const baseBBox = getItemBBox(baseId, scene);
      if (!baseBBox) return [];
      const pad = 24;
      const nearby = Object.keys(scene.objects).filter((oid) => {
        if (oid === baseId || !is2D(oid)) return false;
        const ob = getItemBBox(oid, scene);
        if (!ob) return false;
        return (
          ob.x <= baseBBox.x + baseBBox.w + pad &&
          ob.x + ob.w >= baseBBox.x - pad &&
          ob.y <= baseBBox.y + baseBBox.h + pad &&
          ob.y + ob.h >= baseBBox.y - pad
        );
      });
      if (nearby.length > 0) return [baseId, ...nearby];
    }
    return [];
  }, [selectedIds, scene]);

  const toolbarScreenPos = useMemo(() => {
    if (!selectionBBox) return null;
    const centerWorldX = selectionBBox.x + selectionBBox.w / 2;
    const topWorldY = selectionBBox.y;
    return viewportController.toScreen(centerWorldX, topWorldY);
  }, [selectionBBox, viewportController, zoomDisplay]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const rect =
        typeof stage.container === "function"
          ? stage.container().getBoundingClientRect()
          : (stage as unknown as HTMLElement).getBoundingClientRect?.() ?? { left: 0, top: 0 };
      const worldPt = viewportController.toWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hitId = findHitItem(worldPt, scene);
      if (hitId) {
        if (!selectedIds.includes(hitId)) {
          setSelectedIds([hitId]);
        }
      }
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [stageRef, viewportController, scene, selectedIds]
  );

  const handleConvertProposal = useCallback(
    (proposal: SolidProposal) => {
      if (!convert3DShape) return;
      const solidEvent = createConvertShapeToSolidEvent(
        convert3DShape,
        proposal,
        roomId,
        actorId,
        uid()
      );
      // Atomic batch transaction (P10-T03 / P12-T03): one Ctrl+Z restores the original 2D sketch
      commitEvent({
        event_type: "batch",
        payload: {
          events: [
            {
              event_type: "object.deleted",
              payload: { id: convert3DShape.id },
            },
            solidEvent,
          ],
        },
      });
      setConvert3DShape(null);
      setSelectedIds([]);
    },
    [convert3DShape, roomId, actorId, commitEvent]
  );

  const handleSetSelectedColor = useCallback(
    (newColor: string) => {
      for (const id of selectedIds) {
        if (scene.objects[id]) {
          commitEvent({
            event_type: "object.updated",
            payload: { id, props_patch: { stroke: newColor, color: newColor } },
          } as unknown as WhiteboardEvent);
        } else if (scene.strokes[id]) {
          commitEvent({
            event_type: "object.updated",
            payload: { id, props_patch: { color: newColor } },
          } as unknown as WhiteboardEvent);
        }
      }
    },
    [selectedIds, scene, commitEvent]
  );

  // Multi-stroke 3D sketch recognition buffer & confirmation chip
  const recentStrokesRef = useRef<TimedStroke[]>([]);
  const [sketch3dChip, setSketch3dChip] = useState<{
    result: MultiStroke3DResult;
    screenPos: { x: number; y: number };
  } | null>(null);

  const handleAcceptSketch3D = useCallback(() => {
    if (!sketch3dChip) return;
    const { result } = sketch3dChip;
    const isCustom = result.kind === "custom_prism";
    const solidType = isCustom ? "prism" : (result.kind as SolidType);
    const solidParamsMap: Record<string, Record<string, unknown>> = {
      cube: { type: "cube", s: result.params.s ?? 4 },
      cuboid: { type: "cuboid", l: result.params.l ?? 5, w: result.params.w ?? 3, h: result.params.h ?? 3 },
      cylinder: { type: "cylinder", r: result.params.r ?? 2, h: result.params.h ?? 5 },
      cone: { type: "cone", r: result.params.r ?? 2.5, h: result.params.h ?? 5 },
      pyramid: { type: "pyramid", b: result.params.b ?? 4, h: result.params.h ?? 5 },
      prism: { type: "prism", a: 4, b: 4, c: 4, h: 5 },
      sphere: { type: "sphere", r: result.params.r ?? 3 },
    };
    const deleteEvents: WhiteboardEvent[] = result.strokeIds.map((sid) => ({
      event_type: "object.deleted",
      payload: { id: sid },
    }));
    const solidEvent: WhiteboardEvent = {
      event_type: "object.created",
      payload: {
        id: `solid3d-${uid()}`,
        object_type: "viz_solid",
        props: {
          solid_type: solidType,
          extended_kind: isCustom ? "custom_prism" : undefined,
          profile_points_cm: isCustom ? result.profilePoints : undefined,
          extra_params: isCustom ? { height: result.params.height ?? 3.5 } : undefined,
          params: solidParamsMap[solidType] ?? { type: "cube", s: 4 },
          label: result.label,
          x: Math.max(40, result.bbox.x),
          y: Math.max(40, result.bbox.y),
          w: Math.max(280, Math.min(380, result.bbox.w + 80)),
          h: Math.max(280, Math.min(380, result.bbox.h + 80)),
        },
      },
    };
    commitEventRef.current({
      event_type: "batch",
      payload: { events: [...deleteEvents, solidEvent] },
    });
    recentStrokesRef.current = [];
    setSketch3dChip(null);
  }, [sketch3dChip]);

  // Unified Mobile Touch Gesture State Machine (1x tap select, 2x tap radial wheel, long-press drag, 2-finger pinch zoom)
  const touchEngineRef = useRef<TouchGestureEngine | null>(null);
  useEffect(() => {
    const engine = new TouchGestureEngine({
      onSingleTap: (pt) => {
        const worldPt = viewportController.toWorld(pt.x, pt.y);
        const hitId = findHitItem(worldPt, sceneRef.current);
        const next = hitId ? [hitId] : [];
        selectedIdsRef.current = next;
        setSelectedIds(next);
      },
      onDoubleTap: (pt) => {
        const stage = stageRef.current;
        const rect = stage?.container?.().getBoundingClientRect() ?? { left: 0, top: 0 };
        const worldPt = viewportController.toWorld(pt.x, pt.y);
        const hitId = findHitItem(worldPt, sceneRef.current);
        if (hitId) {
          selectedIdsRef.current = [hitId];
          setSelectedIds([hitId]);
        }
        setContextMenu({ x: rect.left + pt.x, y: rect.top + pt.y });
      },
      onLongPressDragStart: (pt) => {
        const worldPt = viewportController.toWorld(pt.x, pt.y);
        const hitId = findHitItem(worldPt, sceneRef.current);
        if (hitId) {
          if (!selectedIdsRef.current.includes(hitId)) {
            selectedIdsRef.current = [hitId];
            setSelectedIds([hitId]);
          }
          isDraggingSelection.current = true;
          dragSelectionStart.current = { x: worldPt.x, y: worldPt.y };
        }
      },
      onLongPressDragMove: (_pt, dx, dy) => {
        if (!isDraggingSelection.current) return;
        const sc = Math.max(0.1, viewportController.getState().scale);
        translateSelectedLive(dx / sc, dy / sc);
      },
      onLongPressDragEnd: () => {
        isDraggingSelection.current = false;
        dragSelectionStart.current = null;
      },
      onPan: (dx, dy) => {
        const v = viewportController.getState();
        viewportController.set({ ...v, x: v.x + dx, y: v.y + dy });
      },
      onPinchZoom: (midX, midY, scaleFactor, panDx, panDy) => {
        viewportController.zoomAt(midX, midY, scaleFactor);
        if (panDx !== 0 || panDy !== 0) {
          viewportController.panBy(panDx, panDy);
        }
        setZoomDisplay(Math.round(viewportController.getState().scale * 100));
      },
    });
    touchEngineRef.current = engine;
    return () => {
      engine.dispose();
      touchEngineRef.current = null;
    };
  }, [viewportController, stageRef, translateSelectedLive]);

  const handleAcceptSuggestion = useCallback(() => {
    if (!suggestionChip.candidate) return;
    const shapeId = `${suggestionChip.strokeId}-shape`;
    const shapeEv = candidateToShapeEvent(
      shapeId,
      suggestionChip.candidate,
      suggestionChip.color,
      suggestionChip.width,
    );
    // Atomic batch: remove original freehand stroke AND add clean shape in one undoable step
    commitEvent({
      event_type: "batch",
      payload: {
        events: [
          {
            event_type: "object.deleted",
            payload: { id: suggestionChip.strokeId },
          },
          shapeEv,
        ],
      },
    });
    setSuggestionChip((prev) => ({ ...prev, visible: false }));
  }, [suggestionChip, commitEvent]);

  const handleRevertShape = useCallback(() => {
    const last = lastSnappedRef.current;
    if (!last) return;
    const strokeId = `${last.shapeId}-ink`;
    // Atomic batch: remove snapped shape AND restore original freehand stroke
    commitEvent({
      event_type: "batch",
      payload: {
        events: [
          {
            event_type: "object.deleted",
            payload: { id: last.shapeId },
          },
          {
            event_type: "stroke.committed",
            payload: {
              id: strokeId,
              points: reducePoints(last.originalPoints),
              color: last.color,
              width: last.width,
              tool: "pen",
            },
          },
        ],
      },
    });
    lastSnappedRef.current = null;
    setRevertToast({ visible: false, shapeKind: "" });
  }, [commitEvent]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts (Ctrl+Z/Y, Space)
  // ---------------------------------------------------------------------------
  const isSpaceDown = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space" && !e.repeat) {
        isSpaceDown.current = true;
        document.body.style.cursor = "grab";
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        onRedo?.();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const delAction = WHITEBOARD_ACTIONS.find((a) => a.id === "delete");
          if (delAction) delAction.run(actionContext);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const dupAction = WHITEBOARD_ACTIONS.find((a) => a.id === "duplicate");
          if (dupAction) dupAction.run(actionContext);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        if (activeToolRef.current === "select") {
          e.preventDefault();
          setSelectedIds([...scene.order]);
        }
      } else if (e.key === "Escape") {
        setSelectedIds([]);
        setContextMenu(null);
        setConvert3DShape(null);
        setExplainTarget(null);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceDown.current = false;
        document.body.style.cursor = "";
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onUndo, onRedo, selectedIds, actionContext, scene.order]);

  // ── Render Selection Boxes on uiLayer ─────────────────────────────────────
  useEffect(() => {
    const uiLayer = uiLayerRef.current;
    if (!uiLayer || typeof uiLayer.destroyChildren !== "function") return;

    uiLayer.destroyChildren();

    if (selectedIds.length > 0) {
      for (const id of selectedIds) {
        const obj = scene.objects[id];
        const bbox = getItemBBox(id, scene);
        if (!bbox) continue;

        // Shape-matched selection outline (triangle -> triangle, circle -> circle, polygon -> polygon!)
        if (obj) {
          const p = obj.props as Record<string, unknown>;
          const verts = getShapeVertices(obj);

          if (verts && verts.length >= 6) {
            uiLayer.add(
              new Konva.Line({
                points: verts,
                closed: true,
                stroke: "#4f46e5",
                strokeWidth: 1.8,
                dash: [6, 3],
                listening: false,
              })
            );
          } else if (obj.object_type === "circle") {
            uiLayer.add(
              new Konva.Circle({
                x: Number(p.x ?? bbox.x + bbox.w / 2),
                y: Number(p.y ?? bbox.y + bbox.h / 2),
                radius: Number(p.r ?? p.radius ?? bbox.w / 2) + 4,
                stroke: "#4f46e5",
                strokeWidth: 1.8,
                dash: [6, 3],
                listening: false,
              })
            );
          } else if (obj.object_type === "ellipse") {
            const cx = Number(p.cx ?? p.x ?? bbox.x + bbox.w / 2);
            const cy = Number(p.cy ?? p.y ?? bbox.y + bbox.h / 2);
            const rx = Number(p.rx ?? bbox.w / 2) + 4;
            const ry = Number(p.ry ?? bbox.h / 2) + 4;
            uiLayer.add(
              new Konva.Line({
                points: generateEllipsePoints(cx, cy, rx, ry),
                closed: true,
                stroke: "#4f46e5",
                strokeWidth: 1.8,
                dash: [6, 3],
                listening: false,
              })
            );
          } else if (obj.object_type === "line" || obj.object_type === "arrow") {
            uiLayer.add(
              new Konva.Line({
                points: [
                  Number(p.x1 ?? bbox.x),
                  Number(p.y1 ?? bbox.y),
                  Number(p.x2 ?? bbox.x + bbox.w),
                  Number(p.y2 ?? bbox.y + bbox.h),
                ],
                stroke: "#4f46e5",
                strokeWidth: 1.8,
                dash: [6, 3],
                listening: false,
              })
            );
          } else if (
            obj.object_type === "viz_solid" ||
            obj.object_type === "viz_graph" ||
            obj.object_type === "math_block"
          ) {
            // DOM overlay widgets render their own crisp frame & contextual toolbar
          } else {
            const rotRad = Number((obj.props as Record<string, unknown>).rotation ?? 0);
            const rotDeg = Number.isFinite(rotRad) ? (rotRad * 180) / Math.PI : 0;
            uiLayer.add(
              new Konva.Rect({
                x: bbox.x + bbox.w / 2,
                y: bbox.y + bbox.h / 2,
                offsetX: bbox.w / 2 + 4,
                offsetY: bbox.h / 2 + 4,
                width: bbox.w + 8,
                height: bbox.h + 8,
                rotation: rotDeg,
                stroke: "#4f46e5",
                strokeWidth: 1.8,
                dash: [6, 3],
                listening: false,
                cornerRadius: 4,
              })
            );
          }

          // Shape-matched corner / vertex / rotate handles for single selected 2D object
          if (
            selectedIds.length === 1 &&
            obj.object_type !== "viz_solid" &&
            obj.object_type !== "viz_graph" &&
            obj.object_type !== "math_block"
          ) {
            const handles = getShapeHandles(obj, bbox, viewportController.getState().scale);
            const rotHandle = handles.find((h) => h.kind === "rotate");
            if (rotHandle) {
              const cx = bbox.x + bbox.w / 2;
              const topMid = { x: cx, y: bbox.y };
              uiLayer.add(
                new Konva.Line({
                  points: [topMid.x, topMid.y, rotHandle.x, rotHandle.y],
                  stroke: "#4f46e5",
                  strokeWidth: 1.5,
                  dash: [3, 2],
                  listening: false,
                })
              );
            }
            for (const h of handles) {
              const isRotate = h.kind === "rotate";
              uiLayer.add(
                new Konva.Circle({
                  x: h.x,
                  y: h.y,
                  radius: isRotate ? 6.5 : 5.5,
                  fill: isRotate ? "#4f46e5" : "#ffffff",
                  stroke: isRotate ? "#ffffff" : "#4f46e5",
                  strokeWidth: 2,
                  listening: false,
                })
              );
            }
          }
        } else {
          // Freehand stroke selection outline
          uiLayer.add(
            new Konva.Rect({
              x: bbox.x - 4,
              y: bbox.y - 4,
              width: bbox.w + 8,
              height: bbox.h + 8,
              stroke: "#4f46e5",
              strokeWidth: 1.8,
              dash: [6, 3],
              listening: false,
              cornerRadius: 4,
            })
          );
        }
      }
    }

    uiLayer.batchDraw();
  }, [selectedIds, scene]);

  // ---------------------------------------------------------------------------
  // World coord helper
  // ---------------------------------------------------------------------------
  const getWorldPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return viewportController.toWorld(pos.x, pos.y);
  }, [stageRef, viewportController]);

  // ---------------------------------------------------------------------------
  // Imperative preview layer — redraws WITHOUT React setState
  // ---------------------------------------------------------------------------
  const drawLivePreview = useCallback(() => {
    const layer = previewLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();

    const tool = activeToolRef.current;
    const col = colorRef.current;
    const sw = strokeWidthRef.current;
    const pts = livePointsRef.current;
    const start = shapeStartRef.current;

    if (
      (tool === "pen" || tool === "highlighter" || tool === "eraser") &&
      pts.length >= 2
    ) {
      const konvaPoints = getSvgPathPoints(pts, sw);
      if (konvaPoints.length >= 4) {
        layer.add(
          new Konva.Line({
            points: konvaPoints,
            fill:
              tool === "eraser"
                ? "rgba(100,100,100,0.4)"
                : tool === "highlighter"
                  ? col + "88"
                  : col,
            closed: true,
            lineCap: "round",
            lineJoin: "round",
            opacity: tool === "highlighter" ? 0.5 : 0.85,
            listening: false,
          }),
        );
      }
    } else if (
      (tool === "line" ||
        tool === "arrow" ||
        tool === "rect" ||
        tool === "circle" ||
        tool === "ellipse" ||
        tool === "triangle" ||
        tool === "rhombus" ||
        tool === "pentagon" ||
        tool === "hexagon" ||
        tool === "star") &&
      start &&
      pts.length >= 1
    ) {
      const end = pts[pts.length - 1];
      const x2 = end[0];
      const y2 = end[1];
      const dashed = [6, 4] as number[];

      if (tool === "line") {
        layer.add(
          new Konva.Line({
            points: [start.x, start.y, x2, y2],
            stroke: col,
            strokeWidth: sw,
            dash: dashed,
            lineCap: "round",
            opacity: 0.8,
            listening: false,
          }),
        );
      } else if (tool === "arrow") {
        layer.add(
          new Konva.Arrow({
            points: [start.x, start.y, x2, y2],
            stroke: col,
            fill: col,
            strokeWidth: sw,
            pointerLength: 10,
            pointerWidth: 8,
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      } else if (tool === "rect") {
        layer.add(
          new Konva.Rect({
            x: Math.min(start.x, x2),
            y: Math.min(start.y, y2),
            width: Math.abs(x2 - start.x),
            height: Math.abs(y2 - start.y),
            stroke: col,
            strokeWidth: sw,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      } else if (tool === "circle") {
        const r =
          Math.sqrt(Math.pow(x2 - start.x, 2) + Math.pow(y2 - start.y, 2)) / 2;
        layer.add(
          new Konva.Circle({
            x: (start.x + x2) / 2,
            y: (start.y + y2) / 2,
            radius: Math.max(r, 2),
            stroke: col,
            strokeWidth: sw,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      } else if (tool === "ellipse") {
        const cx = (start.x + x2) / 2;
        const cy = (start.y + y2) / 2;
        const rx = Math.max(Math.abs(x2 - start.x) / 2, 2);
        const ry = Math.max(Math.abs(y2 - start.y) / 2, 2);
        layer.add(
          new Konva.Line({
            points: generateEllipsePoints(cx, cy, rx, ry),
            closed: true,
            stroke: col,
            strokeWidth: sw,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      } else if (tool === "triangle") {
        const h = Math.abs(y2 - start.y);
        const side = h > 0 ? h / (Math.sqrt(3) / 2) : Math.abs(x2 - start.x);
        const mx = (start.x + x2) / 2;
        const baseY = y2 > start.y ? start.y + h : start.y - h;
        layer.add(
          new Konva.Line({
            points: [
              mx, start.y,
              mx - side / 2, baseY,
              mx + side / 2, baseY,
            ],
            closed: true,
            stroke: col,
            strokeWidth: sw,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            lineCap: "round",
            lineJoin: "round",
            listening: false,
          }),
        );
      } else if (tool === "rhombus") {
        const cx = (start.x + x2) / 2;
        const cy = (start.y + y2) / 2;
        const rx = Math.max(Math.abs(x2 - start.x) / 2, 2);
        const ry = Math.max(Math.abs(y2 - start.y) / 2, 2);
        layer.add(
          new Konva.Line({
            points: generateRhombusPoints(cx, cy, rx, ry),
            closed: true,
            stroke: col,
            strokeWidth: sw,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      } else if (tool === "pentagon" || tool === "hexagon") {
        const cx = (start.x + x2) / 2;
        const cy = (start.y + y2) / 2;
        const r = Math.max(Math.max(Math.abs(x2 - start.x), Math.abs(y2 - start.y)) / 2, 2);
        layer.add(
          new Konva.Line({
            points: generateRegularPolygonPoints(cx, cy, r, tool === "pentagon" ? 5 : 6),
            closed: true,
            stroke: col,
            strokeWidth: sw,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      } else if (tool === "star") {
        const cx = (start.x + x2) / 2;
        const cy = (start.y + y2) / 2;
        const outerR = Math.max(Math.max(Math.abs(x2 - start.x), Math.abs(y2 - start.y)) / 2, 4);
        const innerR = outerR / 2.2;
        layer.add(
          new Konva.Line({
            points: generateStarPoints(cx, cy, outerR, innerR),
            closed: true,
            stroke: col,
            strokeWidth: sw,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      }
    }

    layer.batchDraw();
  }, []); // no deps — reads from refs which are always current

  const clearLivePreview = useCallback(() => {
    const layer = previewLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();
    layer.batchDraw();
  }, []);

  // ---------------------------------------------------------------------------
  // Pointer down
  // ---------------------------------------------------------------------------
  const handleStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (readOnly) return;
      if (e.evt.pointerType === "touch" && (activeToolRef.current === "select" || activeToolRef.current === "hand")) {
        const stage = stageRef.current;
        const rect = stage?.container?.().getBoundingClientRect() ?? { left: 0, top: 0 };
        touchEngineRef.current?.handlePointerDown(
          e.evt.pointerId,
          e.evt.clientX - rect.left,
          e.evt.clientY - rect.top,
        );
        return;
      }
      if (e.evt.button !== 0) return;

      const pos = getWorldPos();
      if (!pos) return;

      const tool = activeToolRef.current;
      const curScene = sceneRef.current;
      const curSelected = selectedIdsRef.current;

      // 1. Direct corner/edge/vertex resize handle check (works in Select OR Hand mode!)
      if ((tool === "select" || tool === "hand") && curSelected.length === 1) {
        const selId = curSelected[0];
        const selObj = curScene.objects[selId];
        const selBBox = selObj ? getItemBBox(selId, curScene) : null;
        if (selObj && selBBox) {
          const hitHandle = findHitResizeHandle(pos, selBBox, viewportController.getState().scale, selObj);
          if (hitHandle) {
            activeResizeRef.current = {
              id: selId,
              handle: hitHandle,
              origBBox: selBBox,
              origProps: { ...(selObj.props as Record<string, unknown>) },
            };
            return;
          }
        }
      }

      if (tool === "hand") {
        const hitId = findHitItem(pos, curScene);
        if (hitId) {
          const nextIds = curSelected.includes(hitId) && curSelected.length > 1 ? curSelected : [hitId];
          selectedIdsRef.current = nextIds;
          setSelectedIds(nextIds);
          isDraggingSelection.current = true;
          dragSelectionStart.current = { x: pos.x, y: pos.y };
        } else {
          selectedIdsRef.current = [];
          setSelectedIds([]);
          isHandPanning.current = true;
          handPanLast.current = { x: e.evt.clientX, y: e.evt.clientY };
        }
        return;
      }

      if (tool === "select") {
        const hitId = findHitItem(pos, curScene);
        if (hitId) {
          let nextIds: string[];
          if (e.evt.shiftKey) {
            nextIds = curSelected.includes(hitId)
              ? curSelected.filter((id) => id !== hitId)
              : [...curSelected, hitId];
          } else {
            nextIds = curSelected.includes(hitId) && curSelected.length > 1 ? curSelected : [hitId];
          }
          selectedIdsRef.current = nextIds;
          setSelectedIds(nextIds);
          isDraggingSelection.current = true;
          dragSelectionStart.current = { x: pos.x, y: pos.y };
        } else {
          if (!e.evt.shiftKey) {
            selectedIdsRef.current = [];
            setSelectedIds([]);
          }
          isMarquee.current = true;
          marqueeStart.current = { x: pos.x, y: pos.y };
        }

        clearTimeout(longPressTimer.current);
        const screenClientX = e.evt.clientX;
        const screenClientY = e.evt.clientY;
        longPressTimer.current = setTimeout(() => {
          setContextMenu({ x: screenClientX || 200, y: screenClientY || 200 });
        }, 500);
        return;
      }

      isPointerDown.current = true;
      activeIdRef.current = uid();
      const pressure = e.evt.pressure || 0.5;
      pointerHoldRef.current = { startPos: { x: pos.x, y: pos.y }, startTime: Date.now() };

      if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
        livePointsRef.current = [[pos.x, pos.y, pressure]];
      } else if (
        tool === "line" ||
        tool === "arrow" ||
        tool === "rect" ||
        tool === "circle" ||
        tool === "ellipse" ||
        tool === "triangle" ||
        tool === "rhombus" ||
        tool === "pentagon" ||
        tool === "hexagon" ||
        tool === "star"
      ) {
        shapeStartRef.current = { x: pos.x, y: pos.y };
        livePointsRef.current = [[pos.x, pos.y, 0.5]];
      }
    },
    [readOnly, getWorldPos, scene],
  );

  // ---------------------------------------------------------------------------
  // Pointer move — imperative only, zero setState
  // ---------------------------------------------------------------------------
  const handleStagePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const tool = activeToolRef.current;
      if (e.evt.pointerType === "touch" && (tool === "select" || tool === "hand")) {
        const stage = stageRef.current;
        const rect = stage?.container?.().getBoundingClientRect() ?? { left: 0, top: 0 };
        touchEngineRef.current?.handlePointerMove(
          e.evt.pointerId,
          e.evt.clientX - rect.left,
          e.evt.clientY - rect.top,
        );
        return;
      }
      const pos = getWorldPos();
      if (!pos) return;

      const curScene = sceneRef.current;

      // 1. Live corner/edge/vertex/rotate resizing (FigCraft smooth 60fps + 15° Shift snap)
      if (activeResizeRef.current) {
        const r = activeResizeRef.current;
        const obj = curScene.objects[r.id];
        if (obj) {
          const nextProps = computeResizedProps(
            obj,
            r.handle,
            r.origBBox,
            r.origProps,
            pos,
            Boolean(e.evt?.shiftKey)
          );
          commitEventRef.current({
            event_type: "object.updated",
            payload: { id: r.id, props_patch: nextProps },
          } as unknown as WhiteboardEvent);
        }
        return;
      }

      // 2. Smooth 60fps live dragging of single OR multi-selected items (both Select & Hand modes!)
      if ((tool === "select" || tool === "hand") && isDraggingSelection.current && dragSelectionStart.current) {
        clearTimeout(longPressTimer.current);
        const dx = pos.x - dragSelectionStart.current.x;
        const dy = pos.y - dragSelectionStart.current.y;
        if (Math.hypot(dx, dy) > 0.5) {
          dragSelectionStart.current = { x: pos.x, y: pos.y };
          translateSelectedLive(dx, dy);
        }
        return;
      }

      // 3. Hand panning on empty canvas
      if (tool === "hand") {
        if (isHandPanning.current && handPanLast.current) {
          const dx = e.evt.clientX - handPanLast.current.x;
          const dy = e.evt.clientY - handPanLast.current.y;
          handPanLast.current = { x: e.evt.clientX, y: e.evt.clientY };
          const v = viewportController.getState();
          viewportController.set({ ...v, x: v.x + dx, y: v.y + dy });
        }
        return;
      }

      // 4. Select mode: Marquee multi-select box + FigCraft hover cursor feedback
      if (tool === "select") {
        clearTimeout(longPressTimer.current);
        const uiLayer = uiLayerRef.current;
        if (isMarquee.current && marqueeStart.current && uiLayer && typeof uiLayer.destroyChildren === "function") {
          const sx = marqueeStart.current.x;
          const sy = marqueeStart.current.y;
          const w = pos.x - sx;
          const h = pos.y - sy;
          uiLayer.destroyChildren();
          uiLayer.add(
            new Konva.Rect({
              x: w < 0 ? pos.x : sx,
              y: h < 0 ? pos.y : sy,
              width: Math.abs(w),
              height: Math.abs(h),
              fill: "rgba(16, 185, 129, 0.10)",
              stroke: "#10b981",
              strokeWidth: 1.5,
              listening: false,
            })
          );
          uiLayer.batchDraw();
          return;
        }

        // Hover cursor feedback over resize handles or objects
        const curSel = selectedIdsRef.current;
        if (curSel.length === 1 && curScene.objects[curSel[0]]) {
          const selObj = curScene.objects[curSel[0]];
          const selBBox = getItemBBox(curSel[0], curScene);
          if (selBBox) {
            const hh = findHitResizeHandle(pos, selBBox, viewportController.getState().scale, selObj);
            if (hh) {
              const handleCursors: Record<string, string> = {
                nw: "nwse-resize",
                se: "nwse-resize",
                ne: "nesw-resize",
                sw: "nesw-resize",
                n: "ns-resize",
                s: "ns-resize",
                e: "ew-resize",
                w: "ew-resize",
                rotate: "grab",
              };
              setDynamicCursor(handleCursors[hh] ?? "crosshair");
              return;
            }
          }
        }
        const hoverHit = findHitItem(pos, curScene);
        setDynamicCursor(hoverHit ? "move" : null);
        return;
      }

      if (!isPointerDown.current || readOnly) return;
      if (
        Math.hypot(
          pos.x - pointerHoldRef.current.startPos.x,
          pos.y - pointerHoldRef.current.startPos.y,
        ) > 2
      ) {
        pointerHoldRef.current = { startPos: { x: pos.x, y: pos.y }, startTime: Date.now() };
      }
      const pressure = e.evt.pressure || 0.5;
      livePointsRef.current.push([pos.x, pos.y, pressure]);
      drawLivePreview();
    },
    [readOnly, getWorldPos, drawLivePreview],
  );

  // ---------------------------------------------------------------------------
  // Pointer up — commit stroke/shape
  // ---------------------------------------------------------------------------
  const handleStagePointerUp = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      const tool = activeToolRef.current;
      if (e?.evt?.pointerType === "touch" && (tool === "select" || tool === "hand")) {
        const stage = stageRef.current;
        const rect = stage?.container?.().getBoundingClientRect() ?? { left: 0, top: 0 };
        touchEngineRef.current?.handlePointerUp(
          e.evt.pointerId,
          e.evt.clientX - rect.left,
          e.evt.clientY - rect.top,
        );
        return;
      }
      const pos = getWorldPos();

      if (activeResizeRef.current) {
        activeResizeRef.current = null;
        return;
      }

      if (tool === "select" || tool === "hand") {
        isHandPanning.current = false;
        handPanLast.current = null;
        clearTimeout(longPressTimer.current);
        const uiLayer = uiLayerRef.current;
        const curScene = sceneRef.current;

        if (isMarquee.current && marqueeStart.current) {
          const sx = marqueeStart.current.x;
          const sy = marqueeStart.current.y;
          const w = pos ? pos.x - sx : 0;
          const h = pos ? pos.y - sy : 0;

          if (Math.abs(w) > 5 || Math.abs(h) > 5) {
            const itemsInMarquee = findItemsInMarquee({ x: sx, y: sy, w, h }, curScene);
            selectedIdsRef.current = itemsInMarquee;
            setSelectedIds(itemsInMarquee);
          }
          isMarquee.current = false;
          marqueeStart.current = null;
          if (uiLayer && typeof uiLayer.destroyChildren === "function") {
            uiLayer.destroyChildren();
            uiLayer.batchDraw();
          }
        }

        if (isDraggingSelection.current && dragSelectionStart.current && pos) {
          const dx = pos.x - dragSelectionStart.current.x;
          const dy = pos.y - dragSelectionStart.current.y;
          if (Math.hypot(dx, dy) > 0.5) {
            translateSelectedLive(dx, dy);
          }
          isDraggingSelection.current = false;
          dragSelectionStart.current = null;
        }
        return;
      }

      if (!isPointerDown.current || readOnly) {
        clearLivePreview();
        return;
      }
      isPointerDown.current = false;

      const pts = livePointsRef.current;
      const col = colorRef.current;
      const sw = strokeWidthRef.current;
      const id = activeIdRef.current;
      const start = shapeStartRef.current;

      clearLivePreview();
      livePointsRef.current = [];
      shapeStartRef.current = null;

      if (!pos) return;

      // Sketch recognition for pen
      if (tool === "pen" && pts.length >= 4) {
        const mode = autoShapeModeState;
        const holdDuration = Date.now() - pointerHoldRef.current.startTime;
        const shouldRecognize =
          mode === "auto" || (mode === "hold" && holdDuration >= 450);

        if (shouldRecognize) {
          const isLegacy = import.meta.env.VITE_LEGACY_SHAPE === "1";
          if (isLegacy) {
            const recognized = legacyRecognizeShape(pts);
            if (recognized.type !== "none") {
              if (recognized.type === "line") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: "line",
                    props: { x1: recognized.x1, y1: recognized.y1, x2: recognized.x2, y2: recognized.y2, stroke: col, strokeWidth: sw },
                  },
                });
              } else if (recognized.type === "rect") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: "rect",
                    props: { x: recognized.x, y: recognized.y, w: recognized.w, h: recognized.h, stroke: col, strokeWidth: sw, fill: "transparent" },
                  },
                });
              } else if (recognized.type === "circle") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: "circle",
                    props: { x: recognized.cx, y: recognized.cy, r: recognized.r, stroke: col, strokeWidth: sw, fill: "transparent" },
                  },
                });
              } else if (recognized.type === "triangle") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: "triangle",
                    props: {
                      x1: recognized.x1, y1: recognized.y1,
                      x2: recognized.x2, y2: recognized.y2,
                      x3: recognized.x3, y3: recognized.y3,
                      stroke: col, strokeWidth: sw, fill: "transparent",
                    },
                  },
                });
              } else if (recognized.type === "ellipse") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: "ellipse",
                    props: {
                      cx: recognized.cx, cy: recognized.cy,
                      rx: recognized.rx, ry: recognized.ry,
                      stroke: col, strokeWidth: sw, fill: "transparent",
                    },
                  },
                });
              } else if (recognized.type === "rhombus") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: "rhombus",
                    props: {
                      cx: recognized.cx, cy: recognized.cy,
                      rx: recognized.rx, ry: recognized.ry,
                      stroke: col, strokeWidth: sw, fill: "transparent",
                    },
                  },
                });
              } else if (recognized.type === "pentagon" || recognized.type === "hexagon") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: recognized.type,
                    props: {
                      cx: recognized.cx, cy: recognized.cy,
                      r: recognized.r,
                      stroke: col, strokeWidth: sw, fill: "transparent",
                    },
                  },
                });
              } else if (recognized.type === "star") {
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id,
                    object_type: "star",
                    props: {
                      cx: recognized.cx, cy: recognized.cy,
                      outerR: recognized.outerR, innerR: recognized.innerR,
                      stroke: col, strokeWidth: sw, fill: "transparent",
                    },
                  },
                });
              }
              return;
            }
          } else {
            // Recognizer v2 from @ai-classroom/sketch-core
            const v2Points: Pt[] = pts.map(([x, y]) => ({ x, y }));
            const currentScale = viewportController.getState().scale || 1;
            const result = recognizeShapeV2(v2Points, { scale: currentScale });

            if (result.decision === "snap" && result.best) {
              const shapeEvent = candidateToShapeEvent(id, result.best, col, sw);
              lastSnappedRef.current = {
                shapeId: id,
                originalPoints: pts.map(([x, y, p]) => [x, y, p]),
                color: col,
                width: sw,
                timestamp: Date.now(),
              };
              setRevertToast({
                visible: true,
                shapeKind: result.best.kind,
              });
              setSuggestionChip((prev) => ({ ...prev, visible: false }));
              commitEvent(shapeEvent);
              return;
            } else if (result.decision === "suggest" && result.best) {
              const allPts = [...pts, [pos.x, pos.y, 0.5] as [number, number, number]];
              const reducedPts = reducePoints(allPts);
              commitEvent({
                event_type: "stroke.committed",
                payload: {
                  id,
                  points: reducedPts,
                  color: col,
                  width: sw,
                  tool,
                },
              });
              const bbox = computeBBox(v2Points);
              const screenPos = viewportController.toScreen(bbox.centerX, bbox.minY);
              setSuggestionChip({
                visible: true,
                strokeId: id,
                candidate: result.best,
                position: screenPos,
                color: col,
                width: sw,
              });
              return;
            }
            // If decision is 'keep', fall through to freehand stroke below
          }
        }
      }

      // Freehand stroke
      if (
        (tool === "pen" || tool === "highlighter" || tool === "eraser") &&
        pts.length >= 2
      ) {
        const allPts = [...pts, [pos.x, pos.y, 0.5] as [number, number, number]];
        const reducedPts = reducePoints(allPts);
        commitEvent({
          event_type: "stroke.committed",
          payload: {
            id,
            points: reducedPts,
            color: tool === "eraser" ? "#ffffff" : col,
            width: sw,
            tool,
          },
        });

        // Multi-Stroke 3D Sketch & Concave Polygon 3D Detection (non-intrusive chip!)
        if (tool === "pen") {
          const timed: TimedStroke = {
            id,
            timestamp: Date.now(),
            points: reducedPts.map(([px, py]) => ({ x: px, y: py })),
          };
          recentStrokesRef.current = [...recentStrokesRef.current.slice(-11), timed];
          const cluster = clusterRecentStrokes(recentStrokesRef.current, 2500);
          const detected3D = recognizeMultiStroke3D(cluster);
          if (detected3D) {
            const screenPos = viewportController.toScreen(
              detected3D.bbox.x + detected3D.bbox.w / 2,
              detected3D.bbox.y,
            );
            setSketch3dChip({ result: detected3D, screenPos });
          }
        }
        return;
      }

      // Shape tools
      if (!start) return;

      if (tool === "line" || tool === "arrow") {
        commitEvent({
          event_type: "object.created",
          payload: {
            id,
            object_type: tool,
            props: { x1: start.x, y1: start.y, x2: pos.x, y2: pos.y, stroke: col, strokeWidth: sw },
          },
        });
      } else if (tool === "rect") {
        const x = Math.min(start.x, pos.x);
        const y = Math.min(start.y, pos.y);
        commitEvent({
          event_type: "object.created",
          payload: {
            id,
            object_type: "rect",
            props: { x, y, w: Math.abs(pos.x - start.x), h: Math.abs(pos.y - start.y), stroke: col, strokeWidth: sw, fill: "transparent" },
          },
        });
      } else if (tool === "circle") {
        const r =
          Math.sqrt(Math.pow(pos.x - start.x, 2) + Math.pow(pos.y - start.y, 2)) / 2;
        commitEvent({
          event_type: "object.created",
          payload: {
            id,
            object_type: "circle",
            props: { x: (start.x + pos.x) / 2, y: (start.y + pos.y) / 2, r: Math.max(r, 2), stroke: col, strokeWidth: sw, fill: "transparent" },
          },
        });
      } else if (tool === "triangle") {
        const h = Math.abs(pos.y - start.y);
        const side = h > 0 ? h / (Math.sqrt(3) / 2) : Math.abs(pos.x - start.x);
        const mx = (start.x + pos.x) / 2;
        const baseY = pos.y > start.y ? start.y + h : start.y - h;
        if (h > 5 || Math.abs(pos.x - start.x) > 5) {
          commitEvent({
            event_type: "object.created",
            payload: {
              id,
              object_type: "triangle",
              props: {
                x1: mx, y1: start.y,
                x2: mx - side / 2, y2: baseY,
                x3: mx + side / 2, y3: baseY,
                stroke: col, strokeWidth: sw, fill: "transparent",
              },
            },
          });
        }
      } else if (tool === "ellipse") {
        const cx = (start.x + pos.x) / 2;
        const cy = (start.y + pos.y) / 2;
        const rx = Math.max(Math.abs(pos.x - start.x) / 2, 2);
        const ry = Math.max(Math.abs(pos.y - start.y) / 2, 2);
        if (rx > 3 || ry > 3) {
          commitEvent({
            event_type: "object.created",
            payload: {
              id,
              object_type: "ellipse",
              props: { cx, cy, rx, ry, stroke: col, strokeWidth: sw, fill: "transparent" },
            },
          });
        }
      } else if (tool === "rhombus") {
        const cx = (start.x + pos.x) / 2;
        const cy = (start.y + pos.y) / 2;
        const rx = Math.max(Math.abs(pos.x - start.x) / 2, 2);
        const ry = Math.max(Math.abs(pos.y - start.y) / 2, 2);
        if (rx > 3 || ry > 3) {
          commitEvent({
            event_type: "object.created",
            payload: {
              id,
              object_type: "rhombus",
              props: { cx, cy, rx, ry, stroke: col, strokeWidth: sw, fill: "transparent" },
            },
          });
        }
      } else if (tool === "pentagon" || tool === "hexagon") {
        const cx = (start.x + pos.x) / 2;
        const cy = (start.y + pos.y) / 2;
        const r = Math.max(Math.max(Math.abs(pos.x - start.x), Math.abs(pos.y - start.y)) / 2, 2);
        if (r > 3) {
          commitEvent({
            event_type: "object.created",
            payload: {
              id,
              object_type: tool,
              props: { cx, cy, r, stroke: col, strokeWidth: sw, fill: "transparent" },
            },
          });
        }
      } else if (tool === "star") {
        const cx = (start.x + pos.x) / 2;
        const cy = (start.y + pos.y) / 2;
        const outerR = Math.max(Math.max(Math.abs(pos.x - start.x), Math.abs(pos.y - start.y)) / 2, 4);
        if (outerR > 5) {
          commitEvent({
            event_type: "object.created",
            payload: {
              id,
              object_type: "star",
              props: { cx, cy, outerR, innerR: outerR / 2.2, stroke: col, strokeWidth: sw, fill: "transparent" },
            },
          });
        }
      }
    },
    [readOnly, getWorldPos, clearLivePreview, commitEvent],
  );

  // ---------------------------------------------------------------------------
  // Zoom with mouse wheel (P10-T03: smooth exponential factor, imperative)
  // ---------------------------------------------------------------------------
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition() ?? { x: width / 2, y: height / 2 };

      if (e.evt.ctrlKey || Math.abs(e.evt.deltaY) > 50) {
        // Trackpad / wheel zoom using smooth exponential curve
        const factor = Math.exp(-e.evt.deltaY * 0.0015);
        viewportController.zoomAt(pointer.x, pointer.y, factor);
      } else {
        const dx = e.evt.deltaX !== 0 ? -e.evt.deltaX : 0;
        const dy = -e.evt.deltaY;
        viewportController.panBy(dx, dy);
      }
    },
    [stageRef, viewportController, width, height],
  );

  // ---------------------------------------------------------------------------
  // Drag pan (select tool)
  // ---------------------------------------------------------------------------
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      viewportController.set({ x: e.target.x(), y: e.target.y() });
    },
    [viewportController],
  );

  // ---------------------------------------------------------------------------
  // Touch pinch-zoom
  // ---------------------------------------------------------------------------
  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const touches = e.evt.touches;
      if (touches.length !== 2) return;

      const t1 = touches[0];
      const t2 = touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

      if (lastTouchDist.current === 0) {
        lastTouchDist.current = dist;
        return;
      }

      const factor = dist / lastTouchDist.current;
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const rect = stage.container().getBoundingClientRect();
      viewportController.zoomAt(midX - rect.left, midY - rect.top, factor);
      lastTouchDist.current = dist;
    },
    [stageRef, viewportController],
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0;
  }, []);

  // ---------------------------------------------------------------------------
  // Render strokes (memoized StrokeNode with cached outline)
  // ---------------------------------------------------------------------------
  const strokeElems = Object.values(scene.strokes).map((stroke: BoardStroke) => (
    <StrokeNode key={`stroke-${stroke.id}`} stroke={stroke} />
  ));

  // ---------------------------------------------------------------------------
  // Render objects
  // ---------------------------------------------------------------------------
  const isSelectOrEraser = activeTool === "select" || activeTool === "eraser";
  const objectElems = scene.order
    .filter((id) => id in scene.objects)
    .map((id) => {
      const obj = scene.objects[id];
      return (
        <RenderObject
          key={`obj-${obj.id}`}
          obj={obj}
          listening={isSelectOrEraser}
          onNodeRef={(id, node, bbox) => viewportController.registerNode(id, node, bbox)}
        />
      );
    });

  // ---------------------------------------------------------------------------
  // Cursor
  // ---------------------------------------------------------------------------
  const cursorMap: Record<ToolType, string> = {
    select: "default",
    hand: "grab",
    pen: "crosshair",
    highlighter: "crosshair",
    eraser: "cell",
    line: "crosshair",
    arrow: "crosshair",
    rect: "crosshair",
    circle: "crosshair",
    ellipse: "crosshair",
    triangle: "crosshair",
    rhombus: "crosshair",
    pentagon: "crosshair",
    hexagon: "crosshair",
    star: "crosshair",
    text: "text",
  };

  // Stage dragging is handled exclusively by Hand tool (isHandPanning), NEVER by Select tool!
  const isDraggable = false;

  return (
    <div
      className="relative overflow-hidden bg-white"
      onContextMenu={handleContextMenu}
      style={{
        width,
        height,
        touchAction: "none",
        cursor: dynamicCursor ?? cursorMap[activeTool] ?? "crosshair",
      }}
    >
      <GridBackground
        viewportController={viewportController}
        visible={showGrid}
      />
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        draggable={isDraggable}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerLeave={handleStagePointerUp}
        onDblClick={() => {
          if (readOnly || selectedIds.length !== 1) return;
          const pos = getWorldPos();
          if (!pos) return;
          const selId = selectedIds[0];
          const selObj = scene.objects[selId];
          if (!selObj) return;
          const patched = insertVertexAtPoint(selObj, pos);
          if (patched) {
            commitEvent({
              event_type: "object.updated",
              payload: { id: selId, props_patch: patched },
            } as unknown as WhiteboardEvent);
          }
        }}
      >
        {/* Layer 1: committedLayer — listening only while tool is select/eraser */}
        <Layer
          id="committed-layer"
          listening={isSelectOrEraser}
        >
          {strokeElems}
          {objectElems}
        </Layer>
        {/* Layer 2: liveLayer — current stroke/shape preview */}
        <Layer id="live-layer" ref={previewLayerRef} listening={false} />
        {/* Layer 3: uiLayer — selection/transformer */}
        <Layer id="ui-layer" ref={uiLayerRef} listening={activeTool === "select"} />
      </Stage>

      {/* 3D solid and 2D math graph interactive DOM overlay (Pure Three.js — React 19 native) */}
      <WhiteboardOverlay
        boardState={boardState}
        viewportController={viewportController}
        width={width}
        height={height}
        defaultWidgetSize={320}
        tongchuangMode={true}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        onDeleteObject={(id) =>
          commitEvent({ event_type: "object.deleted", payload: { id } })
        }
        onExplainObject={(obj) => setExplainTarget(obj)}
        onDuplicateObject={(obj) => {
          const p = obj.props as Record<string, unknown>;
          commitEvent({
            event_type: "object.created",
            payload: {
              id: `${obj.id}-copy-${uid()}`,
              object_type: obj.object_type,
              props: {
                ...p,
                x: (typeof p.x === "number" ? p.x : 120) + 40,
                y: (typeof p.y === "number" ? p.y : 80) + 40,
              },
            },
          });
        }}
        onEdit2DSolid={(obj) => {
          const p = obj.props as Record<string, unknown>;
          const solidParams = (p.params ?? { type: p.solid_type ?? "cube", s: 4 }) as SolidParams;
          const profCm = Array.isArray(p.profile_points_cm)
            ? (p.profile_points_cm as [number, number][])
            : undefined;
          const base = extractBaseProfile2D(solidParams, profCm);
          const cx = Number(p.x ?? 200) + Number(p.w ?? 320) / 2;
          const cy = Number(p.y ?? 120) + Number(p.h ?? 320) / 2;

          let createdEvent: WhiteboardEvent;
          const newId = `edit2d-${uid()}`;
          if (base.objectType === "circle") {
            const r = Math.max(30, Math.hypot(base.verticesCm[0][0], base.verticesCm[0][1]) * WORLD_UNITS_PER_CM);
            createdEvent = {
              event_type: "object.created",
              payload: {
                id: newId,
                object_type: "circle",
                props: { x: cx, y: cy, r, stroke: "#0f172a", strokeWidth: 3, fill: "transparent" },
              },
            };
          } else if (base.objectType === "rect") {
            const xs = base.verticesCm.map((v) => v[0]);
            const ys = base.verticesCm.map((v) => v[1]);
            const w = Math.max(40, (Math.max(...xs) - Math.min(...xs)) * WORLD_UNITS_PER_CM);
            const h = Math.max(40, (Math.max(...ys) - Math.min(...ys)) * WORLD_UNITS_PER_CM);
            createdEvent = {
              event_type: "object.created",
              payload: {
                id: newId,
                object_type: "rect",
                props: { x: cx - w / 2, y: cy - h / 2, w, h, stroke: "#0f172a", strokeWidth: 3, fill: "transparent" },
              },
            };
          } else {
            const flatPts = base.verticesCm.flatMap(([vx, vy]) => [
              cx + vx * WORLD_UNITS_PER_CM,
              cy + vy * WORLD_UNITS_PER_CM,
            ]);
            createdEvent = {
              event_type: "object.created",
              payload: {
                id: newId,
                object_type: "polygon",
                props: { customPoints: flatPts, stroke: "#0f172a", strokeWidth: 3, fill: "transparent" },
              },
            };
          }

          commitEvent({
            event_type: "batch",
            payload: {
              events: [
                { event_type: "object.deleted", payload: { id: obj.id } },
                createdEvent,
              ],
            },
          });
          setSelectedIds([newId]);
          onToolChange?.("select");
        }}
        onMoveObject={(id, nx, ny) => {
          commitEvent({
            event_type: "object.updated",
            payload: { id, props_patch: { x: nx, y: ny } },
          });
        }}
        onUpdateSolidParams={(id, nextParams) => {
          commitEvent({
            event_type: "object.updated",
            payload: { id, props_patch: { params: nextParams } },
          });
        }}
        onUpdateObjectProps={(id, propsPatch) => {
          commitEvent({
            event_type: "object.updated",
            payload: { id, props_patch: propsPatch },
          });
        }}
        onSynthesizeMathBlock={(mathObj, spec) => {
          const mp = mathObj.props as Record<string, unknown>;
          const bx = Number(mp.x ?? 180) + 340;
          const by = Number(mp.y ?? 100);
          if (spec.kind === "textbook_function_graph") {
            const newId = `tbgraph-${uid()}`;
            commitEvent({
              event_type: "object.created",
              payload: {
                id: newId,
                object_type: "textbook_graph",
                props: { x: bx, y: by, w: 450, h: 310, formula: spec.titleLatex, label: `Grafik: ${spec.titleLatex}` },
              },
            });
          } else if (spec.kind === "trig_identity_proof") {
            const newId = `trig-${uid()}`;
            commitEvent({
              event_type: "object.created",
              payload: {
                id: newId,
                object_type: "trig_proof",
                props: { x: bx, y: by, w: 440, h: 400, identityId: spec.identityId, thetaDeg: spec.thetaDeg, label: "Bukti Identitas Trigonometri" },
              },
            });
          } else if (spec.kind === "stat_chart") {
            const newId = `chart-${uid()}`;
            commitEvent({
              event_type: "object.created",
              payload: {
                id: newId,
                object_type: "stat_chart",
                props: {
                  x: bx,
                  y: by,
                  w: 420,
                  h: 290,
                  title: spec.title,
                  labels: spec.labels,
                  values: spec.series[0]?.values ?? [],
                  label: spec.title,
                },
              },
            });
          }
        }}
        onVisualizeMathBlock={(mathObj, intent) => {
          const mp = mathObj.props as Record<string, unknown>;
          const bx = Number(mp.x ?? 180) + 340;
          const by = Number(mp.y ?? 120);
          // Find existing linked visual object for bidirectional live sync
          const existingLinked = Object.values(scene.objects).find(
            (o) => (o.props as Record<string, unknown>).linkedMathBlockId === mathObj.id
          );

          if (intent.kind === "function_2d") {
            if (existingLinked && existingLinked.object_type === "viz_graph") {
              commitEvent({
                event_type: "object.updated",
                payload: { id: existingLinked.id, props_patch: { expressions: [intent.expression] } },
              });
            } else {
              commitEvent({
                event_type: "object.created",
                payload: {
                  id: `graph-${uid()}`,
                  object_type: "viz_graph",
                  props: {
                    x: bx,
                    y: by,
                    w: 360,
                    h: 240,
                    expressions: [intent.expression],
                    linkedMathBlockId: mathObj.id,
                  },
                },
              });
            }
          } else if (intent.kind === "surface_3d") {
            if (existingLinked && existingLinked.object_type === "viz_solid") {
              commitEvent({
                event_type: "object.updated",
                payload: {
                  id: existingLinked.id,
                  props_patch: {
                    extended_kind: "surface_3d",
                    extra_params: { formula3d: intent.formula3d },
                    label: `z = ${intent.formula3d}`,
                  },
                },
              });
            } else {
              commitEvent({
                event_type: "object.created",
                payload: {
                  id: `surf-${uid()}`,
                  object_type: "viz_solid",
                  props: {
                    solid_type: "cube",
                    extended_kind: "surface_3d",
                    extra_params: { formula3d: intent.formula3d },
                    params: { type: "cube", s: 4 },
                    label: `z = ${intent.formula3d}`,
                    x: bx,
                    y: by,
                    w: 320,
                    h: 320,
                    linkedMathBlockId: mathObj.id,
                  },
                },
              });
            }
          } else if (intent.kind === "solid_3d") {
            if (existingLinked && existingLinked.object_type === "viz_solid") {
              commitEvent({
                event_type: "object.updated",
                payload: {
                  id: existingLinked.id,
                  props_patch: {
                    solid_type: intent.solidType,
                    params: intent.params,
                    label: intent.label,
                  },
                },
              });
            } else {
              commitEvent({
                event_type: "object.created",
                payload: {
                  id: `solid-${uid()}`,
                  object_type: "viz_solid",
                  props: {
                    solid_type: intent.solidType,
                    params: intent.params,
                    label: intent.label,
                    x: bx,
                    y: by,
                    w: 320,
                    h: 320,
                    linkedMathBlockId: mathObj.id,
                  },
                },
              });
            }
          }
        }}
      />

      {/* Zoom controls (Desktop/Tablet) */}
      <div className="hidden md:flex absolute bottom-4 right-4 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 text-xs text-slate-600 shadow-md backdrop-blur-sm select-none">
        <button
          onClick={() => {
            viewportController.zoomAt(width / 2, height / 2, 1 / ZOOM_STEP);
            setZoomDisplay(Math.round(viewportController.getState().scale * 100));
          }}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Zoom out"
        >−</button>
        <span className="w-12 text-center font-mono text-[11px] font-medium text-slate-700">
          {zoomDisplay}%
        </span>
        <button
          onClick={() => {
            viewportController.zoomAt(width / 2, height / 2, ZOOM_STEP);
            setZoomDisplay(Math.round(viewportController.getState().scale * 100));
          }}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Zoom in"
        >+</button>
        <div className="mx-1 h-4 w-px bg-slate-200" />
        <button
          onClick={() => {
            viewportController.set({ scale: 1, x: 0, y: 0 });
            setZoomDisplay(100);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="Reset view"
          aria-label="Reset zoom"
        >↺</button>
      </div>

      {/* Undo/Redo (Desktop/Tablet) */}
      <div className="hidden md:flex absolute bottom-4 left-4 items-center gap-1 select-none">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-sm text-slate-600 shadow-md backdrop-blur-sm transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:cursor-not-allowed"
        >↩</button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-sm text-slate-600 shadow-md backdrop-blur-sm transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:cursor-not-allowed"
        >↪</button>
      </div>

      {/* Multi-Shape Merge to 3D Action Bar (works for 2+ selected 2D shapes OR 1 selected shape touching adjacent shapes!) */}
      {mergeable2DIds.length >= 2 && (
          <div
            data-testid="merge-shapes-bar"
            className="absolute top-3 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur-md"
          >
            <span className="font-semibold text-slate-700">
              {mergeable2DIds.length} bentuk 2D dapat digabung
            </span>
            <button
              type="button"
              data-testid="merge-2d-union-3d-btn"
              onClick={() => {
                const polys: [number, number][][] = [];
                let minX = Infinity, minY = Infinity;
                for (const sid of mergeable2DIds) {
                  const o = scene.objects[sid];
                  if (!o) continue;
                  const ob = getItemBBox(sid, scene);
                  if (ob) {
                    minX = Math.min(minX, ob.x);
                    minY = Math.min(minY, ob.y);
                  }
                  const verts = getShapeVertices(o);
                  if (verts && verts.length >= 6) {
                    const pts: [number, number][] = [];
                    for (let i = 0; i < verts.length; i += 2) {
                      pts.push([verts[i] / WORLD_UNITS_PER_CM, verts[i + 1] / WORLD_UNITS_PER_CM]);
                    }
                    polys.push(pts);
                  }
                }
                if (polys.length < 2) return;
                const merged = mergeProfiles2DUnion(polys);
                const prof = normalizeProfile2D(merged, true);
                const delEvents: WhiteboardEvent[] = mergeable2DIds.map((sid) => ({
                  event_type: "object.deleted",
                  payload: { id: sid },
                }));
                commitEvent({
                  event_type: "batch",
                  payload: {
                    events: [
                      ...delEvents,
                      {
                        event_type: "object.created",
                        payload: {
                          id: `merged3d-${uid()}`,
                          object_type: "viz_solid",
                          props: {
                            solid_type: "prism",
                            extended_kind: "custom_prism",
                            profile_points_cm: prof.points,
                            extra_params: { height: 3.5 },
                            params: { type: "prism", a: 4, b: 4, c: 4, h: 3.5 },
                            label: "Bangun Gabungan 3D",
                            x: Math.max(40, isFinite(minX) ? minX : 200),
                            y: Math.max(40, isFinite(minY) ? minY : 150),
                            w: 320,
                            h: 320,
                          },
                        },
                      },
                    ],
                  },
                });
                setSelectedIds([]);
              }}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-700"
            >
              Gabung Profil → 3D
            </button>
            <button
              type="button"
              data-testid="merge-compound-3d-btn"
              onClick={() => {
                let minX = Infinity, minY = Infinity;
                const parts: CompoundSolidPart[] = mergeable2DIds.map((sid, idx) => {
                  const o = scene.objects[sid];
                  const ob = getItemBBox(sid, scene);
                  if (ob) {
                    minX = Math.min(minX, ob.x);
                    minY = Math.min(minY, ob.y);
                  }
                  const isTri = o?.object_type === "triangle";
                  return {
                    id: `part-${idx}`,
                    label: isTri ? "Bagian Atap" : `Bagian ${idx + 1}`,
                    solidType: isTri ? "pyramid" : "cube",
                    params: isTri
                      ? { type: "pyramid", b: 4.2, h: 2.8 }
                      : { type: "cube", s: 4 },
                    offsetCm: [0, isTri ? 3.4 : 0, 0],
                    colorHex: 0xe2e8f0,
                  };
                });
                const delEvents: WhiteboardEvent[] = mergeable2DIds.map((sid) => ({
                  event_type: "object.deleted",
                  payload: { id: sid },
                }));
                commitEvent({
                  event_type: "batch",
                  payload: {
                    events: [
                      ...delEvents,
                      {
                        event_type: "object.created",
                        payload: {
                          id: `compound3d-${uid()}`,
                          object_type: "viz_solid",
                          props: {
                            solid_type: "cube",
                            extended_kind: "compound",
                            compound_parts: parts,
                            params: { type: "cube", s: 4 },
                            label: "Bangun Ruang Majemuk",
                            x: Math.max(40, isFinite(minX) ? minX : 200),
                            y: Math.max(40, isFinite(minY) ? minY : 150),
                            w: 320,
                            h: 320,
                          },
                        },
                      },
                    ],
                  },
                });
                setSelectedIds([]);
              }}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
            >
              Gabung 3D Majemuk
            </button>
          </div>
        )}

      {/* Multi-Stroke 3D Sketch / Concave Polygon -> 3D Confirmation Chip */}
      {sketch3dChip && (
        <div
          data-testid="sketch3d-confirm-chip"
          style={{
            left: Math.max(12, Math.min(width - 260, sketch3dChip.screenPos.x - 110)),
            top: Math.max(12, sketch3dChip.screenPos.y - 44),
          }}
          className="absolute z-40 flex items-center gap-2 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur-md"
        >
          <span className="font-semibold text-slate-800">
            🧊 Deteksi: {sketch3dChip.result.label}
          </span>
          <button
            type="button"
            data-testid="sketch3d-accept-btn"
            onClick={handleAcceptSketch3D}
            className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold text-white hover:bg-indigo-700"
          >
            Jadikan 3D
          </button>
          <button
            type="button"
            onClick={() => setSketch3dChip(null)}
            className="rounded-full px-1 text-slate-400 hover:text-slate-700"
            aria-label="Tutup saran 3D"
          >
            ✕
          </button>
        </div>
      )}

      {/* Remote Laser Pointer Overlay (driven by Mobile Remote Controller) */}
      {remoteLaser && (
        <div
          data-testid="remote-laser-dot"
          style={{
            left: `${remoteLaser.nx * 100}%`,
            top: `${remoteLaser.ny * 100}%`,
          }}
          className="pointer-events-none absolute z-50 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-500 shadow-[0_0_16px_6px_rgba(244,63,94,0.75)] ring-2 ring-white"
        />
      )}

      {/* Auto-shape suggestion & revert overlays (P10-T11) */}
      <ShapeSuggestionChip
        visible={suggestionChip.visible}
        shapeKind={suggestionChip.candidate?.kind ?? ""}
        position={suggestionChip.position}
        onAccept={handleAcceptSuggestion}
        onDismiss={() => setSuggestionChip((prev) => ({ ...prev, visible: false }))}
      />
      <ShapeRevertToast
        visible={revertToast.visible}
        shapeKind={revertToast.shapeKind}
        onRevert={handleRevertShape}
        onDismiss={() => setRevertToast({ visible: false, shapeKind: "" })}
      />

      {/* FigCraft-style Live Dimension & Angle Badge (W × H · θ°) below selected 2D object/group */}
      {selectedIds.length > 0 && selectionBBox && (() => {
        const singleObj = selectedIds.length === 1 ? scene.objects[selectedIds[0]] : null;
        if (
          singleObj &&
          (singleObj.object_type === "viz_solid" ||
            singleObj.object_type === "viz_graph" ||
            singleObj.object_type === "math_block")
        ) {
          return null;
        }
        const rotRad = singleObj ? Number((singleObj.props as Record<string, unknown>).rotation ?? 0) : 0;
        const rotDeg = Math.round(((rotRad * 180) / Math.PI) % 360);
        const bottomCenter = viewportController.toScreen(
          selectionBBox.x + selectionBBox.w / 2,
          selectionBBox.y + selectionBBox.h
        );
        return (
          <div
            data-testid="selection-dimension-badge"
            className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-md bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-md select-none"
            style={{
              left: `${bottomCenter.x}px`,
              top: `${bottomCenter.y + 10}px`,
            }}
          >
            {Math.round(selectionBBox.w)} × {Math.round(selectionBBox.h)}
            {rotDeg !== 0 ? ` · ${rotDeg}°` : ""}
            {selectedIds.length > 1 ? ` (${selectedIds.length})` : ""}
          </div>
        );
      })()}

      {/* Floating selection toolbar (suppressed when a DOM widget with its own contextual bar is selected) */}
      {selectedIds.length > 0 && toolbarScreenPos && !(
        selectedIds.length === 1 &&
        scene.objects[selectedIds[0]] &&
        (scene.objects[selectedIds[0]].object_type === "viz_solid" ||
          scene.objects[selectedIds[0]].object_type === "viz_graph" ||
          scene.objects[selectedIds[0]].object_type === "math_block" ||
          scene.objects[selectedIds[0]].object_type === "image" ||
          scene.objects[selectedIds[0]].object_type === "textbook_graph" ||
          scene.objects[selectedIds[0]].object_type === "stat_chart" ||
          scene.objects[selectedIds[0]].object_type === "trig_proof")
      ) && (
        <SelectionToolbar
          x={toolbarScreenPos.x}
          y={toolbarScreenPos.y}
          actions={resolvedActions}
          actionContext={actionContext}
          onOpenMoreMenu={(e) => {
            e.stopPropagation();
            setContextMenu({ x: toolbarScreenPos.x, y: toolbarScreenPos.y + 20 });
          }}
        />
      )}

      {/* Right-click & Long-press Tongchuang Circular AI Radial Wheel (Object Mode vs Canvas Mode) */}
      {contextMenu && (() => {
        const primaryItem = getPrimarySelected(actionContext);
        const primaryObj = primaryItem && "object_type" in primaryItem ? primaryItem : null;
        const canConvert3D = is2DConvertible(actionContext);
        const isLocked = Boolean(primaryObj && (primaryObj.props as Record<string, unknown>)?.locked);

        return (
          <div data-testid="whiteboard-context-menu">
            <TongchuangRadialWheel
              mode={selectedIds.length > 0 ? "object" : "canvas"}
              position={contextMenu}
              onClose={() => setContextMenu(null)}
              activeTool={activeTool}
              color={color}
              strokeWidth={strokeWidth}
              canUndo={canUndo}
              isListeningVoice={isListeningVoice}
              onToolChange={onToolChange}
              onColorChange={onColorChange}
              onStrokeWidthChange={onStrokeWidthChange}
              onUndo={onUndo}
              onInsertSolid={onInsertSolid}
              onInsertFormula={() => {
                // Spawn a live Math Calculation Card right at the right-click location!
                // Auto-fill smart formula if right-clicked on a shape (e.g. rect area, circle area, cube volume)
                let initialLatex = "8^2";
                if (primaryObj) {
                  const pr = primaryObj.props as Record<string, unknown>;
                  if (primaryObj.object_type === "rect") {
                    const wCm = Math.max(1, Math.round(Number(pr.w ?? 100) / WORLD_UNITS_PER_CM));
                    const hCm = Math.max(1, Math.round(Number(pr.h ?? 100) / WORLD_UNITS_PER_CM));
                    initialLatex = `${wCm} \\times ${hCm}`;
                  } else if (primaryObj.object_type === "circle") {
                    const rCm = Math.max(1, Math.round(Number(pr.r ?? 50) / WORLD_UNITS_PER_CM));
                    initialLatex = `3.14 \\times ${rCm}^2`;
                  } else if (primaryObj.object_type === "viz_solid") {
                    const sp = (pr.params ?? {}) as Record<string, number>;
                    if (pr.solid_type === "cube" && sp.s) initialLatex = `${sp.s}^3`;
                    else if (pr.solid_type === "cuboid" && sp.l && sp.w && sp.h) initialLatex = `${sp.l} \\times ${sp.w} \\times ${sp.h}`;
                    else if (pr.solid_type === "cylinder" && sp.r && sp.h) initialLatex = `3.14 \\times ${sp.r}^2 \\times ${sp.h}`;
                  }
                }
                const stage = stageRef.current;
                const rect = stage?.container?.().getBoundingClientRect() ?? { left: 0, top: 0 };
                const worldPt = viewportController.toWorld(
                  (contextMenu?.x ?? 300) - rect.left,
                  (contextMenu?.y ?? 200) - rect.top
                );
                const mathId = `math-${uid()}`;
                commitEvent({
                  event_type: "object.created",
                  payload: {
                    id: mathId,
                    object_type: "math_block",
                    props: {
                      x: Math.max(40, Math.round(worldPt.x - 40)),
                      y: Math.max(40, Math.round(worldPt.y - 40)),
                      w: 320,
                      h: 120,
                      latex: initialLatex,
                    },
                  },
                });
                setSelectedIds([mathId]);
              }}
              onOpenFormulaGraph={onOpenFormulaGraph}
              onToggleVoice={onToggleVoice}
              onOpenSummary={onOpenSummary}
              onOpenTemplates={onOpenTemplates}
              selectedCount={selectedIds.length}
              canConvert3D={canConvert3D}
              isLocked={isLocked}
              onConvert3D={() => {
                const act = WHITEBOARD_ACTIONS.find((a) => a.id === "convert_3d");
                act?.run(actionContext);
              }}
              onExplainAi={() => {
                const act = WHITEBOARD_ACTIONS.find((a) => a.id === "explain_ai");
                act?.run(actionContext);
              }}
              onDuplicate={() => {
                const act = WHITEBOARD_ACTIONS.find((a) => a.id === "duplicate");
                act?.run(actionContext);
              }}
              onDelete={() => {
                const act = WHITEBOARD_ACTIONS.find((a) => a.id === "delete");
                act?.run(actionContext);
              }}
              onToggleLock={() => {
                const act = WHITEBOARD_ACTIONS.find((a) => a.id === "toggle_lock");
                act?.run(actionContext);
              }}
              onBringToFront={() => {
                const act = WHITEBOARD_ACTIONS.find((a) => a.id === "bring_to_front");
                act?.run(actionContext);
              }}
              onRecolorObject={handleSetSelectedColor}
            />
          </div>
        );
      })()}

      {/* 2D to 3D Shape Conversion Proposal Menu (P11-T08, P12-T03) */}
      {convert3DShape && (
        <ShapeToSolidMenu
          shape={convert3DShape}
          onSelectProposal={handleConvertProposal}
          onDismiss={() => setConvert3DShape(null)}
        />
      )}

      {/* Socratic AI Math Explanation Modal (P15-T01) */}
      {explainTarget && (
        <AiExplainModal
          target={explainTarget}
          onClose={() => setExplainTarget(null)}
        />
      )}

      {/* Tool hint */}
      <div className="absolute bottom-14 left-4 text-[10px] text-slate-500 select-none pointer-events-none">
        {activeTool === "select"
          ? "Klik untuk memilih · Klik kanan untuk menu · Seret marquee · Scroll untuk zoom"
          : activeTool === "pen"
            ? "Gambar bebas · Auto-shape aktif (garis, kotak, lingkaran, elips, segitiga, belah ketupat, segi lima/enam, bintang)"
            : "Klik & seret · Scroll untuk zoom"}
      </div>
    </div>
  );
}

export default WhiteboardCanvas;
