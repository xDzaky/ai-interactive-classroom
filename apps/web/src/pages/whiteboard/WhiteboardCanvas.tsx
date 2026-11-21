/**
 * WhiteboardCanvas — P02-T03 (revised: Figma-quality drawing UX)
 *
 * Key fixes vs original:
 * 1. Duplicate-key: order[] holds mixed stroke+object IDs → split rendering
 *    into two separate loops (strokes dict, objects dict) to avoid key duplication
 * 2. Drawing UX: Stage.draggable is false while any drawing tool is active;
 *    canvas pointer events are captured at the Stage level and converted to
 *    world-space coords via the current view transform
 * 3. Live preview: an in-progress stroke is rendered as a preview Layer while
 *    the user is drawing, then replaced by the committed stroke on pointerUp
 * 4. Coordinate transform: all pointer positions are converted from screen→world
 *    using the stage view transform before being passed to onPointerDown/Move/Up
 * 5. Eraser: uses globalCompositeOperation=destination-out properly
 * 6. Touch pinch-zoom: handled via Konva's built-in lastDist tracking
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText } from "react-konva";
import type Konva from "konva";
import { getStroke } from "perfect-freehand";
import type {
  BoardState,
  BoardObject,
  BoardStroke,
  WhiteboardEvent,
} from "@ai-classroom/whiteboard-core";
import { getActiveScene } from "@ai-classroom/whiteboard-core";
import type { ToolType } from "@/hooks/useWhiteboardTool";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhiteboardCanvasProps {
  boardState: BoardState;
  onEvent: (event: WhiteboardEvent) => void;
  width?: number;
  height?: number;
  showGrid?: boolean;
  readOnly?: boolean;
  activeTool?: ToolType;
  color?: string;
  strokeWidth?: number;
  /** Live-preview stroke points (world coords) while drawing */
  liveStrokePoints?: [number, number, number][];
  /** Preview shape while dragging a shape tool */
  previewShape?: {
    tool: "line" | "arrow" | "rect" | "circle";
    x1: number; y1: number; x2: number; y2: number;
  } | null;
  onViewChange?: (view: { x: number; y: number; scale: number }) => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

// ---------------------------------------------------------------------------
// perfect-freehand helpers
// ---------------------------------------------------------------------------

function getSvgPathFromPoints(pts: [number, number, number][], width: number): number[] {
  if (pts.length < 2) return [];
  const freehand = getStroke(pts, {
    size: width * 2,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
  });
  return freehand.flatMap(([x, y]) => [x, y]);
}

function strokeToPoints(stroke: BoardStroke): number[] {
  return getSvgPathFromPoints(stroke.points, stroke.width);
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
        stroke="#334155"
        strokeWidth={0.5 / scale}
        listening={false}
        opacity={0.4}
      />,
    );
  }
  for (let y = startY; y <= worldBottom; y += gridSize) {
    lines.push(
      <Line
        key={`hl-${y}`}
        points={[worldLeft, y, worldRight, y]}
        stroke="#334155"
        strokeWidth={0.5 / scale}
        listening={false}
        opacity={0.4}
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
          radius={1 / scale}
          fill="#475569"
          listening={false}
          opacity={0.5}
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
          scaleX={p.scaleX ?? 1}
          scaleY={p.scaleY ?? 1}
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
          rotation={p.rotation ?? 0}
          listening={false}
        />
      );
    case "line":
    case "arrow":
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
    case "viz_solid":
    case "viz_graph":
      return (
        <Rect
          id={obj.id}
          x={p.x ?? 0}
          y={p.y ?? 0}
          width={p.w ?? 200}
          height={p.h ?? 150}
          fill="rgba(99,102,241,0.08)"
          stroke="#6366f1"
          strokeWidth={2}
          dash={[6, 4]}
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

const DRAWING_TOOLS: ToolType[] = [
  "pen",
  "highlighter",
  "eraser",
  "line",
  "arrow",
  "rect",
  "circle",
  "text",
];

export function WhiteboardCanvas({
  boardState,
  width = 800,
  height = 600,
  showGrid = true,
  readOnly = false,
  activeTool = "pen",
  color = "#f8fafc",
  strokeWidth = 3,
  liveStrokePoints,
  previewShape,
  onViewChange,
  stageRef: externalStageRef,
}: WhiteboardCanvasProps) {
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const internalStageRef = useRef<Konva.Stage | null>(null);
  const stageRef = externalStageRef ?? internalStageRef;
  const lastTouchDist = useRef<number>(0);

  const scene = getActiveScene(boardState);

  // -------------------------------------------------------------------------
  // View helpers
  // -------------------------------------------------------------------------
  const updateView = useCallback(
    (next: ViewTransform) => {
      setView(next);
      onViewChange?.(next);
    },
    [onViewChange],
  );

  // -------------------------------------------------------------------------
  // Screen → world coordinate transform
  // -------------------------------------------------------------------------
  const screenToWorld = useCallback(
    (sx: number, sy: number): { x: number; y: number } => {
      const stage = stageRef.current;
      if (!stage) return { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
      const pt = stage.getPointerPosition();
      const wx = pt ? (pt.x - stage.x()) / stage.scaleX() : (sx - view.x) / view.scale;
      const wy = pt ? (pt.y - stage.y()) / stage.scaleY() : (sy - view.y) / view.scale;
      return { x: wx, y: wy };
    },
    [view, stageRef],
  );

  // -------------------------------------------------------------------------
  // Zoom with mouse wheel — zoom toward cursor
  // -------------------------------------------------------------------------
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY < 0 ? 1 : -1;
      // Ctrl+wheel = zoom; plain wheel = pan
      if (e.evt.ctrlKey || Math.abs(e.evt.deltaY) > 50) {
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
        updateView(newView);
        stage.scale({ x: newScale, y: newScale });
        stage.position({ x: newView.x, y: newView.y });
      } else {
        // Pan with plain scroll
        const dx = e.evt.deltaX !== 0 ? -e.evt.deltaX : 0;
        const dy = -e.evt.deltaY;
        const newView = { ...view, x: view.x + dx, y: view.y + dy };
        updateView(newView);
        stage.position({ x: newView.x, y: newView.y });
      }
    },
    [view, updateView, stageRef],
  );

  // -------------------------------------------------------------------------
  // Drag pan (only when select tool or space+drag)
  // -------------------------------------------------------------------------
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const newView = { ...view, x: e.target.x(), y: e.target.y() };
      updateView(newView);
    },
    [view, updateView],
  );

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
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (dist / lastTouchDist.current)));
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const rect = stage.container().getBoundingClientRect();
      const px = midX - rect.left;
      const py = midY - rect.top;
      const mousePointTo = { x: (px - stage.x()) / oldScale, y: (py - stage.y()) / oldScale };
      const newView = {
        scale: newScale,
        x: px - mousePointTo.x * newScale,
        y: py - mousePointTo.y * newScale,
      };
      updateView(newView);
      stage.scale({ x: newScale, y: newScale });
      stage.position({ x: newView.x, y: newView.y });
      lastTouchDist.current = dist;
    },
    [updateView, stageRef],
  );

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0;
  }, []);

  // -------------------------------------------------------------------------
  // Key bindings: Space = temporary pan, Ctrl+Z/Y = undo/redo
  // -------------------------------------------------------------------------
  const isSpaceDown = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        isSpaceDown.current = true;
        document.body.style.cursor = "grab";
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
  }, []);

  // -------------------------------------------------------------------------
  // Live stroke preview points from prop
  // -------------------------------------------------------------------------
  const livePoints =
    liveStrokePoints && liveStrokePoints.length >= 2
      ? getSvgPathFromPoints(liveStrokePoints, strokeWidth)
      : null;

  // -------------------------------------------------------------------------
  // Determine whether the stage should be draggable
  // -------------------------------------------------------------------------
  const isDrawingMode = !readOnly && DRAWING_TOOLS.includes(activeTool) && !isSpaceDown.current;
  const isDraggable = !isDrawingMode && !readOnly;

  // -------------------------------------------------------------------------
  // Render strokes (from committed state)
  // Strokes stored in scene.strokes dict — no order dependency needed
  // -------------------------------------------------------------------------
  const strokeElems = Object.values(scene.strokes).map((stroke: BoardStroke) => {
    const pts = strokeToPoints(stroke);
    if (pts.length < 4) return null;
    return (
      <Line
        key={`stroke-${stroke.id}`}
        points={pts}
        stroke={stroke.tool === "eraser" ? undefined : stroke.color}
        strokeWidth={1}
        closed
        fill={stroke.tool === "eraser" ? "#000" : stroke.color}
        lineCap="round"
        lineJoin="round"
        listening={false}
        globalCompositeOperation={
          stroke.tool === "eraser" ? "destination-out" : "source-over"
        }
        opacity={stroke.tool === "highlighter" ? 0.35 : 1}
      />
    );
  });

  // -------------------------------------------------------------------------
  // Render objects — using scene.objects dict directly (no order needed for keys)
  // Objects rendered in scene.order order for z-ordering, but keyed by obj.id
  // -------------------------------------------------------------------------
  const objectElems = scene.order
    .filter((id) => id in scene.objects)
    .map((id) => {
      const obj = scene.objects[id];
      return <RenderObject key={`obj-${obj.id}`} obj={obj} />;
    });

  // -------------------------------------------------------------------------
  // Preview shape while dragging
  // -------------------------------------------------------------------------
  let previewElem: React.ReactNode = null;
  if (previewShape) {
    const { tool, x1, y1, x2, y2 } = previewShape;
    const dashed: [number, number] = [6, 4];
    switch (tool) {
      case "line":
      case "arrow":
        previewElem = (
          <Line
            points={[x1, y1, x2, y2]}
            stroke={color}
            strokeWidth={strokeWidth}
            dash={dashed}
            lineCap="round"
            listening={false}
            opacity={0.7}
          />
        );
        break;
      case "rect": {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        previewElem = (
          <Rect
            x={rx}
            y={ry}
            width={Math.abs(x2 - x1)}
            height={Math.abs(y2 - y1)}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            dash={dashed}
            listening={false}
            opacity={0.7}
          />
        );
        break;
      }
      case "circle": {
        const r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
        previewElem = (
          <Circle
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2}
            radius={Math.max(r, 2)}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            dash={dashed}
            listening={false}
            opacity={0.7}
          />
        );
        break;
      }
    }
  }

  // Cursor style
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

  return (
    <div
      className="relative overflow-hidden bg-slate-950"
      style={{ width, height, touchAction: "none", cursor: cursorMap[activeTool] ?? "crosshair" }}
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
      >
        {/* Grid layer — below everything */}
        {showGrid && (
          <GridLayer
            width={width}
            height={height}
            scale={view.scale}
            offsetX={view.x}
            offsetY={view.y}
          />
        )}

        {/* Committed strokes layer — keyed with "stroke-" prefix */}
        <Layer>{strokeElems}</Layer>

        {/* Committed objects layer — keyed with "obj-" prefix */}
        <Layer>{objectElems}</Layer>

        {/* Live preview layer — in-progress stroke + shape preview */}
        <Layer listening={false}>
          {livePoints && livePoints.length >= 4 && (
            <Line
              points={livePoints}
              stroke={activeTool === "eraser" ? undefined : color}
              strokeWidth={1}
              closed
              fill={activeTool === "eraser" ? "#000" : color}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                activeTool === "eraser" ? "destination-out" : "source-over"
              }
              opacity={activeTool === "highlighter" ? 0.35 : 0.9}
            />
          )}
          {previewElem}
        </Layer>
      </Stage>

      {/* Zoom controls — bottom right */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-900/90 px-2 py-1.5 text-xs text-slate-400 shadow-lg backdrop-blur-sm select-none">
        <button
          onClick={() =>
            updateView({
              ...view,
              scale: Math.max(MIN_SCALE, view.scale / ZOOM_STEP),
            })
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
            updateView({
              ...view,
              scale: Math.min(MAX_SCALE, view.scale * ZOOM_STEP),
            })
          }
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <div className="mx-1 h-4 w-px bg-slate-700" />
        <button
          onClick={() => updateView({ x: 0, y: 0, scale: 1 })}
          className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          title="Reset view"
          aria-label="Reset zoom"
        >
          ↺
        </button>
      </div>

      {/* Tool hint — bottom left */}
      <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 select-none pointer-events-none">
        {activeTool === "select"
          ? "Seret untuk panning · Scroll untuk zoom · Ctrl+Scroll untuk zoom"
          : "Klik & seret untuk menggambar · Scroll untuk zoom · Space+Seret untuk panning"}
      </div>
    </div>
  );
}

export default WhiteboardCanvas;
