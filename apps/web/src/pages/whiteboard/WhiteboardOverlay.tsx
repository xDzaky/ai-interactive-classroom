/**
 * WhiteboardOverlay — P03-T06
 * Renders viz_solid and viz_graph BoardObjects as DOM overlay elements
 * positioned over the Konva canvas.
 *
 * Usage: place this div as an absolute-positioned sibling of <WhiteboardCanvas>.
 * The parent container must have `position: relative`.
 */
import React, { lazy, Suspense, useMemo } from "react";
import type { BoardState, BoardObject } from "@ai-classroom/whiteboard-core";
import { getActiveScene } from "@ai-classroom/whiteboard-core";
// Lazy-load heavy 3D/graph components — keeps initial bundle lean (P07-T06)
const SolidViewer = lazy(() =>
  import("../../components/math/SolidViewer.js").then((m) => ({ default: m.SolidViewer })),
);
import { GraphViewer, type ExpressionEntry } from "../../components/math/GraphViewer.js";
import type { SolidType, SolidParams } from "@ai-classroom/geometry-core";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface WhiteboardOverlayProps {
  boardState: BoardState;
  view: ViewTransform;
  /** Canvas width in px (must match WhiteboardCanvas width prop) */
  width: number;
  /** Canvas height in px (must match WhiteboardCanvas height prop) */
  height: number;
  /** Default size (pixels) for a viz widget at scale=1 */
  defaultWidgetSize?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert world coordinates to screen coordinates using the view transform. */
function worldToScreen(
  wx: number,
  wy: number,
  view: ViewTransform
): { sx: number; sy: number } {
  return {
    sx: wx * view.scale + view.x,
    sy: wy * view.scale + view.y,
  };
}

function extractTransform(obj: BoardObject): { x: number; y: number } {
  const p = obj.props as Record<string, unknown>;
  return {
    x: typeof p.x === "number" ? p.x : 0,
    y: typeof p.y === "number" ? p.y : 0,
  };
}

// ─── Individual overlay item ──────────────────────────────────────────────────

interface OverlayItemProps {
  obj: BoardObject;
  view: ViewTransform;
  widgetSize: number;
}

function VizSolidOverlay({ obj, view, widgetSize }: OverlayItemProps) {
  const { x: wx, y: wy } = extractTransform(obj);
  const { sx, sy } = worldToScreen(wx, wy, view);
  const scaledSize = widgetSize * view.scale;

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

  return (
    <div
      data-testid={`viz-solid-${obj.id}`}
      style={{
        position: "absolute",
        left: sx,
        top: sy,
        width: scaledSize,
        height: scaledSize,
        pointerEvents: "auto",
        border: "1px solid rgba(100,100,255,0.3)",
        borderRadius: 4,
        overflow: "hidden",
        background: "#0a0a1a",
      }}
    >
      <Suspense fallback={<div style={{ width: "100%", height: "100%", background: "#0a0a1a" }} />}>
        <SolidViewer
          params={solidParams}
          showPanel={false}
        />
      </Suspense>
    </div>
  );
}

function VizGraphOverlay({ obj, view, widgetSize }: OverlayItemProps) {
  const { x: wx, y: wy } = extractTransform(obj);
  const { sx, sy } = worldToScreen(wx, wy, view);
  const scaledSize = widgetSize * view.scale;

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
    // rawExpressions reference changes only when obj.props.expressions changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj.id, rawExpressions.join(",")]
  );

  return (
    <div
      data-testid={`viz-graph-${obj.id}`}
      style={{
        position: "absolute",
        left: sx,
        top: sy,
        width: scaledSize * 1.5,
        height: scaledSize,
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
  view,
  width,
  height,
  defaultWidgetSize = 240,
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
            widgetSize={defaultWidgetSize}
          />
        ) : (
          <VizGraphOverlay
            key={obj.id}
            obj={obj}
            view={view}
            widgetSize={defaultWidgetSize}
          />
        )
      )}
    </div>
  );
}
