/**
 * WhiteboardCanvas — P02-T03
 * Renders BoardState using react-konva (Konva canvas).
 * Features: strokes via perfect-freehand, objects as Konva shapes,
 *           zoom/pan via Stage scale+drag, background grid layer.
 * No side effects: state flows in via props, events emitted via onEvent.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Text as KonvaText, Group } from "react-konva";
import type Konva from "konva";
import { getStroke } from "perfect-freehand";
import type { BoardState, BoardObject, BoardStroke, WhiteboardEvent } from "@ai-classroom/whiteboard-core";
import { getActiveScene } from "@ai-classroom/whiteboard-core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhiteboardCanvasProps {
  boardState: BoardState;
  onEvent: (event: WhiteboardEvent) => void;
  /** Canvas container dimensions */
  width?: number;
  height?: number;
  /** Show grid background */
  showGrid?: boolean;
  readOnly?: boolean;
  /** Called whenever the pan/zoom view transform changes */
  onViewChange?: (view: { x: number; y: number; scale: number }) => void;
}

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

// ---------------------------------------------------------------------------
// perfect-freehand → SVG path string helper
// ---------------------------------------------------------------------------

function getSvgPathFromStroke(stroke: number[][]): string {
  if (stroke.length < 2) return "";
  const d: string[] = [];
  const [first, ...rest] = stroke;
  d.push(`M ${first[0]},${first[1]}`);
  for (const p of rest) {
    d.push(`L ${p[0]},${p[1]}`);
  }
  d.push("Z");
  return d.join(" ");
}

/** Convert a BoardStroke to Konva Line points array */
function strokeToPoints(stroke: BoardStroke): number[] {
  const rawPoints = stroke.points.map(([x, y]) => [x, y]);
  const freehandPoints = getStroke(rawPoints, {
    size: stroke.width * 2,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
  });
  // Flatten for Konva Line (which uses [x0,y0,x1,y1,...])
  return freehandPoints.flatMap(([x, y]) => [x, y]);
}

// ---------------------------------------------------------------------------
// Grid layer (static, behind objects)
// ---------------------------------------------------------------------------

function GridLayer({ width, height, scale, offsetX, offsetY }: {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}) {
  const gridSize = 40; // px in world-space
  const lines: React.ReactNode[] = [];

  // Compute world viewport bounds
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
        stroke="#e5e7eb"
        strokeWidth={1 / scale}
        listening={false}
      />
    );
  }
  for (let y = startY; y <= worldBottom; y += gridSize) {
    lines.push(
      <Line
        key={`hl-${y}`}
        points={[worldLeft, y, worldRight, y]}
        stroke="#e5e7eb"
        strokeWidth={1 / scale}
        listening={false}
      />
    );
  }

  return <Layer listening={false}>{lines}</Layer>;
}

// ---------------------------------------------------------------------------
// Individual object renderers
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
          stroke={p.stroke ?? "#374151"}
          strokeWidth={p.strokeWidth ?? 2}
          rotation={p.rotation ?? 0}
          scaleX={p.scaleX ?? 1}
          scaleY={p.scaleY ?? 1}
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
          stroke={p.stroke ?? "#374151"}
          strokeWidth={p.strokeWidth ?? 2}
          rotation={p.rotation ?? 0}
          scaleX={p.scaleX ?? 1}
          scaleY={p.scaleY ?? 1}
        />
      );
    case "line":
    case "arrow":
      return (
        <Line
          id={obj.id}
          points={[p.x1 ?? 0, p.y1 ?? 0, p.x2 ?? 100, p.y2 ?? 100]}
          stroke={p.stroke ?? "#374151"}
          strokeWidth={p.strokeWidth ?? 2}
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
          fill={String(p.fill ?? "#111827")}
          rotation={p.rotation ?? 0}
        />
      );
    // viz_solid and viz_graph are rendered as DOM overlays in P03-T06
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
        />
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// WhiteboardCanvas — main component
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const ZOOM_STEP = 1.1;

export function WhiteboardCanvas({
  boardState,
  onEvent,
  width = 800,
  height = 600,
  showGrid = true,
  readOnly = false,
  onViewChange,
}: WhiteboardCanvasProps) {
  const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const stageRef = useRef<Konva.Stage | null>(null);

  // Notify parent when view changes
  const updateView = useCallback((next: ViewTransform) => {
    setView(next);
    onViewChange?.(next);
  }, [onViewChange]);

  // Also propagate when setView is called with functional updates (drag handler)
  useEffect(() => {
    onViewChange?.(view);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const scene = getActiveScene(boardState);

  // Zoom with mouse wheel
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = view.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)));

    const mousePointTo = {
      x: (pointer.x - view.x) / oldScale,
      y: (pointer.y - view.y) / oldScale,
    };

    setView({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [view]);

  // Drag pan (middle mouse or if no tool active)
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setView(v => ({ ...v, x: e.target.x(), y: e.target.y() }));
  }, []);

  // Touch pinch-zoom (handled by Konva)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Let Konva handle touch drag natively
  }, []);

  return (
    <div
      className="relative overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm"
      style={{ width, height, touchAction: "none" }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        draggable={!readOnly}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
      >
        {/* Grid layer */}
        {showGrid && (
          <GridLayer
            width={width}
            height={height}
            scale={view.scale}
            offsetX={view.x}
            offsetY={view.y}
          />
        )}

        {/* Strokes layer */}
        <Layer>
          {Object.values(scene.strokes).map((stroke) => {
            const pts = strokeToPoints(stroke);
            if (pts.length < 4) return null;
            return (
              <Line
                key={stroke.id}
                id={stroke.id}
                points={pts}
                stroke={stroke.tool === "eraser" ? "#ffffff" : stroke.color}
                strokeWidth={1}
                closed
                fill={stroke.tool === "eraser" ? "#ffffff" : stroke.color}
                lineCap="round"
                lineJoin="round"
                listening={false}
                globalCompositeOperation={
                  stroke.tool === "eraser" ? "destination-out" : "source-over"
                }
                opacity={stroke.tool === "highlighter" ? 0.4 : 1}
              />
            );
          })}
        </Layer>

        {/* Objects layer */}
        <Layer>
          {scene.order
            .filter((id) => id in scene.objects)
            .map((id) => {
              const obj = scene.objects[id];
              return <RenderObject key={id} obj={obj} />;
            })}
        </Layer>
      </Stage>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-white/80 px-2 py-1 text-xs text-gray-500 shadow-sm border border-gray-200 backdrop-blur-sm select-none">
        <button
          onClick={() => setView(v => ({ ...v, scale: Math.max(MIN_SCALE, v.scale / ZOOM_STEP) }))}
          className="w-5 h-5 flex items-center justify-center hover:text-gray-900"
          aria-label="Zoom out"
        >−</button>
        <span className="w-12 text-center font-mono">{Math.round(view.scale * 100)}%</span>
        <button
          onClick={() => setView(v => ({ ...v, scale: Math.min(MAX_SCALE, v.scale * ZOOM_STEP) }))}
          className="w-5 h-5 flex items-center justify-center hover:text-gray-900"
          aria-label="Zoom in"
        >+</button>
        <button
          onClick={() => setView({ x: 0, y: 0, scale: 1 })}
          className="ml-1 hover:text-gray-900"
          title="Reset view"
          aria-label="Reset zoom"
        >↺</button>
      </div>
    </div>
  );
}

export default WhiteboardCanvas;
