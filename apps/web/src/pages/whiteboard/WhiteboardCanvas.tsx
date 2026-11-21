/**
 * WhiteboardCanvas — Figma-quality drawing engine
 *
 * Key architecture:
 * 1. ALL pointer events handled inside this component (no parent div needed)
 * 2. Live preview uses IMPERATIVE Konva layer — zero React setState on pointer move
 *    → eliminates drawing lag completely
 * 3. Sketch recognition (pen → rect/circle/line snapping)
 * 4. Perfect-freehand for pen strokes with pressure simulation
 * 5. Eraser tool support
 * 6. Zoom toward cursor, pan with scroll/space-drag
 * 7. Touch pinch-zoom support
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Arrow } from "react-konva";
import Konva from "konva";
import { getStroke } from "perfect-freehand";
import type {
  BoardState,
  BoardObject,
  BoardStroke,
  WhiteboardEvent,
} from "@ai-classroom/whiteboard-core";
import { getActiveScene } from "@ai-classroom/whiteboard-core";
import type { ToolType } from "@/hooks/useWhiteboardTool";
import { useWhiteboardTool } from "@/hooks/useWhiteboardTool";
import {
  createHistory,
  pushHistory,
  undo as historyUndo,
  redo as historyRedo,
} from "@ai-classroom/whiteboard-core";
import type { WhiteboardHistory } from "@ai-classroom/whiteboard-core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhiteboardCanvasProps {
  boardState: BoardState;
  onBoardStateChange?: (state: BoardState) => void;
  /** @deprecated Use onBoardStateChange instead — kept for backward compat */
  onEvent?: (event: WhiteboardEvent) => void;
  roomId?: string;
  actorId?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  readOnly?: boolean;
  stageRef?: React.RefObject<Konva.Stage | null>;
  // Toolbar control
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
    easing: (t) => Math.sin((t * Math.PI) / 2),
    simulatePressure: pts[0][2] < 0.1, // simulate if no pressure data
  });
  return freehand.flatMap(([x, y]) => [x, y]);
}

function strokeToPoints(stroke: BoardStroke): number[] {
  return getSvgPathPoints(stroke.points, stroke.width);
}

// ---------------------------------------------------------------------------
// Sketch recognition — pen strokes → clean shapes
// ---------------------------------------------------------------------------

type RecognizedShape =
  | { type: "none" }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number }
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "circle"; cx: number; cy: number; r: number };

function recognizeShape(pts: [number, number, number][]): RecognizedShape {
  if (pts.length < 4) return { type: "none" };

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bboxW = maxX - minX;
  const bboxH = maxY - minY;

  // Too small — not a shape
  if (bboxW < 8 && bboxH < 8) return { type: "none" };

  const first = pts[0];
  const last = pts[pts.length - 1];
  const strokeLen = Math.sqrt(
    Math.pow(last[0] - first[0], 2) + Math.pow(last[1] - first[1], 2),
  );
  const pathLen = pts.reduce((sum, p, i) => {
    if (i === 0) return sum;
    return (
      sum +
      Math.sqrt(Math.pow(p[0] - pts[i - 1][0], 2) + Math.pow(p[1] - pts[i - 1][1], 2))
    );
  }, 0);

  // --- Line detection: straightness ratio ---
  const maxDeviation = pts.reduce((max, p) => {
    // Distance from point to line(first→last)
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

  if (maxDeviation / Math.max(strokeLen, 1) < 0.08 && strokeLen > 20) {
    return {
      type: "line",
      x1: first[0],
      y1: first[1],
      x2: last[0],
      y2: last[1],
    };
  }

  // --- Circle detection ---
  const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  const radii = pts.map((p) =>
    Math.sqrt(Math.pow(p[0] - cx, 2) + Math.pow(p[1] - cy, 2)),
  );
  const avgR = radii.reduce((a, b) => a + b, 0) / radii.length;
  const maxRDev = Math.max(...radii.map((r) => Math.abs(r - avgR)));
  const startEndDist = Math.sqrt(
    Math.pow(last[0] - first[0], 2) + Math.pow(last[1] - first[1], 2),
  );
  const isClosed = startEndDist < avgR * 0.7;

  if (
    isClosed &&
    maxRDev / avgR < 0.28 &&
    pathLen / (2 * Math.PI * avgR) > 0.5 &&
    avgR > 10
  ) {
    return { type: "circle", cx, cy, r: avgR };
  }

  // --- Rectangle detection ---
  // Check if path ratio to bbox perimeter is reasonable (strokes that trace a rect)
  const bboxPerimeter = 2 * (bboxW + bboxH);
  const isClosed2 = startEndDist < Math.min(bboxW, bboxH) * 0.5;

  if (
    isClosed2 &&
    pathLen / bboxPerimeter < 1.5 &&
    pathLen / bboxPerimeter > 0.6 &&
    bboxW > 15 &&
    bboxH > 15
  ) {
    return { type: "rect", x: minX, y: minY, w: bboxW, h: bboxH };
  }

  return { type: "none" };
}

// ---------------------------------------------------------------------------
// Grid layer
// ---------------------------------------------------------------------------

function GridLayer({
  width,
  height,
  scale,
  offsetX,
  offsetY,
}: {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  const gridSize = 40;
  const lines: React.ReactNode[] = [];

  const worldLeft = -offsetX / scale;
  const worldTop = -offsetY / scale;
  const worldRight = worldLeft + width / scale;
  const worldBottom = worldTop + height / scale;

  const startX = Math.floor(worldLeft / gridSize) * gridSize;
  const startY = Math.floor(worldTop / gridSize) * gridSize;

  for (let x = startX; x <= worldRight; x += gridSize) {
    lines.push(
      <Line
        key={`vl-${x}`}
        points={[x, worldTop, x, worldBottom]}
        stroke="#1e293b"
        strokeWidth={1 / scale}
        listening={false}
      />,
    );
  }
  for (let y = startY; y <= worldBottom; y += gridSize) {
    lines.push(
      <Line
        key={`hl-${y}`}
        points={[worldLeft, y, worldRight, y]}
        stroke="#1e293b"
        strokeWidth={1 / scale}
        listening={false}
      />,
    );
  }

  // Dot grid overlay
  const dots: React.ReactNode[] = [];
  for (let x = startX; x <= worldRight; x += gridSize) {
    for (let y = startY; y <= worldBottom; y += gridSize) {
      dots.push(
        <Circle
          key={`d-${x}-${y}`}
          x={x}
          y={y}
          radius={1.5 / scale}
          fill="#334155"
          listening={false}
        />,
      );
    }
  }

  return (
    <Layer listening={false}>
      {lines}
      {dots}
    </Layer>
  );
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
const PERSONAL_ROOM_ID = "personal-sandbox";
const GUEST_ID = "guest-me";

export function WhiteboardCanvas({
  boardState,
  onBoardStateChange: _onBoardStateChange,
  onEvent: legacyOnEvent,
  roomId = PERSONAL_ROOM_ID,
  actorId = GUEST_ID,
  width = 800,
  height = 600,
  showGrid = true,
  readOnly = false,
  stageRef: externalStageRef,
  activeTool: externalActiveTool,
  color: externalColor,
  strokeWidth: externalStrokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onUndo: externalUndo,
  onRedo: externalRedo,
  canUndo,
  canRedo,
}: WhiteboardCanvasProps) {
  // Support both new API (onBoardStateChange) and legacy API (onEvent)
  const onBoardStateChange = _onBoardStateChange ?? (() => {});
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = externalStageRef ?? internalStageRef;
  const lastTouchDist = useRef<number>(0);
  const previewLayerRef = useRef<Konva.Layer | null>(null);

  // Imperative refs for drawing — NEVER trigger React re-render on move
  const isPointerDown = useRef(false);
  const livePointsRef = useRef<[number, number, number][]>([]);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Internal history state (if no external handler)
  const seqRef = useRef(0);
  const [history, setHistory] = useState<WhiteboardHistory>(() =>
    createHistory(100),
  );

  const handleEvent = useCallback(
    (event: WhiteboardEvent) => {
      if (
        event.event_type === "device.pointer.moved" ||
        event.event_type === "device.action"
      )
        return;
      // Support legacy onEvent callback
      if (legacyOnEvent) {
        legacyOnEvent(event);
        return;
      }
      setHistory((h) => {
        const result = pushHistory(boardState, h, event);
        onBoardStateChange(result.state);
        return result.history;
      });
    },
    [boardState, onBoardStateChange, legacyOnEvent],
  );

  const { toolState, setTool, setColor, setStrokeWidth, onPointerDown, onPointerMove, onPointerUp } =
    useWhiteboardTool(handleEvent, seqRef);

  const activeTool = externalActiveTool ?? toolState.activeTool;
  const color = externalColor ?? toolState.color;
  const strokeWidth = externalStrokeWidth ?? toolState.strokeWidth;

  // Sync external tool controls
  useEffect(() => {
    if (externalActiveTool && externalActiveTool !== toolState.activeTool) {
      setTool(externalActiveTool);
    }
  }, [externalActiveTool, toolState.activeTool, setTool]);
  useEffect(() => {
    if (externalColor && externalColor !== toolState.color) {
      setColor(externalColor);
    }
  }, [externalColor, toolState.color, setColor]);
  useEffect(() => {
    if (externalStrokeWidth && externalStrokeWidth !== toolState.strokeWidth) {
      setStrokeWidth(externalStrokeWidth);
    }
  }, [externalStrokeWidth, toolState.strokeWidth, setStrokeWidth]);

  // Notify parent of tool changes
  useEffect(() => {
    onToolChange?.(toolState.activeTool);
  }, [toolState.activeTool, onToolChange]);
  useEffect(() => {
    onColorChange?.(toolState.color);
  }, [toolState.color, onColorChange]);

  const handleUndo = useCallback(() => {
    if (externalUndo) {
      externalUndo();
      return;
    }
    setHistory((h) => {
      const result = historyUndo(boardState, h);
      onBoardStateChange(result.state);
      return result.history;
    });
  }, [externalUndo, boardState, onBoardStateChange]);

  const handleRedo = useCallback(() => {
    if (externalRedo) {
      externalRedo();
      return;
    }
    setHistory((h) => {
      const result = historyRedo(boardState, h);
      onBoardStateChange(result.state);
      return result.history;
    });
  }, [externalRedo, boardState, onBoardStateChange]);

  const isUndoable = canUndo ?? history.past.length > 0;
  const isRedoable = canRedo ?? history.future.length > 0;

  const scene = getActiveScene(boardState);

  // -------------------------------------------------------------------------
  // Keyboard shortcuts
  // -------------------------------------------------------------------------
  const isSpaceDown = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        isSpaceDown.current = true;
        document.body.style.cursor = "grab";
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
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
  }, [handleUndo, handleRedo]);

  // -------------------------------------------------------------------------
  // World coordinate transform
  // -------------------------------------------------------------------------
  const getWorldPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - stage.x()) / stage.scaleX(),
      y: (pos.y - stage.y()) / stage.scaleY(),
    };
  }, [stageRef]);

  // -------------------------------------------------------------------------
  // Imperative preview layer — redraws WITHOUT React setState
  // -------------------------------------------------------------------------
  const drawLivePreview = useCallback(() => {
    const layer = previewLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();

    const tool = activeTool;
    const pts = livePointsRef.current;
    const start = shapeStartRef.current;

    if (
      (tool === "pen" || tool === "highlighter" || tool === "eraser") &&
      pts.length >= 2
    ) {
      const konvaPoints = getSvgPathPoints(pts, strokeWidth);
      if (konvaPoints.length >= 4) {
        const line = new Konva.Line({
          points: konvaPoints,
          fill:
            tool === "eraser"
              ? "rgba(100,100,100,0.4)"
              : tool === "highlighter"
                ? color + "88"
                : color,
          stroke: undefined,
          closed: true,
          lineCap: "round",
          lineJoin: "round",
          opacity: tool === "highlighter" ? 0.5 : 0.85,
          listening: false,
        });
        layer.add(line);
      }
    } else if (
      (tool === "line" || tool === "arrow" || tool === "rect" || tool === "circle") &&
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
            stroke: color,
            strokeWidth,
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
            stroke: color,
            fill: color,
            strokeWidth,
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
            stroke: color,
            strokeWidth,
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
            stroke: color,
            strokeWidth,
            fill: "transparent",
            dash: dashed,
            opacity: 0.8,
            listening: false,
          }),
        );
      }
    }

    layer.batchDraw();
  }, [activeTool, color, strokeWidth]);

  const clearLivePreview = useCallback(() => {
    const layer = previewLayerRef.current;
    if (!layer) return;
    layer.destroyChildren();
    layer.batchDraw();
  }, []);

  // -------------------------------------------------------------------------
  // Konva Stage pointer events (all inside canvas)
  // -------------------------------------------------------------------------
  const handleStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (readOnly) return;
      if (e.evt.button !== 0) return;

      const pos = getWorldPos();
      if (!pos) return;

      isPointerDown.current = true;
      const pressure = (e.evt as PointerEvent).pressure || 0.5;
      const pt = { x: pos.x, y: pos.y, pressure };

      onPointerDown(pt, roomId, actorId);

      const tool = activeTool;
      if (tool === "pen" || tool === "highlighter" || tool === "eraser") {
        livePointsRef.current = [[pos.x, pos.y, pressure]];
      } else if (
        tool === "line" ||
        tool === "arrow" ||
        tool === "rect" ||
        tool === "circle"
      ) {
        shapeStartRef.current = { x: pos.x, y: pos.y };
        livePointsRef.current = [[pos.x, pos.y, 0.5]];
      }
    },
    [readOnly, getWorldPos, onPointerDown, roomId, actorId, activeTool],
  );

  const handleStagePointerMove = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (!isPointerDown.current || readOnly) return;

      const pos = getWorldPos();
      if (!pos) return;

      const pressure = (e.evt as PointerEvent).pressure || 0.5;
      const pt = { x: pos.x, y: pos.y, pressure };

      onPointerMove(pt, roomId, actorId);

      livePointsRef.current.push([pos.x, pos.y, pressure]);

      // IMPERATIVE redraw — zero React setState
      drawLivePreview();
    },
    [readOnly, getWorldPos, onPointerMove, roomId, actorId, drawLivePreview],
  );

  const handleStagePointerUp = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (!isPointerDown.current || readOnly) return;
      isPointerDown.current = false;

      const pos = getWorldPos();
      if (!pos) {
        clearLivePreview();
        livePointsRef.current = [];
        shapeStartRef.current = null;
        return;
      }

      const pressure = (e.evt as PointerEvent).pressure || 0.5;
      const pts = livePointsRef.current;

      // Try sketch recognition for pen tool
      const tool = activeTool;
      if (tool === "pen" && pts.length >= 4) {
        const recognized = recognizeShape(pts);
        if (recognized.type !== "none") {
          // Override: emit recognized shape object instead of freehand stroke
          clearLivePreview();
          livePointsRef.current = [];
          shapeStartRef.current = null;

          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          if (recognized.type === "line") {
            handleEvent({
              event_type: "object.created",
              payload: {
                id,
                object_type: "line",
                props: {
                  x1: recognized.x1,
                  y1: recognized.y1,
                  x2: recognized.x2,
                  y2: recognized.y2,
                  stroke: color,
                  strokeWidth,
                },
              },
            });
          } else if (recognized.type === "rect") {
            handleEvent({
              event_type: "object.created",
              payload: {
                id,
                object_type: "rect",
                props: {
                  x: recognized.x,
                  y: recognized.y,
                  w: recognized.w,
                  h: recognized.h,
                  stroke: color,
                  strokeWidth,
                  fill: "transparent",
                },
              },
            });
          } else if (recognized.type === "circle") {
            handleEvent({
              event_type: "object.created",
              payload: {
                id,
                object_type: "circle",
                props: {
                  x: recognized.cx,
                  y: recognized.cy,
                  r: recognized.r,
                  stroke: color,
                  strokeWidth,
                  fill: "transparent",
                },
              },
            });
          }
          return;
        }
      }

      // Normal commit
      const pt = { x: pos.x, y: pos.y, pressure };
      onPointerUp(pt, roomId, actorId);

      clearLivePreview();
      livePointsRef.current = [];
      shapeStartRef.current = null;
    },
    [
      readOnly,
      getWorldPos,
      activeTool,
      color,
      strokeWidth,
      onPointerUp,
      roomId,
      actorId,
      clearLivePreview,
      handleEvent,
    ],
  );

  // -------------------------------------------------------------------------
  // Zoom with mouse wheel
  // -------------------------------------------------------------------------
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      if (e.evt.ctrlKey || Math.abs(e.evt.deltaY) > 50) {
        const direction = e.evt.deltaY < 0 ? 1 : -1;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, oldScale * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)),
        );
        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale,
        };
        const newView = {
          scale: newScale,
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };
        setView(newView);
        stage.scale({ x: newScale, y: newScale });
        stage.position({ x: newView.x, y: newView.y });
      } else {
        const dx = e.evt.deltaX !== 0 ? -e.evt.deltaX : 0;
        const dy = -e.evt.deltaY;
        setView((v) => {
          const nv = { ...v, x: v.x + dx, y: v.y + dy };
          stage.position({ x: nv.x, y: nv.y });
          return nv;
        });
      }
    },
    [stageRef],
  );

  // -------------------------------------------------------------------------
  // Drag pan (select tool)
  // -------------------------------------------------------------------------
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }));
  }, []);

  // -------------------------------------------------------------------------
  // Touch pinch-zoom
  // -------------------------------------------------------------------------
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

      const oldScale = stage.scaleX();
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, oldScale * (dist / lastTouchDist.current)),
      );
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const rect = stage.container().getBoundingClientRect();
      const px = midX - rect.left;
      const py = midY - rect.top;
      const mousePointTo = {
        x: (px - stage.x()) / oldScale,
        y: (py - stage.y()) / oldScale,
      };
      const newView = {
        scale: newScale,
        x: px - mousePointTo.x * newScale,
        y: py - mousePointTo.y * newScale,
      };
      setView(newView);
      stage.scale({ x: newScale, y: newScale });
      stage.position({ x: newView.x, y: newView.y });
      lastTouchDist.current = dist;
    },
    [stageRef],
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0;
  }, []);

  // -------------------------------------------------------------------------
  // Render strokes
  // -------------------------------------------------------------------------
  const strokeElems = Object.values(scene.strokes).map((stroke: BoardStroke) => {
    const pts = strokeToPoints(stroke);
    if (pts.length < 4) return null;
    return (
      <Line
        key={`stroke-${stroke.id}`}
        points={pts}
        stroke={undefined}
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

  // -------------------------------------------------------------------------
  // Render objects
  // -------------------------------------------------------------------------
  const objectElems = scene.order
    .filter((id) => id in scene.objects)
    .map((id) => {
      const obj = scene.objects[id];
      return <RenderObject key={`obj-${obj.id}`} obj={obj} />;
    });

  // -------------------------------------------------------------------------
  // Cursor
  // -------------------------------------------------------------------------
  const cursorMap: Record<ToolType, string> = {
    select: "default",
    pen: "crosshair",
    highlighter: "crosshair",
    eraser: "cell",
    line: "crosshair",
    arrow: "crosshair",
    rect: "crosshair",
    circle: "crosshair",
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
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
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
        {/* Grid */}
        {showGrid && (
          <GridLayer
            width={width}
            height={height}
            scale={view.scale}
            offsetX={view.x}
            offsetY={view.y}
          />
        )}

        {/* Committed strokes */}
        <Layer>{strokeElems}</Layer>

        {/* Committed objects */}
        <Layer>{objectElems}</Layer>

        {/* Imperative preview layer — no children in JSX; redrawn via batchDraw() */}
        <Layer
          ref={previewLayerRef}
          listening={false}
        />
      </Stage>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-900/90 px-2 py-1.5 text-xs text-slate-400 shadow-lg backdrop-blur-sm select-none">
        <button
          onClick={() =>
            setView((v) => ({
              ...v,
              scale: Math.max(MIN_SCALE, v.scale / ZOOM_STEP),
            }))
          }
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="w-12 text-center font-mono text-[11px]">
          {Math.round(view.scale * 100)}%
        </span>
        <button
          onClick={() =>
            setView((v) => ({
              ...v,
              scale: Math.min(MAX_SCALE, v.scale * ZOOM_STEP),
            }))
          }
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <div className="mx-1 h-4 w-px bg-slate-700" />
        <button
          onClick={() => setView({ x: 0, y: 0, scale: 1 })}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          title="Reset view"
          aria-label="Reset zoom"
        >
          ↺
        </button>
      </div>

      {/* Undo/Redo floating buttons */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 select-none">
        <button
          onClick={handleUndo}
          disabled={!isUndoable}
          title="Undo (Ctrl+Z)"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/90 text-sm text-slate-400 shadow-lg backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↩
        </button>
        <button
          onClick={handleRedo}
          disabled={!isRedoable}
          title="Redo (Ctrl+Y)"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-900/90 text-sm text-slate-400 shadow-lg backdrop-blur-sm transition-all hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↪
        </button>
      </div>

      {/* Tool hint */}
      <div className="absolute bottom-14 left-4 text-[10px] text-slate-500 select-none pointer-events-none">
        {activeTool === "select"
          ? "Seret untuk panning · Scroll untuk zoom"
          : activeTool === "pen"
            ? "Gambar · Auto-shape detection aktif"
            : "Klik & seret untuk menggambar · Scroll untuk zoom"}
      </div>
    </div>
  );
}

export default WhiteboardCanvas;
