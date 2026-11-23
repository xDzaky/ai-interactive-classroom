/**
 * WhiteboardOverlay — P03-T06, P10-T07
 * Renders viz_solid and viz_graph BoardObjects as DOM overlay elements
 * positioned over the Konva canvas.
 *
 * P10-T07 optimizations:
 * - Overlay positions update imperatively from ViewportController subscriber without React re-renders.
 * - Maximum 3 live WebGL canvases; other solids render a static snapshot or placeholder until clicked.
 * - Unmounts live canvases when far outside the viewport (> 800px margin).
 */
import React, { lazy, Suspense, useMemo, useRef, useEffect, useState, useCallback } from "react";
import type { BoardState, BoardObject } from "@ai-classroom/whiteboard-core";
import { getActiveScene } from "@ai-classroom/whiteboard-core";
// Lazy-load heavy 3D/graph components — keeps initial bundle lean (P07-T06)
const SolidViewer = lazy(() =>
  import("../../components/math/SolidViewer.js").then((m) => ({ default: m.SolidViewer })),
);
const TongchuangSolidWidget = lazy(() =>
  import("../../components/math/TongchuangSolidWidget.js").then((m) => ({
    default: m.TongchuangSolidWidget,
  })),
);
import { GraphViewer, type ExpressionEntry } from "../../components/math/GraphViewer.js";
import type { SolidType, SolidParams } from "@ai-classroom/geometry-core";
import type { ViewportController, ViewportState } from "@/lib/viewport";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface WhiteboardOverlayProps {
  boardState: BoardState;
  /** Fallback view transform when viewportController is omitted */
  view?: ViewTransform;
  /** ViewportController for imperative zoom/pan updates */
  viewportController?: ViewportController;
  /** Canvas width in px (must match WhiteboardCanvas width prop) */
  width: number;
  /** Canvas height in px (must match WhiteboardCanvas height prop) */
  height: number;
  /** Default size (pixels) for a viz widget at scale=1 */
  defaultWidgetSize?: number;
  /** Render transparent Tongchuang interactive 3D widgets with cross-section, unfold, and white action bar */
  tongchuangMode?: boolean;
  onDeleteObject?: (id: string) => void;
  onExplainObject?: (obj: BoardObject) => void;
  onDuplicateObject?: (obj: BoardObject) => void;
  onMoveObject?: (id: string, x: number, y: number) => void;
  onUpdateSolidParams?: (id: string, params: SolidParams) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTransform(obj: BoardObject): { x: number; y: number } {
  const p = obj.props as Record<string, unknown>;
  return {
    x: typeof p.x === "number" ? p.x : 0,
    y: typeof p.y === "number" ? p.y : 0,
  };
}

// ─── VizSolidOverlay ─────────────────────────────────────────────────────────

interface VizSolidOverlayProps {
  obj: BoardObject;
  view: ViewTransform;
  viewportController?: ViewportController;
  widgetSize: number;
  canvasWidth: number;
  canvasHeight: number;
  isLive: boolean;
  snapshotUrl?: string;
  tongchuangMode?: boolean;
  onActivate: () => void;
  onSnapshot: (url: string) => void;
  onDelete?: () => void;
  onExplain?: () => void;
  onDuplicate?: () => void;
  onMove?: (x: number, y: number) => void;
  onUpdateParams?: (params: SolidParams) => void;
}

function VizSolidOverlay({
  obj,
  view,
  viewportController,
  widgetSize,
  canvasWidth,
  canvasHeight,
  isLive,
  snapshotUrl,
  tongchuangMode = false,
  onActivate,
  onSnapshot,
  onDelete,
  onExplain,
  onDuplicate,
  onMove,
  onUpdateParams,
}: VizSolidOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { x: wx, y: wy } = extractTransform(obj);
  const [isNearViewport, setIsNearViewport] = useState(true);

  // Imperative DOM transform update
  useEffect(() => {
    const updateStyleAndVisibility = (v: ViewportState) => {
      if (containerRef.current) {
        const sx = wx * v.scale + v.x;
        const sy = wy * v.scale + v.y;
        const scaledSize = widgetSize * v.scale;
        containerRef.current.style.left = `${sx}px`;
        containerRef.current.style.top = `${sy}px`;
        containerRef.current.style.width = `${scaledSize}px`;
        containerRef.current.style.height = `${scaledSize}px`;
      }

      // Check distance to viewport (margin 800px in world coordinates)
      const margin = 800;
      const vWorldLeft = -v.x / v.scale - margin;
      const vWorldTop = -v.y / v.scale - margin;
      const vWorldRight = (-v.x + canvasWidth) / v.scale + margin;
      const vWorldBottom = (-v.y + canvasHeight) / v.scale + margin;

      const near =
        wx + widgetSize >= vWorldLeft &&
        wx <= vWorldRight &&
        wy + widgetSize >= vWorldTop &&
        wy <= vWorldBottom;

      setIsNearViewport(near);
    };

    if (viewportController) {
      const unsub = viewportController.subscribe(updateStyleAndVisibility);
      updateStyleAndVisibility(viewportController.getState());
      return unsub;
    } else {
      updateStyleAndVisibility({ x: view.x, y: view.y, scale: view.scale });
    }
  }, [viewportController, view.x, view.y, view.scale, wx, wy, widgetSize, canvasWidth, canvasHeight]);

  const props = obj.props as Record<string, unknown>;
  const solidType = (props.solid_type as SolidType) ?? "cube";
  const rawParams = (props.params as Record<string, unknown>) ?? {};

  // Build a valid SolidParams by merging defaults with stored params
  const DEFAULT_PARAMS: Record<SolidType, Record<string, unknown>> = {
    cube:     { type: "cube", s: 2 },
    cuboid:   { type: "cuboid", l: 3, w: 2, h: 1 },
    sphere:   { type: "sphere", r: 2 },
    cylinder: { type: "cylinder", r: 1, h: 3 },
    cone:     { type: "cone", r: 1, h: 3 },
    pyramid:  { type: "pyramid", base: 2, h: 3 },
    prism:    { type: "prism", a: 2, b: 2, c: 2, h: 3 },
    torus:    { type: "torus", R: 3, r: 1 },
  };
  const solidParams = {
    ...DEFAULT_PARAMS[solidType] ?? { type: solidType },
    ...rawParams,
    type: solidType,
  } as unknown as SolidParams;

  const initialScale = viewportController ? viewportController.getState().scale : view.scale;
  const initialX = viewportController ? viewportController.getState().x : view.x;
  const initialY = viewportController ? viewportController.getState().y : view.y;
  const initialSx = wx * initialScale + initialX;
  const initialSy = wy * initialScale + initialY;
  const initialSize = widgetSize * initialScale;

  return (
    <div
      ref={containerRef}
      data-testid={`viz-solid-${obj.id}`}
      style={{
        position: "absolute",
        left: initialSx,
        top: initialSy,
        width: initialSize,
        height: initialSize,
        pointerEvents: "auto",
        border: tongchuangMode ? "none" : "1px solid rgba(100,100,255,0.3)",
        borderRadius: tongchuangMode ? 12 : 4,
        overflow: tongchuangMode ? "visible" : "hidden",
        background: tongchuangMode ? "transparent" : "#0a0a1a",
      }}
    >
      {isLive && isNearViewport ? (
        <Suspense fallback={<div style={{ width: "100%", height: "100%", background: tongchuangMode ? "transparent" : "#0a0a1a" }} />}>
          {tongchuangMode ? (
            <TongchuangSolidWidget
              id={obj.id}
              params={solidParams}
              label={typeof props.label === "string" ? props.label : undefined}
              selected={true}
              compact={true}
              onSnapshot={onSnapshot}
              onDelete={onDelete}
              onExplainAi={onExplain}
              onDuplicate={onDuplicate}
              onMovePosition={
                onMove
                  ? (dx, dy) => {
                      const s = viewportController ? viewportController.getState().scale : view.scale;
                      onMove(wx + dx / (s || 1), wy + dy / (s || 1));
                    }
                  : undefined
              }
              onParamsChange={onUpdateParams}
            />
          ) : (
            <SolidViewer
              params={solidParams}
              showPanel={false}
              onSnapshot={onSnapshot}
            />
          )}
        </Suspense>
      ) : (
        <div
          data-testid={`viz-solid-placeholder-${obj.id}`}
          onClick={onActivate}
          role="button"
          tabIndex={0}
          aria-label={`Aktifkan 3D: ${solidType}`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onActivate();
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0d1117",
            color: "#94a3b8",
          }}
        >
          {snapshotUrl ? (
            <img
              src={snapshotUrl}
              alt={`Snapshot ${solidType}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 8 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>🧊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", textTransform: "capitalize" }}>
                {solidType}
              </div>
            </div>
          )}
          <span
            style={{
              position: "absolute",
              bottom: 8,
              padding: "2px 8px",
              borderRadius: 12,
              background: "rgba(0, 0, 0, 0.75)",
              color: "#38bdf8",
              fontSize: 11,
              fontWeight: 500,
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            Klik untuk interaksi 3D
          </span>
        </div>
      )}
    </div>
  );
}

// ─── VizGraphOverlay ─────────────────────────────────────────────────────────

interface VizGraphOverlayProps {
  obj: BoardObject;
  view: ViewTransform;
  viewportController?: ViewportController;
  widgetSize: number;
}

function VizGraphOverlay({ obj, view, viewportController, widgetSize }: VizGraphOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { x: wx, y: wy } = extractTransform(obj);

  useEffect(() => {
    const updateStyle = (v: ViewportState) => {
      if (containerRef.current) {
        const sx = wx * v.scale + v.x;
        const sy = wy * v.scale + v.y;
        const scaledWidth = widgetSize * 1.5 * v.scale;
        const scaledHeight = widgetSize * v.scale;
        containerRef.current.style.left = `${sx}px`;
        containerRef.current.style.top = `${sy}px`;
        containerRef.current.style.width = `${scaledWidth}px`;
        containerRef.current.style.height = `${scaledHeight}px`;
      }
    };

    if (viewportController) {
      const unsub = viewportController.subscribe(updateStyle);
      updateStyle(viewportController.getState());
      return unsub;
    } else {
      updateStyle({ x: view.x, y: view.y, scale: view.scale });
    }
  }, [viewportController, view.x, view.y, view.scale, wx, wy, widgetSize]);

  const props = obj.props as Record<string, unknown>;
  const rawExpressions = Array.isArray(props.expressions)
    ? (props.expressions as string[])
    : ["sin(x)"];

  const PALETTE = ["#e63946", "#2a9d8f", "#e9c46a", "#f4a261", "#264653"];
  const entries: ExpressionEntry[] = useMemo(
    () =>
      rawExpressions.map((expr, i) => ({
        id: `${obj.id}-expr-${i}`,
        expr,
        color: PALETTE[i % PALETTE.length],
        visible: true,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj.id, rawExpressions.join(",")]
  );

  const initialScale = viewportController ? viewportController.getState().scale : view.scale;
  const initialX = viewportController ? viewportController.getState().x : view.x;
  const initialY = viewportController ? viewportController.getState().y : view.y;
  const initialSx = wx * initialScale + initialX;
  const initialSy = wy * initialScale + initialY;
  const initialWidth = widgetSize * 1.5 * initialScale;
  const initialHeight = widgetSize * initialScale;

  return (
    <div
      ref={containerRef}
      data-testid={`viz-graph-${obj.id}`}
      style={{
        position: "absolute",
        left: initialSx,
        top: initialSy,
        width: initialWidth,
        height: initialHeight,
        pointerEvents: "auto",
        border: "1px solid rgba(100,200,100,0.3)",
        borderRadius: 4,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <GraphViewer controlled expressions={entries} />
    </div>
  );
}

// ─── WhiteboardOverlay ────────────────────────────────────────────────────────

export function WhiteboardOverlay({
  boardState,
  view = { x: 0, y: 0, scale: 1 },
  viewportController,
  width,
  height,
  defaultWidgetSize = 240,
  tongchuangMode = false,
  onDeleteObject,
  onExplainObject,
  onDuplicateObject,
  onMoveObject,
  onUpdateSolidParams,
}: WhiteboardOverlayProps) {
  const scene = getActiveScene(boardState);

  const vizObjects = useMemo(
    () =>
      (scene.order ?? [])
        .map((id) => scene.objects[id])
        .filter(
          (obj): obj is BoardObject =>
            obj !== undefined &&
            (obj.object_type === "viz_solid" || obj.object_type === "viz_graph")
        ),
    [scene]
  );

  // Maximum 3 live WebGL canvases (P10-T07)
  const [activeSolidIds, setActiveSolidIds] = useState<string[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});

  useEffect(() => {
    const solidIds = vizObjects
      .filter((o) => o.object_type === "viz_solid")
      .map((o) => o.id);

    setActiveSolidIds((prev) => {
      const kept = prev.filter((id) => solidIds.includes(id));
      if (kept.length >= 3) return kept.slice(0, 3);
      for (const id of solidIds) {
        if (!kept.includes(id)) {
          kept.push(id);
          if (kept.length === 3) break;
        }
      }
      return kept;
    });
  }, [vizObjects]);

  const activateSolid = useCallback((id: string) => {
    setActiveSolidIds((prev) => {
      if (prev.includes(id)) return prev;
      const filtered = prev.filter((item) => item !== id);
      return [...filtered, id].slice(-3);
    });
  }, []);

  const handleSnapshot = useCallback((id: string, url: string) => {
    setSnapshots((prev) => ({ ...prev, [id]: url }));
  }, []);

  if (vizObjects.length === 0) return null;

  return (
    <div
      data-testid="whiteboard-overlay"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {vizObjects.map((obj) =>
        obj.object_type === "viz_solid" ? (
          <VizSolidOverlay
            key={obj.id}
            obj={obj}
            view={view}
            viewportController={viewportController}
            widgetSize={defaultWidgetSize}
            canvasWidth={width}
            canvasHeight={height}
            isLive={activeSolidIds.includes(obj.id)}
            snapshotUrl={snapshots[obj.id]}
            tongchuangMode={tongchuangMode}
            onActivate={() => activateSolid(obj.id)}
            onSnapshot={(url) => handleSnapshot(obj.id, url)}
            onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
            onExplain={onExplainObject ? () => onExplainObject(obj) : undefined}
            onDuplicate={onDuplicateObject ? () => onDuplicateObject(obj) : undefined}
            onMove={onMoveObject ? (nx, ny) => onMoveObject(obj.id, nx, ny) : undefined}
            onUpdateParams={onUpdateSolidParams ? (np) => onUpdateSolidParams(obj.id, np) : undefined}
          />
        ) : (
          <VizGraphOverlay
            key={obj.id}
            obj={obj}
            view={view}
            viewportController={viewportController}
            widgetSize={defaultWidgetSize}
          />
        )
      )}
    </div>
  );
}
