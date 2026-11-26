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
import { MathTextBlockWidget } from "../../components/math/MathTextBlockWidget.js";
import { TextbookGraphWidget } from "../../components/math/TextbookGraphWidget.js";
import { StatChartWidget } from "../../components/math/StatChartWidget.js";
import { TrigProofWidget } from "../../components/math/TrigProofWidget.js";
import { ManimGxWidget } from "../../components/math/ManimGxWidget.js";
import { SimulationWidget } from "../../components/whiteboard/SimulationWidget.js";
import { ImageContextToolbar } from "../../components/whiteboard/ImageContextToolbar.js";
import { getMediaObjectUrl } from "@/lib/mediaStore";
import type { SimulationTemplateId } from "@ai-classroom/whiteboard-core";
import type { SolidType, SolidParams, CompoundSolidPart } from "@ai-classroom/geometry-core";
import type { TexturePreset } from "@/lib/faceTextures";
import type {
  ManimGxAnalysis,
  ManimGxTemplateKind,
  MathVisualIntent,
  SynthesizedVisualSpec,
  TrigIdentityId,
} from "@ai-classroom/math-core";
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
  /** Unified selection IDs from WhiteboardCanvas (eliminates dual-toolbar) */
  selectedIds?: string[];
  onSelectIds?: (ids: string[]) => void;
  onDeleteObject?: (id: string) => void;
  onExplainObject?: (obj: BoardObject) => void;
  onDuplicateObject?: (obj: BoardObject) => void;
  onEdit2DSolid?: (obj: BoardObject) => void;
  onMoveObject?: (id: string, x: number, y: number) => void;
  onUpdateSolidParams?: (id: string, params: SolidParams) => void;
  onUpdateObjectProps?: (id: string, propsPatch: Record<string, unknown>) => void;
  onVisualizeMathBlock?: (mathBlockObj: BoardObject, intent: MathVisualIntent) => void;
  onSynthesizeMathBlock?: (mathBlockObj: BoardObject, spec: SynthesizedVisualSpec) => void;
  onAnimateMathBlock?: (mathBlockObj: BoardObject, analysis: ManimGxAnalysis) => void;
  onConvertManimTo3D?: (manimObj: BoardObject) => void;
  onOpenInspector?: (obj: BoardObject) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTransform(obj: BoardObject): { x: number; y: number } {
  const p = obj.props as Record<string, unknown>;
  return {
    x: typeof p.x === "number" ? p.x : 0,
    y: typeof p.y === "number" ? p.y : 0,
  };
}

/**
 * GPU-accelerated, zero-lag overlay wrapper synced 1:1 with ViewportController.
 * Locks DOM widgets (ManimGX, graphs, charts, simulations) to Konva world coordinates
 * during Hand pan & wheel zoom with zero React re-renders.
 */
function ViewportSyncedOverlayBox({
  wx,
  wy,
  w,
  h,
  zIndex,
  testId,
  view,
  viewportController,
  children,
}: {
  wx: number;
  wy: number;
  w: number;
  h: number;
  zIndex: number;
  testId?: string;
  view: ViewTransform;
  viewportController?: ViewportController;
  children: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (v: ViewportState) => {
      const el = boxRef.current;
      if (!el) return;
      const sx = wx * v.scale + v.x;
      const sy = wy * v.scale + v.y;
      el.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${v.scale})`;
    };

    if (viewportController) {
      const unsub = viewportController.subscribe(apply);
      apply(viewportController.getState());
      return unsub;
    } else {
      apply({ x: view.x, y: view.y, scale: view.scale });
    }
  }, [viewportController, view.x, view.y, view.scale, wx, wy]);

  const init = viewportController ? viewportController.getState() : view;
  const initSx = wx * init.scale + init.x;
  const initSy = wy * init.scale + init.y;

  return (
    <div
      ref={boxRef}
      data-testid={testId}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: h,
        transformOrigin: "0 0",
        transform: `translate3d(${initSx}px, ${initSy}px, 0) scale(${init.scale})`,
        willChange: "transform",
        pointerEvents: "auto",
        zIndex,
      }}
    >
      {children}
    </div>
  );
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
  isSelected?: boolean;
  snapshotUrl?: string;
  tongchuangMode?: boolean;
  onActivate: () => void;
  onSelect?: () => void;
  onDeselect?: () => void;
  onSnapshot: (url: string) => void;
  onDelete?: () => void;
  onExplain?: () => void;
  onDuplicate?: () => void;
  onEdit2D?: () => void;
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
  isSelected = true,
  snapshotUrl,
  tongchuangMode = false,
  onActivate,
  onSelect,
  onDeselect,
  onSnapshot,
  onDelete,
  onExplain,
  onDuplicate,
  onEdit2D,
  onMove,
  onUpdateParams,
}: VizSolidOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { x: wx, y: wy } = extractTransform(obj);
  const [isNearViewport, setIsNearViewport] = useState(true);

  // Imperative DOM transform update (GPU-accelerated translate3d, 1:1 synced with Konva)
  const rawProps = obj.props as Record<string, unknown>;
  const boxW = typeof rawProps.w === "number" ? rawProps.w : widgetSize;
  const boxH = typeof rawProps.h === "number" ? rawProps.h : widgetSize;

  useEffect(() => {
    const updateStyleAndVisibility = (v: ViewportState) => {
      if (containerRef.current) {
        const sx = wx * v.scale + v.x;
        const sy = wy * v.scale + v.y;
        // GPU-accelerated 1:1 world-locked transform: prevents Three.js min-size clamping on zoom-out!
        containerRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(${v.scale})`;
      }

      // Check distance to viewport (margin 800px in world coordinates)
      const margin = 800;
      const vWorldLeft = -v.x / v.scale - margin;
      const vWorldTop = -v.y / v.scale - margin;
      const vWorldRight = (-v.x + canvasWidth) / v.scale + margin;
      const vWorldBottom = (-v.y + canvasHeight) / v.scale + margin;

      const near =
        wx + boxW >= vWorldLeft &&
        wx <= vWorldRight &&
        wy + boxH >= vWorldTop &&
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
  }, [viewportController, view.x, view.y, view.scale, wx, wy, boxW, boxH, canvasWidth, canvasHeight]);

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
  const initialW = boxW * initialScale;
  const initialH = boxH * initialScale;

  return (
    <div
      ref={containerRef}
      data-testid={`viz-solid-${obj.id}`}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: boxW,
        height: boxH,
        transformOrigin: "0 0",
        transform: `translate3d(${initialSx}px, ${initialSy}px, 0) scale(${initialScale})`,
        willChange: "transform",
        zIndex: isSelected ? 20 : 6,
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
              extendedKind={typeof props.extended_kind === "string" ? props.extended_kind : undefined}
              profilePointsCm={Array.isArray(props.profile_points_cm) ? (props.profile_points_cm as [number, number][]) : undefined}
              extraParams={typeof props.extra_params === "object" && props.extra_params !== null ? (props.extra_params as Record<string, unknown>) : undefined}
              texturePreset={typeof props.texture_preset === "string" ? (props.texture_preset as TexturePreset) : undefined}
              compoundParts={Array.isArray(props.compound_parts) ? (props.compound_parts as CompoundSolidPart[]) : undefined}
              label={typeof props.label === "string" ? props.label : undefined}
              selected={isSelected}
              compact={true}
              onSelect={onSelect}
              onCloseToolbar={onDeselect}
              onSnapshot={onSnapshot}
              onDelete={onDelete}
              onExplainAi={onExplain}
              onDuplicate={onDuplicate}
              onEdit2D={onEdit2D}
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
            background: snapshotUrl
              ? "transparent"
              : tongchuangMode
              ? "rgba(255,255,255,0.55)"
              : "#0d1117",
            color: tongchuangMode ? "#475569" : "#94a3b8",
            border: snapshotUrl ? "none" : tongchuangMode ? "1px dashed #cbd5e1" : undefined,
            borderRadius: tongchuangMode ? 16 : undefined,
          }}
        >
          {snapshotUrl ? (
            <img
              src={snapshotUrl}
              alt={`Snapshot ${solidType}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 8 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>🧊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: tongchuangMode ? "#334155" : "#e2e8f0", textTransform: "capitalize" }}>
                {solidType}
              </div>
            </div>
          )}
          <span
            style={{
              position: "absolute",
              bottom: 6,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(15, 23, 42, 0.72)",
              color: "#e0f2fe",
              fontSize: 10,
              fontWeight: 600,
              backdropFilter: "blur(4px)",
            }}
          >
            Klik untuk aktifkan 3D
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

// ─── MathBlockOverlay ────────────────────────────────────────────────────────

interface MathBlockOverlayProps {
  obj: BoardObject;
  view: ViewTransform;
  viewportController?: ViewportController;
  isSelected: boolean;
  onSelect: () => void;
  onChangeLatex: (next: string) => void;
  onVisualize: (intent: MathVisualIntent) => void;
  onSynthesize?: (spec: SynthesizedVisualSpec) => void;
  onAnimateManimGx?: (analysis: ManimGxAnalysis) => void;
  onMove?: (x: number, y: number) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

function ImageLayerOverlay({
  obj,
  view,
  viewportController,
  isSelected,
  onSelect,
  onPatchProps,
  onDuplicate,
  onDelete,
}: {
  obj: BoardObject;
  view: ViewTransform;
  viewportController?: ViewportController;
  isSelected: boolean;
  onSelect: () => void;
  onPatchProps: (patch: Record<string, unknown>) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const p = obj.props as Record<string, unknown>;
  const assetId = typeof p.assetId === "string" ? p.assetId : "";
  const directSrc = typeof p.src === "string" ? p.src : "";
  const [url, setUrl] = useState<string | null>(directSrc || null);

  useEffect(() => {
    let active = true;
    if (directSrc) {
      setUrl(directSrc);
      return;
    }
    if (!assetId) return;
    getMediaObjectUrl(assetId).then((u) => {
      if (active && u) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [assetId, directSrc]);

  if (p.visible === false) return null;

  const w = Number(p.width ?? p.w ?? 320);
  const h = Number(p.height ?? p.h ?? 240);
  const wx = typeof p.cx === "number" ? p.cx - w / 2 : Number(p.x ?? 180);
  const wy = typeof p.cy === "number" ? p.cy - h / 2 : Number(p.y ?? 120);
  const opacity = typeof p.opacity === "number" ? p.opacity : 1;
  const locked = Boolean(p.locked);
  const zLayer = (p.zLayer as "background" | "normal" | "foreground") ?? "normal";
  const flipX = Boolean(p.flipX);
  const flipY = Boolean(p.flipY);
  const grayscale = Boolean(p.grayscale);

  const vState = viewportController ? viewportController.getState() : view;
  const sx = wx * vState.scale + vState.x;
  const sy = wy * vState.scale + vState.y;

  const handleDragStart = (e: React.PointerEvent) => {
    if (locked) return;
    e.stopPropagation();
    onSelect();
    let lx = e.clientX;
    let ly = e.clientY;
    let curCx = wx + w / 2;
    let curCy = wy + h / 2;
    const onMove = (ev: PointerEvent) => {
      const s = viewportController ? viewportController.getState().scale : view.scale;
      curCx += (ev.clientX - lx) / (s || 1);
      curCy += (ev.clientY - ly) / (s || 1);
      lx = ev.clientX;
      ly = ev.clientY;
      onPatchProps({ cx: curCx, cy: curCy, x: curCx - w / 2, y: curCy - h / 2 });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      data-testid={`image-layer-${obj.id}`}
      data-locked={locked ? "true" : "false"}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w * vState.scale,
        height: h * vState.scale,
        transform: `translate3d(${sx}px, ${sy}px, 0)`,
        pointerEvents: locked ? "none" : "auto",
        zIndex: zLayer === "background" ? 2 : zLayer === "foreground" ? 22 : 8,
      }}
    >
      {/* Floating Context Toolbar above image when selected & unlocked */}
      {isSelected && !locked && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            whiteSpace: "nowrap",
          }}
        >
          <ImageContextToolbar
            opacity={opacity}
            locked={locked}
            zLayer={zLayer}
            flipX={flipX}
            flipY={flipY}
            grayscale={grayscale}
            onPatch={onPatchProps}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      )}

      {/* Corner unlock badge when locked so double-click can unlock even while locked */}
      {locked && (
        <button
          type="button"
          data-testid={`image-unlock-badge-${obj.id}`}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onPatchProps({ locked: false });
          }}
          title="Gambar terkunci (Mode Sketsa Tracing) — klik 2x untuk membuka kunci"
          style={{ pointerEvents: "auto" }}
          className="absolute top-1.5 right-1.5 z-20 rounded-md bg-amber-500/85 px-1.5 py-0.5 text-[9px] font-bold text-white shadow hover:bg-amber-600"
        >
          Terkunci · 2x Klik Buka
        </button>
      )}

      <div
        onPointerDown={handleDragStart}
        className={`h-full w-full overflow-hidden rounded-xl transition ${
          isSelected && !locked
            ? "ring-2 ring-indigo-500 shadow-lg cursor-grab active:cursor-grabbing"
            : locked
              ? ""
              : "hover:ring-1 hover:ring-indigo-300 cursor-grab"
        }`}
        style={{ opacity }}
      >
        {url ? (
          <img
            src={url}
            alt={String(p.label ?? "Gambar Papan Tulis")}
            draggable={false}
            className="h-full w-full select-none object-contain"
            style={{
              transform: `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
              filter: grayscale ? "grayscale(100%) contrast(1.1)" : undefined,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
            Memuat gambar...
          </div>
        )}
      </div>
    </div>
  );
}

function MathBlockOverlay({
  obj,
  view,
  viewportController,
  isSelected,
  onSelect,
  onChangeLatex,
  onVisualize,
  onSynthesize,
  onAnimateManimGx,
  onMove,
  onDelete,
  onDuplicate,
}: MathBlockOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { x: wx, y: wy } = extractTransform(obj);

  useEffect(() => {
    const updateStyle = (v: ViewportState) => {
      if (containerRef.current) {
        const sx = wx * v.scale + v.x;
        const sy = wy * v.scale + v.y;
        containerRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      }
    };
    if (viewportController) {
      const unsub = viewportController.subscribe(updateStyle);
      updateStyle(viewportController.getState());
      return unsub;
    } else {
      updateStyle({ x: view.x, y: view.y, scale: view.scale });
    }
  }, [viewportController, view.x, view.y, view.scale, wx, wy]);

  const props = obj.props as Record<string, unknown>;
  const latex = typeof props.latex === "string" ? props.latex : "";
  const initialScale = viewportController ? viewportController.getState().scale : view.scale;
  const initialX = viewportController ? viewportController.getState().x : view.x;
  const initialY = viewportController ? viewportController.getState().y : view.y;
  const initialSx = wx * initialScale + initialX;
  const initialSy = wy * initialScale + initialY;

  return (
    <div
      ref={containerRef}
      data-testid={`viz-math-block-${obj.id}`}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: `translate3d(${initialSx}px, ${initialSy}px, 0)`,
        zIndex: isSelected ? 24 : 10,
        pointerEvents: "auto",
        willChange: "transform",
      }}
    >
      <MathTextBlockWidget
        id={obj.id}
        latex={latex}
        selected={isSelected}
        originalStrokesCount={Array.isArray(props.originalStrokes) ? props.originalStrokes.length : 0}
        onSelect={onSelect}
        onChangeLatex={onChangeLatex}
        onVisualize={onVisualize}
        onSynthesizeVisual={onSynthesize}
        onAnimateManimGx={onAnimateManimGx}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMovePosition={
          onMove
            ? (dx, dy) => {
                const s = viewportController ? viewportController.getState().scale : view.scale;
                onMove(wx + dx / (s || 1), wy + dy / (s || 1));
              }
            : undefined
        }
      />
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
  selectedIds,
  onSelectIds,
  onDeleteObject,
  onExplainObject,
  onDuplicateObject,
  onEdit2DSolid,
  onMoveObject,
  onUpdateSolidParams,
  onUpdateObjectProps,
  onVisualizeMathBlock,
  onSynthesizeMathBlock,
  onAnimateMathBlock,
  onConvertManimTo3D,
}: WhiteboardOverlayProps) {
  const scene = getActiveScene(boardState);

  const vizObjects = useMemo(
    () =>
      (scene.order ?? [])
        .map((id) => scene.objects[id])
        .filter(
          (obj): obj is BoardObject =>
            obj !== undefined &&
            (obj.object_type === "viz_solid" ||
              obj.object_type === "viz_graph" ||
              obj.object_type === "math_block" ||
              obj.object_type === "simulation" ||
              obj.object_type === "image" ||
              obj.object_type === "textbook_graph" ||
              obj.object_type === "stat_chart" ||
              obj.object_type === "trig_proof" ||
              obj.object_type === "viz_manimgx")
        ),
    [scene]
  );

  // Maximum 3 live WebGL canvases (P10-T07) + Single Selection State Machine
  const [activeSolidIds, setActiveSolidIds] = useState<string[]>([]);
  const [internalSelectedSolidId, setInternalSelectedSolidId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});

  const isControlledSelection = Array.isArray(selectedIds) && typeof onSelectIds === "function";
  const selectedSolidId = isControlledSelection
    ? selectedIds.length === 1 && scene.objects[selectedIds[0]]?.object_type === "viz_solid"
      ? selectedIds[0]
      : null
    : internalSelectedSolidId;

  const setSelectedSolid = useCallback(
    (id: string | null) => {
      if (isControlledSelection && onSelectIds) {
        onSelectIds(id ? [id] : []);
      } else {
        setInternalSelectedSolidId(id);
      }
    },
    [isControlledSelection, onSelectIds]
  );

  const prevSolidCountRef = useRef(0);
  useEffect(() => {
    const solidIds = vizObjects
      .filter((o) => o.object_type === "viz_solid")
      .map((o) => o.id);

    // Auto-select newly added solid so its toolbar is active immediately
    if (solidIds.length > prevSolidCountRef.current && solidIds.length > 0) {
      setSelectedSolid(solidIds[solidIds.length - 1]);
    } else if (solidIds.length === 0 && internalSelectedSolidId) {
      setInternalSelectedSolidId(null);
    }
    prevSolidCountRef.current = solidIds.length;

    setActiveSolidIds((prev) => {
      const MAX_LIVE_SOLIDS = 8;
      const kept = prev.filter((id) => solidIds.includes(id));
      for (const id of solidIds) {
        if (!kept.includes(id)) {
          kept.push(id);
        }
      }
      // Always keep the most recently added / selected solids live (up to 8!)
      return kept.slice(-MAX_LIVE_SOLIDS);
    });
  }, [vizObjects, setSelectedSolid, internalSelectedSolidId]);

  const activateSolid = useCallback((id: string) => {
    setActiveSolidIds((prev) => {
      if (prev.includes(id)) return prev;
      const filtered = prev.filter((item) => item !== id);
      return [...filtered, id].slice(-8);
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
            isSelected={selectedSolidId === obj.id}
            snapshotUrl={snapshots[obj.id]}
            tongchuangMode={tongchuangMode}
            onActivate={() => {
              activateSolid(obj.id);
              setSelectedSolid(obj.id);
            }}
            onSelect={() => setSelectedSolid(obj.id)}
            onDeselect={() => setSelectedSolid(null)}
            onSnapshot={(url) => handleSnapshot(obj.id, url)}
            onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
            onExplain={onExplainObject ? () => onExplainObject(obj) : undefined}
            onDuplicate={onDuplicateObject ? () => onDuplicateObject(obj) : undefined}
            onEdit2D={onEdit2DSolid ? () => onEdit2DSolid(obj) : undefined}
            onMove={onMoveObject ? (nx, ny) => onMoveObject(obj.id, nx, ny) : undefined}
            onUpdateParams={onUpdateSolidParams ? (np) => onUpdateSolidParams(obj.id, np) : undefined}
          />
        ) : obj.object_type === "math_block" ? (
          <MathBlockOverlay
            key={obj.id}
            obj={obj}
            view={view}
            viewportController={viewportController}
            isSelected={Boolean(selectedIds?.includes(obj.id))}
            onSelect={() => setSelectedSolid(obj.id)}
            onChangeLatex={(nextLatex) => {
              onUpdateObjectProps?.(obj.id, { latex: nextLatex });
            }}
            onVisualize={(intent) => {
              onVisualizeMathBlock?.(obj, intent);
            }}
            onSynthesize={
              onSynthesizeMathBlock
                ? (spec) => onSynthesizeMathBlock(obj, spec)
                : undefined
            }
            onAnimateManimGx={
              onAnimateMathBlock
                ? (analysis) => onAnimateMathBlock(obj, analysis)
                : undefined
            }
            onMove={onMoveObject ? (nx, ny) => onMoveObject(obj.id, nx, ny) : undefined}
            onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
            onDuplicate={onDuplicateObject ? () => onDuplicateObject(obj) : undefined}
          />
        ) : obj.object_type === "image" ? (
          <ImageLayerOverlay
            key={obj.id}
            obj={obj}
            view={view}
            viewportController={viewportController}
            isSelected={Boolean(selectedIds?.includes(obj.id))}
            onSelect={() => setSelectedSolid(obj.id)}
            onPatchProps={(patch) => {
              onUpdateObjectProps?.(obj.id, patch);
              if (patch.locked === true) {
                setSelectedSolid(null);
              }
            }}
            onDuplicate={onDuplicateObject ? () => onDuplicateObject(obj) : undefined}
            onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
          />
        ) : obj.object_type === "textbook_graph" ? (
          <ViewportSyncedOverlayBox
            key={obj.id}
            wx={Number((obj.props as Record<string, unknown>).x ?? 220)}
            wy={Number((obj.props as Record<string, unknown>).y ?? 90)}
            w={Number((obj.props as Record<string, unknown>).w ?? 450)}
            h={Number((obj.props as Record<string, unknown>).h ?? 310)}
            zIndex={19}
            view={view}
            viewportController={viewportController}
          >
            <TextbookGraphWidget
              id={obj.id}
              formula={String((obj.props as Record<string, unknown>).formula ?? "y = sin(x), 0 <= x <= 2\\pi")}
              onChangeFormula={(next) => onUpdateObjectProps?.(obj.id, { formula: next })}
              onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
              onMovePosition={
                onMoveObject
                  ? (dx, dy) => {
                      const p = obj.props as Record<string, unknown>;
                      const s = viewportController?.getState().scale ?? view.scale;
                      onMoveObject(obj.id, Number(p.x ?? 220) + dx / (s || 1), Number(p.y ?? 90) + dy / (s || 1));
                    }
                  : undefined
              }
            />
          </ViewportSyncedOverlayBox>
        ) : obj.object_type === "stat_chart" ? (
          <ViewportSyncedOverlayBox
            key={obj.id}
            wx={Number((obj.props as Record<string, unknown>).x ?? 220)}
            wy={Number((obj.props as Record<string, unknown>).y ?? 90)}
            w={Number((obj.props as Record<string, unknown>).w ?? 420)}
            h={Number((obj.props as Record<string, unknown>).h ?? 290)}
            zIndex={19}
            view={view}
            viewportController={viewportController}
          >
            <StatChartWidget
              id={obj.id}
              title={String((obj.props as Record<string, unknown>).title ?? "Diagram Statistik")}
              labels={((obj.props as Record<string, unknown>).labels as string[]) ?? ["A", "B", "C"]}
              values={((obj.props as Record<string, unknown>).values as number[]) ?? [10, 20, 15]}
              onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
              onMovePosition={
                onMoveObject
                  ? (dx, dy) => {
                      const p = obj.props as Record<string, unknown>;
                      const s = viewportController?.getState().scale ?? view.scale;
                      onMoveObject(obj.id, Number(p.x ?? 220) + dx / (s || 1), Number(p.y ?? 90) + dy / (s || 1));
                    }
                  : undefined
              }
            />
          </ViewportSyncedOverlayBox>
        ) : obj.object_type === "trig_proof" ? (
          <ViewportSyncedOverlayBox
            key={obj.id}
            wx={Number((obj.props as Record<string, unknown>).x ?? 220)}
            wy={Number((obj.props as Record<string, unknown>).y ?? 90)}
            w={Number((obj.props as Record<string, unknown>).w ?? 440)}
            h={Number((obj.props as Record<string, unknown>).h ?? 400)}
            zIndex={19}
            view={view}
            viewportController={viewportController}
          >
            <TrigProofWidget
              id={obj.id}
              identityId={String((obj.props as Record<string, unknown>).identityId ?? "double_angle") as TrigIdentityId}
              initialThetaDeg={Number((obj.props as Record<string, unknown>).thetaDeg ?? 28)}
              onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
              onMovePosition={
                onMoveObject
                  ? (dx, dy) => {
                      const p = obj.props as Record<string, unknown>;
                      const s = viewportController?.getState().scale ?? view.scale;
                      onMoveObject(obj.id, Number(p.x ?? 220) + dx / (s || 1), Number(p.y ?? 90) + dy / (s || 1));
                    }
                  : undefined
              }
            />
          </ViewportSyncedOverlayBox>
        ) : obj.object_type === "viz_manimgx" ? (
          <ViewportSyncedOverlayBox
            key={obj.id}
            testId={`viz-manimgx-container-${obj.id}`}
            wx={Number((obj.props as Record<string, unknown>).x ?? 220)}
            wy={Number((obj.props as Record<string, unknown>).y ?? 90)}
            w={Number((obj.props as Record<string, unknown>).w ?? 480)}
            h={Number((obj.props as Record<string, unknown>).h ?? 340)}
            zIndex={Boolean(selectedIds?.includes(obj.id)) ? 25 : 20}
            view={view}
            viewportController={viewportController}
          >
            <ManimGxWidget
              id={obj.id}
              title={String((obj.props as Record<string, unknown>).title ?? "Animasi ManimGX")}
              formulaLatex={String((obj.props as Record<string, unknown>).formulaLatex ?? "y = sin(x)")}
              templateId={String((obj.props as Record<string, unknown>).templateId ?? "function_calculus") as ManimGxTemplateKind}
              sceneCode={String((obj.props as Record<string, unknown>).sceneCode ?? "")}
              selected={Boolean(selectedIds?.includes(obj.id))}
              onSelect={() => setSelectedSolid(obj.id)}
              onUpdateSceneCode={(nextCode) => onUpdateObjectProps?.(obj.id, { sceneCode: nextCode })}
              onConvertToInteractive3D={onConvertManimTo3D ? () => onConvertManimTo3D(obj) : undefined}
              onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
              onMovePosition={
                onMoveObject
                  ? (dx, dy) => {
                      const p = obj.props as Record<string, unknown>;
                      const s = viewportController?.getState().scale ?? view.scale;
                      onMoveObject(obj.id, Number(p.x ?? 220) + dx / (s || 1), Number(p.y ?? 90) + dy / (s || 1));
                    }
                  : undefined
              }
            />
          </ViewportSyncedOverlayBox>
        ) : obj.object_type === "simulation" ? (
          <ViewportSyncedOverlayBox
            key={obj.id}
            testId={`viz-simulation-${obj.id}`}
            wx={Number((obj.props as Record<string, unknown>).x ?? 240)}
            wy={Number((obj.props as Record<string, unknown>).y ?? 100)}
            w={Number((obj.props as Record<string, unknown>).w ?? 360)}
            h={Number((obj.props as Record<string, unknown>).h ?? 310)}
            zIndex={18}
            view={view}
            viewportController={viewportController}
          >
            <SimulationWidget
              id={obj.id}
              templateId={String((obj.props as Record<string, unknown>).template_id ?? "math.function_explorer") as SimulationTemplateId}
              initialConfig={((obj.props as Record<string, unknown>).config as Record<string, unknown>) ?? {}}
              onDelete={onDeleteObject ? () => onDeleteObject(obj.id) : undefined}
              onMovePosition={
                onMoveObject
                  ? (dx, dy) => {
                      const p = obj.props as Record<string, unknown>;
                      const s = viewportController?.getState().scale ?? view.scale;
                      onMoveObject(obj.id, Number(p.x ?? 240) + dx / (s || 1), Number(p.y ?? 100) + dy / (s || 1));
                    }
                  : undefined
              }
            />
          </ViewportSyncedOverlayBox>
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
