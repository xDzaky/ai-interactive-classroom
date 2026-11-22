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
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
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

// ---------------------------------------------------------------------------
// Geometry helpers for 2D math shapes
// ---------------------------------------------------------------------------

function generateRegularPolygonPoints(cx: number, cy: number, r: number, sides: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  return pts;
}

function generateRhombusPoints(cx: number, cy: number, rx: number, ry: number): number[] {
  return [cx, cy - ry, cx + rx, cy, cx, cy + ry, cx - rx, cy];
}

function generateStarPoints(cx: number, cy: number, outerR: number, innerR: number, numPoints = 5): number[] {
  const pts: number[] = [];
  const step = Math.PI / numPoints;
  for (let i = 0; i < 2 * numPoints; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  return pts;
}

function generateEllipsePoints(cx: number, cy: number, rx: number, ry: number, segments = 36): number[] {
  const pts: number[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    pts.push(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle));
  }
  return pts;
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

function recognizeShape(pts: [number, number, number][]): RecognizedShape {
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

// ---------------------------------------------------------------------------
// Individual object renderer
// ---------------------------------------------------------------------------

function RenderObject({ obj }: { obj: BoardObject }) {
  const p = obj.props as Record<string, number & string>;

  switch (obj.object_type) {
    case "rect":
      return (
        <Rect
          id={obj.id}
          x={p.x ?? 0}
          y={p.y ?? 0}
          width={p.w ?? p.width ?? 100}
          height={p.h ?? p.height ?? 60}
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          rotation={p.rotation ?? 0}
          listening={false}
        />
      );
    case "circle":
      return (
        <Circle
          id={obj.id}
          x={p.x ?? 0}
          y={p.y ?? 0}
          radius={p.r ?? p.radius ?? 40}
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          listening={false}
        />
      );
    case "ellipse": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 50));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 30));
      return (
        <Line
          id={obj.id}
          points={generateEllipsePoints(cx, cy, rx, ry)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          listening={false}
        />
      );
    }
    case "triangle":
      return (
        <Line
          id={obj.id}
          points={[p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 50, p.y2 ?? 80, p.x3 ?? 100, p.y3 ?? 0]}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    case "rhombus": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      return (
        <Line
          id={obj.id}
          points={generateRhombusPoints(cx, cy, rx, ry)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }
    case "pentagon": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      return (
        <Line
          id={obj.id}
          points={generateRegularPolygonPoints(cx, cy, r, 5)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }
    case "hexagon": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      return (
        <Line
          id={obj.id}
          points={generateRegularPolygonPoints(cx, cy, r, 6)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }
    case "star": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const outerR = Number(p.outerR ?? (p.r ?? 45));
      const innerR = Number(p.innerR ?? outerR / 2.2);
      return (
        <Line
          id={obj.id}
          points={generateStarPoints(cx, cy, outerR, innerR)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }
    case "polygon": {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      const sides = Number(p.sides ?? 5);
      return (
        <Line
          id={obj.id}
          points={generateRegularPolygonPoints(cx, cy, r, sides)}
          closed
          fill={p.fill ?? "transparent"}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    }
    case "arrow":
      return (
        <Arrow
          id={obj.id}
          points={[p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 100, p.y2 ?? 100]}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          fill={p.stroke ?? "#6366f1"}
          pointerLength={10}
          pointerWidth={8}
          lineCap="round"
          listening={false}
        />
      );
    case "line":
      return (
        <Line
          id={obj.id}
          points={[p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 100, p.y2 ?? 100]}
          stroke={p.stroke ?? "#6366f1"}
          strokeWidth={p.strokeWidth ?? 2}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      );
    case "text":
    case "annotation":
      return (
        <KonvaText
          id={obj.id}
          x={p.x ?? 0}
          y={p.y ?? 0}
          text={String(p.text ?? obj.props.text ?? "")}
          fontSize={Number(p.fontSize ?? 16)}
          fill={String(p.fill ?? "#f8fafc")}
          listening={false}
        />
      );
    default:
      return null;
  }
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
  color = "#f8fafc",
  strokeWidth = 3,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: WhiteboardCanvasProps) {
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = externalStageRef ?? internalStageRef;
  const previewLayerRef = useRef<Konva.Layer | null>(null);
  const lastTouchDist = useRef<number>(0);

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

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts (Ctrl+Z/Y, Space)
  // ---------------------------------------------------------------------------
  const isSpaceDown = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
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
  }, [onUndo, onRedo]);

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
      if (e.evt.button !== 0) return;

      const pos = getWorldPos();
      if (!pos) return;

      isPointerDown.current = true;
      activeIdRef.current = uid();
      const pressure = e.evt.pressure || 0.5;
      const tool = activeToolRef.current;

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
    [readOnly, getWorldPos],
  );

  // ---------------------------------------------------------------------------
  // Pointer move — imperative only, zero setState
  // ---------------------------------------------------------------------------
  const handleStagePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (!isPointerDown.current || readOnly) return;
      const pos = getWorldPos();
      if (!pos) return;
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
    (_e: Konva.KonvaEventObject<PointerEvent>) => {
      if (!isPointerDown.current || readOnly) {
        clearLivePreview();
        return;
      }
      isPointerDown.current = false;

      const pos = getWorldPos();
      const pts = livePointsRef.current;
      const tool = activeToolRef.current;
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
        const recognized = recognizeShape(pts);
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
      }

      // Freehand stroke
      if (
        (tool === "pen" || tool === "highlighter" || tool === "eraser") &&
        pts.length >= 2
      ) {
        const allPts = [...pts, [pos.x, pos.y, 0.5] as [number, number, number]];
        commitEvent({
          event_type: "stroke.committed",
          payload: {
            id,
            points: allPts,
            color: tool === "eraser" ? "#0f172a" : col,
            width: sw,
            tool,
          },
        });
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
  // Render strokes
  // ---------------------------------------------------------------------------
  const strokeElems = Object.values(scene.strokes).map((stroke: BoardStroke) => {
    const pts = strokeToPoints(stroke);
    if (pts.length < 4) return null;
    return (
      <Line
        key={`stroke-${stroke.id}`}
        points={pts}
        strokeWidth={1}
        closed
        fill={
          stroke.tool === "eraser"
            ? "#0f172a"
            : stroke.tool === "highlighter"
              ? stroke.color + "66"
              : stroke.color
        }
        lineCap="round"
        lineJoin="round"
        listening={false}
        globalCompositeOperation={
          stroke.tool === "eraser" ? "destination-out" : "source-over"
        }
      />
    );
  });

  // ---------------------------------------------------------------------------
  // Render objects
  // ---------------------------------------------------------------------------
  const objectElems = scene.order
    .filter((id) => id in scene.objects)
    .map((id) => {
      const obj = scene.objects[id];
      return <RenderObject key={`obj-${obj.id}`} obj={obj} />;
    });

  // ---------------------------------------------------------------------------
  // Cursor
  // ---------------------------------------------------------------------------
  const cursorMap: Record<ToolType, string> = {
    select: "default",
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

  const isDrawingTool = !readOnly && activeTool !== "select";
  const isDraggable = !isDrawingTool && !readOnly;

  return (
    <div
      className="relative overflow-hidden bg-slate-950"
      style={{
        width,
        height,
        touchAction: "none",
        cursor: cursorMap[activeTool] ?? "crosshair",
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
      >
        <Layer>{strokeElems}</Layer>
        <Layer>{objectElems}</Layer>
        {/* Imperative preview layer — no JSX children, redrawn via batchDraw() */}
        <Layer ref={previewLayerRef} listening={false} />
      </Stage>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-900/90 px-2 py-1.5 text-xs text-slate-400 shadow-lg backdrop-blur-sm select-none">
        <button
          onClick={() => {
            viewportController.zoomAt(width / 2, height / 2, 1 / ZOOM_STEP);
            setZoomDisplay(Math.round(viewportController.getState().scale * 100));
          }}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Zoom out"
        >−</button>
        <span className="w-12 text-center font-mono text-[11px]">
          {zoomDisplay}%
        </span>
        <button
          onClick={() => {
            viewportController.zoomAt(width / 2, height / 2, ZOOM_STEP);
            setZoomDisplay(Math.round(viewportController.getState().scale * 100));
          }}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Zoom in"
        >+</button>
        <div className="mx-1 h-4 w-px bg-slate-700" />
        <button
          onClick={() => {
            viewportController.set({ scale: 1, x: 0, y: 0 });
            setZoomDisplay(100);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          title="Reset view"
          aria-label="Reset zoom"
        >↺</button>
      </div>

      {/* Undo/Redo */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 select-none">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/90 text-sm text-slate-400 shadow-lg backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >↩</button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/90 text-sm text-slate-400 shadow-lg backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >↪</button>
      </div>

      {/* Tool hint */}
      <div className="absolute bottom-14 left-4 text-[10px] text-slate-500 select-none pointer-events-none">
        {activeTool === "select"
          ? "Seret untuk panning · Scroll untuk zoom"
          : activeTool === "pen"
            ? "Gambar bebas · Auto-shape aktif (garis, kotak, lingkaran, elips, segitiga, belah ketupat, segi lima/enam, bintang)"
            : "Klik & seret · Scroll untuk zoom"}
      </div>
    </div>
  );
}

export default WhiteboardCanvas;
