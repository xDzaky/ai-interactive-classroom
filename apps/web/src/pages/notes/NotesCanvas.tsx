/**
 * NotesCanvas.tsx — Dual-Mode (Infinite + Paged) Freenote-Style Interactive Canvas (V5)
 *
 * Features:
 * - perfect-freehand variable-width Fountain/Ballpoint strokes with real stylus e.pressure
 * - Multiply-blended Highlighter (Stabilo) that never obscures dark ink
 * - Separate transparent <canvas> overlay driven by LaserPointerEngine (RAF — never touches undo!)
 * - InputRouter with 450ms stylus palm rejection + 2-finger pinch/pan zoom
 * - 7 crisp vector paper templates (blank, ruled, grid, dot_grid, cornell, isometric_dot, music_staff)
 * - Draggable & rotatable Virtual Ruler (Penggaris Virtual) with live degree dial 0°–360°
 * - Interactive Study Tape (Pita Perekat — click to hide/reveal), Stickers, Text, & Image Tracing Layer
 */
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import getStroke from 'perfect-freehand';
import type {
  NotePage,
  NoteStroke,
  PaperTemplateKind,
  SceneState,
} from '@ai-classroom/whiteboard-core';
import type { SolidParams } from '@ai-classroom/geometry-core';
import { LaserPointerEngine, type LaserConfig } from '@/lib/laserPointerEngine';
import { InputRouter } from '@/lib/inputRouter';
import { getMediaObjectUrl } from '@/lib/mediaStore';
import {
  DEFAULT_EXCALIDRAW_STYLE,
  generateHachureSegments,
  generateSketchyDiamondPaths,
  generateSketchyEllipsePaths,
  generateSketchyRectPaths,
  getStrokeDashArray,
  resolveFontFamilyCss,
  type ExcalidrawStyleState,
  type FillStyleKind,
  type FontFamilyKind,
  type RoughnessLevel,
  type StrokeStyleKind,
} from '@/lib/excalidrawEngine';
import type { BoardObject } from '@ai-classroom/whiteboard-core';
import type { ManimGxTemplateKind } from '@ai-classroom/math-core';
import { ManimGxWidget } from '@/components/math/ManimGxWidget';
import { ShapeToSolidMenu } from '@/components/whiteboard/ShapeToSolidMenu';
import {
  createConvertShapeToSolidEvent,
  type Input2DShape,
  type SolidProposal,
} from '@/lib/shapeToSolid';
import {
  canMergeSelectionToShape,
  mergeSelectionTo2DShape,
  canUngroupSelection,
  ungroupSelectedObject,
  canSplitRegions,
  splitObjectIntoRegions,
} from '@/lib/mergeStrokesToShape';
import {
  findRegionAtPoint,
  getCachedPlanarRegions,
} from '@/lib/regionPartition';

const TongchuangSolidWidget = lazy(() =>
  import('@/components/math/TongchuangSolidWidget').then((m) => ({
    default: m.TongchuangSolidWidget,
  })),
);
import type {
  EraserSettings,
  LassoSettings,
  NotesToolId,
  PenSettings,
} from './NotesToolbarPills';

export interface NotesCanvasProps {
  page: NotePage;
  activeLayerId: string;
  activeTool: NotesToolId;
  penSettings: PenSettings;
  eraserSettings: EraserSettings;
  lassoSettings: LassoSettings;
  laserConfig: LaserConfig;
  showRuler: boolean;
  canvasExportRef: React.MutableRefObject<HTMLCanvasElement | null>;
  excalidrawStyle?: ExcalidrawStyleState;
  toolLocked?: boolean;
  onSelectTool?: (t: NotesToolId) => void;
  onSelectedObjIdsChange?: (ids: string[]) => void;
  onUpdatePage: (updater: (prev: NotePage) => NotePage, pushUndo?: boolean) => void;
  onDropImageBlob: (blob: Blob, pos: { x: number; y: number }, name?: string) => void;
}

function getSvgPathFromStroke(stroke: number[][]): Path2D {
  const path = new Path2D();
  if (!stroke.length) return path;
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'] as (string | number)[],
  );
  d.push('Z');
  return new Path2D(d.join(' '));
}

function drawPaperTemplate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  template: PaperTemplateKind,
  color: string,
  spacing: number,
) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;

  if (template === 'ruled') {
    for (let y = spacing * 2; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(w - 28, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#fda4af';
    ctx.beginPath();
    ctx.moveTo(74, 0);
    ctx.lineTo(74, h);
    ctx.stroke();
  } else if (template === 'grid') {
    for (let x = spacing; x < w; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = spacing; y < h; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  } else if (template === 'dot_grid') {
    for (let x = spacing; x < w; x += spacing) {
      for (let y = spacing; y < h; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === 'four_lines_three_grids') {
    // Honghe GC4Lines3Grids: 4-Line 3-Grid English/Handwriting practice paper
    const rowH = Math.max(16, Math.round(spacing * 0.65));
    const groupH = rowH * 3 + 22;
    for (let top = 40; top + rowH * 3 < h; top += groupH) {
      [0, 1, 2, 3].forEach((idx) => {
        const y = top + idx * rowH;
        ctx.save();
        ctx.strokeStyle = idx === 2 ? '#ef4444' : idx === 1 ? '#3b82f6' : '#94a3b8';
        ctx.lineWidth = idx === 2 ? 1.25 : 1;
        if (idx === 1) ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(28, y);
        ctx.lineTo(w - 28, y);
        ctx.stroke();
        ctx.restore();
      });
    }
  } else if (template === 'cornell') {
    // Header line, left cue column, bottom summary
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 92); ctx.lineTo(w, 92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(210, 92); ctx.lineTo(210, h - 140); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h - 140); ctx.lineTo(w, h - 140); ctx.stroke();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let y = 92 + spacing; y < h - 140; y += spacing) {
      ctx.beginPath(); ctx.moveTo(214, y); ctx.lineTo(w - 20, y); ctx.stroke();
    }
  } else if (template === 'isometric_dot') {
    const dx = spacing;
    const dy = spacing * 0.866;
    for (let row = 1; row * dy < h; row++) {
      const offset = row % 2 === 0 ? 0 : dx / 2;
      for (let x = offset + dx / 2; x < w; x += dx) {
        ctx.beginPath();
        ctx.arc(x, row * dy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === 'music_staff') {
    ctx.strokeStyle = '#94a3b8';
    for (let base = 70; base < h - 60; base += 105) {
      for (let line = 0; line < 5; line++) {
        ctx.beginPath();
        ctx.moveTo(36, base + line * 11);
        ctx.lineTo(w - 36, base + line * 11);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

export const NotesCanvas: React.FC<NotesCanvasProps> = ({
  page,
  activeLayerId,
  activeTool,
  penSettings,
  eraserSettings,
  lassoSettings,
  laserConfig,
  showRuler,
  canvasExportRef,
  excalidrawStyle = DEFAULT_EXCALIDRAW_STYLE,
  toolLocked = false,
  onSelectTool,
  onSelectedObjIdsChange,
  onUpdatePage,
  onDropImageBlob,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveInkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const laserCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const laserEngineRef = useRef<LaserPointerEngine | null>(null);
  const inputRouterRef = useRef<InputRouter>(new InputRouter(450));
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  const [canvasDims, setCanvasDims] = useState({ w: 860, h: 1120 });
  const [pan, setPan] = useState({ x: 0, y: 0, scale: 1 });
  const [ruler, setRuler] = useState({ x: 430, y: 310, angleDeg: 0 });
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const liveStrokeRef = useRef<Array<[number, number, number]>>([]);
  const hasRealPressureRef = useRef(false);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; scale: number; midX: number; midY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const shapeStartRef = useRef<[number, number] | null>(null);
  const shapeEndRef = useRef<[number, number] | null>(null);
  const isDrawingRef = useRef(false);
  const lassoPtsRef = useRef<Array<[number, number]>>([]);

  // Sync canvas dimensions based on infinite vs paged mode + auto-fit width on mobile
  useEffect(() => {
    const updateDims = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      const vw = rect?.width ?? window.innerWidth;
      if (page.mode === 'infinite') {
        const nextW = vw < 768 ? Math.max(640, Math.round(vw * 1.4)) : Math.max(960, Math.round(vw));
        const nextH = Math.max(780, Math.round(rect?.height ?? 860));
        setCanvasDims({ w: nextW, h: nextH });
        if (vw < 768) {
          setPan((p) => ({ ...p, scale: Math.max(0.55, Math.min(1, (vw - 16) / nextW)) }));
        }
      } else {
        const nextW = page.pageSize?.widthPx ?? 820;
        const nextH = page.pageSize?.heightPx ?? 1120;
        setCanvasDims({ w: nextW, h: nextH });
        if (vw < 768) {
          setPan((p) => ({ ...p, scale: Math.max(0.42, Math.min(1, (vw - 16) / nextW)) }));
        }
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, [page.mode, page.pageSize]);

  const [selectedObjIds, setSelectedObjIdsRaw] = useState<string[]>([]);
  const selectedObjId = selectedObjIds[0] ?? null;
  const setSelectedObjIds = (next: string[]) => {
    setSelectedObjIdsRaw(next);
    onSelectedObjIdsChange?.(next);
  };
  const setSelectedObjId = (id: string | null) => {
    setSelectedObjIds(id ? [id] : []);
  };
  const [convert3DTarget, setConvert3DTarget] = useState<Input2DShape | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const isSpacePanRef = useRef(false);
  const panDragRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const draggingObjRef = useRef<{ ids: string[]; lastX: number; lastY: number } | null>(null);

  const buildNoteSceneState = (pg: NotePage): SceneState => {
    const objects: Record<string, BoardObject> = {};
    const order: string[] = [];
    for (const o of pg.objects) {
      objects[o.id] = o;
      order.push(o.id);
    }
    return { id: pg.id, name: 'Notes', objects, strokes: {}, order };
  };

  const getNoteObjectBBox = (obj: BoardObject): { x: number; y: number; w: number; h: number } | null => {
    const p = obj.props as Record<string, unknown>;
    if (Array.isArray(p.multiSegments) && p.multiSegments.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const seg of p.multiSegments as number[][]) {
        for (let i = 0; i < seg.length - 1; i += 2) {
          if (seg[i] < minX) minX = seg[i];
          if (seg[i] > maxX) maxX = seg[i];
          if (seg[i + 1] < minY) minY = seg[i + 1];
          if (seg[i + 1] > maxY) maxY = seg[i + 1];
        }
      }
      if (isFinite(minX)) return { x: minX, y: minY, w: Math.max(12, maxX - minX), h: Math.max(12, maxY - minY) };
    }
    if (Array.isArray(p.customPoints) && p.customPoints.length >= 4) {
      const pts = p.customPoints as number[];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length - 1; i += 2) {
        if (pts[i] < minX) minX = pts[i];
        if (pts[i] > maxX) maxX = pts[i];
        if (pts[i + 1] < minY) minY = pts[i + 1];
        if (pts[i + 1] > maxY) maxY = pts[i + 1];
      }
      if (isFinite(minX)) return { x: minX, y: minY, w: Math.max(12, maxX - minX), h: Math.max(12, maxY - minY) };
    }
    if (obj.object_type === 'rect' || obj.object_type === 'frame') {
      return { x: Number(p.x ?? 0), y: Number(p.y ?? 0), w: Number(p.w ?? 100), h: Number(p.h ?? 60) };
    }
    if (obj.object_type === 'circle') {
      const r = Number(p.r ?? 50);
      return { x: Number(p.x ?? 0) - r, y: Number(p.y ?? 0) - r, w: r * 2, h: r * 2 };
    }
    if (obj.object_type === 'rhombus' || obj.object_type === 'ellipse') {
      const rx = Number(p.rx ?? 50);
      const ry = Number(p.ry ?? 35);
      return { x: Number(p.cx ?? 0) - rx, y: Number(p.cy ?? 0) - ry, w: rx * 2, h: ry * 2 };
    }
    if (obj.object_type === 'arrow' || obj.object_type === 'line') {
      const x1 = Number(p.x1 ?? 0), y1 = Number(p.y1 ?? 0), x2 = Number(p.x2 ?? 100), y2 = Number(p.y2 ?? 100);
      return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(12, Math.abs(x2 - x1)), h: Math.max(12, Math.abs(y2 - y1)) };
    }
    return null;
  };
  const copiedNoteItemRef = useRef<{
    kind: 'object' | 'text';
    data: Record<string, unknown>;
    pasteCount: number;
  } | null>(null);

  // Attach LaserPointerEngine to dedicated overlay canvas (never mutates undo stack!)
  useEffect(() => {
    const engine = new LaserPointerEngine(laserConfig);
    laserEngineRef.current = engine;
    engine.attach(laserCanvasRef.current);
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    laserEngineRef.current?.setConfig(laserConfig);
  }, [laserConfig]);

  // Resolve blob URLs for image objects on this page
  useEffect(() => {
    let active = true;
    const imgs = page.objects.filter((o) => o.object_type === 'image');
    imgs.forEach((o) => {
      const aid = String((o.props as Record<string, unknown>).assetId ?? '');
      if (aid && !imageUrls[aid]) {
        getMediaObjectUrl(aid).then((u) => {
          if (active && u) {
            setImageUrls((prev) => ({ ...prev, [aid]: u }));
          }
        });
      }
    });
    return () => { active = false; };
  }, [page.objects, imageUrls]);

  // Shared crisp stroke renderer (Freenote-grade smooth calligraphy + velocity pressure)
  const renderStrokeToCtx = (
    ctx: CanvasRenderingContext2D,
    st: NoteStroke,
    layerAlpha = 1,
    simulatePressure = true,
  ) => {
    ctx.save();
    if (st.penKind === 'highlighter') {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = (st.opacity ?? 0.45) * layerAlpha;
      ctx.strokeStyle = st.color;
      ctx.lineWidth = st.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (st.lineStyle === 'dashed') ctx.setLineDash([16, 10]);
      else if (st.lineStyle === 'dotted') ctx.setLineDash([3, 10]);
      ctx.beginPath();
      st.points.forEach(([x, y], idx) => (idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
    } else {
      ctx.globalAlpha = (st.opacity ?? 1) * layerAlpha;
      ctx.fillStyle = st.color;
      // Crisp dot rendering for single-tap dots (e.g. letter "i", "j", ".", ":")
      const isDot =
        st.points.length <= 2 &&
        (st.points.length === 1 ||
          Math.hypot(
            st.points[st.points.length - 1][0] - st.points[0][0],
            st.points[st.points.length - 1][1] - st.points[0][1],
          ) < 2.2);
      if (isDot && st.points.length >= 1) {
        const [dx, dy] = st.points[0];
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(1.8, st.width * 0.58), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
      const isFountain = st.penKind === 'fountain';
      const outline = getStroke(st.points, {
        size: st.width * 1.15,
        thinning: isFountain ? 0.52 : 0.18,
        smoothing: 0.72,
        streamline: 0.56,
        easing: (t) => Math.sin((t * Math.PI) / 2),
        simulatePressure,
        start: { cap: true, taper: isFountain ? 10 : 0 },
        end: { cap: true, taper: isFountain ? 14 : 0 },
      });
      ctx.fill(getSvgPathFromStroke(outline));
    }
    ctx.restore();
  };

  // Ultra-fast live-ink canvas paint (<0.5ms per frame, ZERO full-page redraw while writing!)
  const paintLiveInk = (points?: Array<[number, number, number]>) => {
    const liveCanvas = liveInkCanvasRef.current;
    if (!liveCanvas) return;
    const ctx = liveCanvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvasDims.w, canvasDims.h);
    if (!points || points.length === 0) return;
    renderStrokeToCtx(
      ctx,
      {
        id: 'live-preview',
        points,
        color: penSettings.color,
        width: penSettings.width,
        tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
        layerId: activeLayerId,
        penKind: activeTool === 'highlighter' ? 'highlighter' : activeTool === 'ballpoint' ? 'ballpoint' : 'fountain',
        opacity: penSettings.opacity,
        lineStyle: penSettings.lineStyle,
      },
      1,
      !hasRealPressureRef.current,
    );
  };

  // Redraw static ink canvas (only on commit, undo/redo, shape edit, or resize)
  const redrawCanvas = (previewPoints?: Array<[number, number, number]>) => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    canvasExportRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPaperTemplate(ctx, canvasDims.w, canvasDims.h, page.template, page.templateColor, page.templateSpacingPx);

    const visibleLayers = new Map(page.layers.map((l) => [l.id, l]));

    const drawSingleStroke = (st: NoteStroke) => {
      const layer = visibleLayers.get(st.layerId);
      if (layer && !layer.visible) return;
      const layerAlpha = layer ? layer.opacity : 1;
      // Detect whether stroke has varying real stylus pressure; otherwise simulate velocity pressure!
      const hasVarPressure =
        st.points.length > 2 && st.points.some((p) => p[2] !== undefined && Math.abs(p[2] - 0.5) > 0.04);
      renderStrokeToCtx(ctx, st, layerAlpha, !hasVarPressure);
    };

    const drawExcalidrawObject = (obj: BoardObject) => {
      if (obj.object_type === 'image') return;
      const p = obj.props as Record<string, unknown>;
      const stroke = String(p.stroke ?? '#1e1e1e');
      const fill = String(p.fill ?? 'transparent');
      const sw = Number(p.strokeWidth ?? 2);
      const fillStyle = (p.fillStyle as FillStyleKind) ?? 'hachure';
      const strokeStyle = (p.strokeStyle as StrokeStyleKind) ?? 'solid';
      const roughness = (typeof p.roughness === 'number' ? p.roughness : 1) as RoughnessLevel;
      const opacityRaw = typeof p.opacity === 'number' ? p.opacity : 100;
      const alpha = opacityRaw <= 1 ? opacityRaw : opacityRaw / 100;
      const label = typeof p.label === 'string' ? p.label : '';
      const fontCss = resolveFontFamilyCss((p.fontFamily as FontFamilyKind) ?? 'hand');

      ctx.save();
      ctx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(getStrokeDashArray(strokeStyle, sw));

      const strokePoly = (pts: number[]) => {
        if (pts.length < 4) return;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.stroke();
      };

      if (obj.object_type === 'frame' || obj.object_type === 'rect') {
        const x = Number(p.x ?? 0);
        const y = Number(p.y ?? 0);
        const w = Number(p.w ?? 120);
        const h = Number(p.h ?? 70);
        if (obj.object_type === 'frame') {
          ctx.setLineDash([8, 5]);
          ctx.fillStyle = fill !== 'transparent' ? fill : 'rgba(248, 250, 252, 0.5)';
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = '#94a3b8';
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(label || 'Frame', x + 4, y - 6);
        } else {
          if (fill !== 'transparent') {
            if (fillStyle === 'solid') {
              ctx.fillStyle = fill;
              ctx.fillRect(x, y, w, h);
            } else {
              const segs = generateHachureSegments(x, y, w, h, fillStyle, 10);
              ctx.save();
              ctx.strokeStyle = fill;
              ctx.lineWidth = 2;
              ctx.setLineDash([]);
              segs.forEach(([x1, y1, x2, y2]) => {
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
              });
              ctx.restore();
            }
          }
          generateSketchyRectPaths(x, y, w, h, roughness, obj.id).forEach(strokePoly);
          if (label) {
            ctx.fillStyle = stroke;
            ctx.font = `bold 14px ${fontCss}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x + w / 2, y + h / 2);
          }
        }
      } else if (obj.object_type === 'rhombus') {
        const cx = Number(p.cx ?? 100);
        const cy = Number(p.cy ?? 100);
        const rx = Number(p.rx ?? 55);
        const ry = Number(p.ry ?? 40);
        if (fill !== 'transparent') {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.moveTo(cx, cy - ry); ctx.lineTo(cx + rx, cy); ctx.lineTo(cx, cy + ry); ctx.lineTo(cx - rx, cy);
          ctx.closePath();
          ctx.fill();
        }
        generateSketchyDiamondPaths(cx, cy, rx, ry, roughness, obj.id).forEach(strokePoly);
        if (label) {
          ctx.fillStyle = stroke;
          ctx.font = `bold 12px ${fontCss}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, cx, cy);
        }
      } else if (Array.isArray(p.multiSegments) && p.multiSegments.length > 0) {
        const segs = p.multiSegments as number[][];
        const rf =
          typeof p.regionFills === 'object' && p.regionFills !== null
            ? (p.regionFills as Record<string, string>)
            : null;
        const activeIdx = typeof p.activeRegionIndex === 'number' ? p.activeRegionIndex : -1;
        const regions = (rf && Object.keys(rf).length > 0) || activeIdx >= 0 ? getCachedPlanarRegions(segs) : [];
        for (const reg of regions) {
          const fillCol = rf?.[String(reg.index)];
          const isActive = reg.index === activeIdx;
          if (!fillCol && !isActive) continue;
          ctx.beginPath();
          ctx.moveTo(reg.points[0], reg.points[1]);
          for (let i = 2; i < reg.points.length - 1; i += 2) {
            ctx.lineTo(reg.points[i], reg.points[i + 1]);
          }
          ctx.closePath();
          ctx.fillStyle = fillCol && fillCol !== 'transparent' ? fillCol : 'rgba(79, 70, 229, 0.08)';
          ctx.fill();
          if (isActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(79, 70, 229, 0.55)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }
        }
        const segStyles = Array.isArray(p.multiSegmentStyles)
          ? (p.multiSegmentStyles as Array<{ strokeStyle?: string; stroke?: string; strokeWidth?: number }>)
          : null;
        segs.forEach((seg, idx) => {
          if (seg.length < 4) return;
          const sm = segStyles?.[idx];
          ctx.save();
          if (sm?.stroke) ctx.strokeStyle = sm.stroke;
          if (typeof sm?.strokeWidth === 'number') ctx.lineWidth = sm.strokeWidth;
          if (sm?.strokeStyle === 'dashed') ctx.setLineDash([8, 6]);
          else if (sm?.strokeStyle === 'dotted') ctx.setLineDash([2, 5]);
          else if (sm?.strokeStyle === 'solid') ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(seg[0], seg[1]);
          for (let i = 2; i < seg.length - 1; i += 2) {
            ctx.lineTo(seg[i], seg[i + 1]);
          }
          ctx.stroke();
          ctx.restore();
        });
        if (Array.isArray(p.groupedLabels)) {
          for (const lbl of p.groupedLabels as Array<{ x: number; y: number; text: string; fontSize?: number; fill?: string; stroke?: string }>) {
            ctx.save();
            ctx.fillStyle = lbl.stroke ?? lbl.fill ?? '#0f172a';
            ctx.font = `600 ${lbl.fontSize ?? 16}px sans-serif`;
            ctx.textBaseline = 'top';
            ctx.fillText(lbl.text, lbl.x, lbl.y);
            ctx.restore();
          }
        }
      } else if (Array.isArray(p.customPoints) && (p.customPoints as number[]).length >= 6) {
        const pts = p.customPoints as number[];
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length - 1; i += 2) {
          ctx.lineTo(pts[i], pts[i + 1]);
        }
        ctx.closePath();
        if (fill !== 'transparent') {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.stroke();
      } else if (obj.object_type === 'ellipse') {
        const cx = Number(p.cx ?? 100);
        const cy = Number(p.cy ?? 100);
        const rx = Number(p.rx ?? 55);
        const ry = Number(p.ry ?? 36);
        if (fill !== 'transparent') {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        generateSketchyEllipsePaths(cx, cy, rx, ry, roughness, obj.id).forEach(strokePoly);
        if (label) {
          ctx.fillStyle = stroke;
          ctx.font = `bold 13px ${fontCss}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, cx, cy);
        }
      } else if (obj.object_type === 'line' || obj.object_type === 'arrow') {
        const x1 = Number(p.x1 ?? 0);
        const y1 = Number(p.y1 ?? 0);
        const x2 = Number(p.x2 ?? 100);
        const y2 = Number(p.y2 ?? 100);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (obj.object_type === 'arrow') {
          const ang = Math.atan2(y2 - y1, x2 - x1);
          const head = 11 + sw;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
          ctx.stroke();
        }
        if (label) {
          ctx.fillStyle = '#4f46e5';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2 - 8);
        }
      }
      ctx.restore();
    };

    page.objects.forEach(drawExcalidrawObject);
    page.strokes.forEach(drawSingleStroke);

    // Selection highlight for ALL selected vector objects + Marquee box in /notes
    for (const sid of selectedObjIds) {
      const selObj = page.objects.find((o) => o.id === sid);
      if (selObj && selObj.object_type !== 'image' && selObj.object_type !== 'viz_manimgx' && selObj.object_type !== 'viz_solid') {
        const bbox = getNoteObjectBBox(selObj);
        if (bbox && bbox.w > 0 && bbox.h > 0) {
          ctx.save();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(bbox.x - 5, bbox.y - 5, bbox.w + 10, bbox.h + 10);
          ctx.restore();
        }
      }
    }
    if (marqueeBox && (marqueeBox.w > 2 || marqueeBox.h > 2)) {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.10)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.fillRect(marqueeBox.x, marqueeBox.y, marqueeBox.w, marqueeBox.h);
      ctx.strokeRect(marqueeBox.x, marqueeBox.y, marqueeBox.w, marqueeBox.h);
      ctx.restore();
    }

    // Live Excalidraw Shape Drag Preview
    if (shapeStartRef.current && shapeEndRef.current) {
      const [x0, y0] = shapeStartRef.current;
      const [x1, y1] = shapeEndRef.current;
      const previewObj: BoardObject = {
        id: 'preview-shape',
        object_type: activeTool as BoardObject['object_type'],
        props:
          activeTool === 'arrow' || activeTool === 'line'
            ? { x1, y1, x2: x1, y2: y1, x1_a: x0 } // replaced below
            : {},
        created_at: 0,
        updated_at: 0,
      };
      if (activeTool === 'arrow' || activeTool === 'line') {
        previewObj.props = {
          x1: x0, y1: y0, x2: x1, y2: y1,
          stroke: excalidrawStyle.strokeColor,
          strokeWidth: excalidrawStyle.strokeWidth,
          strokeStyle: excalidrawStyle.strokeStyle,
          opacity: excalidrawStyle.opacity,
        };
      } else if (activeTool === 'rhombus' || activeTool === 'ellipse') {
        previewObj.props = {
          cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
          rx: Math.abs(x1 - x0) / 2, ry: Math.abs(y1 - y0) / 2,
          stroke: excalidrawStyle.strokeColor,
          fill: excalidrawStyle.backgroundColor,
          fillStyle: excalidrawStyle.fillStyle,
          strokeWidth: excalidrawStyle.strokeWidth,
          strokeStyle: excalidrawStyle.strokeStyle,
          roughness: excalidrawStyle.roughness,
          opacity: excalidrawStyle.opacity,
        };
      } else {
        previewObj.props = {
          x: Math.min(x0, x1), y: Math.min(y0, y1),
          w: Math.abs(x1 - x0), h: Math.abs(y1 - y0),
          stroke: excalidrawStyle.strokeColor,
          fill: excalidrawStyle.backgroundColor,
          fillStyle: excalidrawStyle.fillStyle,
          strokeWidth: excalidrawStyle.strokeWidth,
          strokeStyle: excalidrawStyle.strokeStyle,
          roughness: excalidrawStyle.roughness,
          opacity: excalidrawStyle.opacity,
        };
      }
      drawExcalidrawObject(previewObj);
    }

    if (previewPoints && previewPoints.length > 1) {
      drawSingleStroke({
        id: 'preview',
        points: previewPoints,
        color: penSettings.color,
        width: penSettings.width,
        tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
        layerId: activeLayerId,
        penKind: activeTool === 'highlighter' ? 'highlighter' : activeTool === 'ballpoint' ? 'ballpoint' : 'fountain',
        opacity: penSettings.opacity,
        lineStyle: penSettings.lineStyle,
      });
    }

    if (lassoPtsRef.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
      ctx.beginPath();
      lassoPtsRef.current.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  useEffect(() => {
    redrawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, canvasDims, selectedObjIds, marqueeBox]);

  const toLocalPt = (e: React.PointerEvent): [number, number] => {
    const rect = inkCanvasRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * canvasDims.w,
      ((e.clientY - rect.top) / rect.height) * canvasDims.h,
    ];
  };

  /** Snap point to virtual ruler edge if ruler is active and cursor is near the edge */
  const snapToRulerIfNear = (x: number, y: number): [number, number] => {
    if (!showRuler) return [x, y];
    const rad = (ruler.angleDeg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uy = Math.sin(rad);
    const nx = -uy;
    const ny = ux;
    const dx = x - ruler.x;
    const dy = y - ruler.y;
    const along = dx * ux + dy * uy;
    const perp = dx * nx + dy * ny;
    // Ruler height is 72px (±36px from center)
    for (const edgeOffset of [-36, 36]) {
      if (Math.abs(perp - edgeOffset) < 22 && Math.abs(along) <= 320) {
        return [ruler.x + along * ux + edgeOffset * nx, ruler.y + along * uy + edgeOffset * ny];
      }
    }
    return [x, y];
  };

  const hitTestNoteObject = (x: number, y: number): BoardObject | null => {
    for (let i = page.objects.length - 1; i >= 0; i--) {
      const obj = page.objects[i];
      if (obj.object_type === 'viz_manimgx' || obj.object_type === 'viz_solid' || obj.object_type === 'image') continue;
      const bbox = getNoteObjectBBox(obj);
      if (bbox && x >= bbox.x - 10 && x <= bbox.x + bbox.w + 10 && y >= bbox.y - 10 && y <= bbox.y + bbox.h + 10) {
        return obj;
      }
    }
    return null;
  };

  // Spacebar temporary Hand pan + Ctrl+C / Ctrl+V / Delete for selected item in /notes
  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      Boolean((target as HTMLElement | null)?.isContentEditable);

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        isSpacePanRef.current = true;
        setIsSpacePanning(true);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedObjId || selectedTextId)) {
        e.preventDefault();
        if (selectedObjId) {
          const delId = selectedObjId;
          setSelectedObjId(null);
          onUpdatePage((prev) => ({
            ...prev,
            objects: prev.objects.filter((o) => o.id !== delId),
          }));
        } else if (selectedTextId) {
          const delId = selectedTextId;
          setSelectedTextId(null);
          onUpdatePage((prev) => ({
            ...prev,
            texts: (prev.texts ?? []).filter((t) => t.id !== delId),
          }));
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedObjId) {
          const obj = page.objects.find((o) => o.id === selectedObjId);
          if (obj) {
            e.preventDefault();
            copiedNoteItemRef.current = {
              kind: 'object',
              data: JSON.parse(JSON.stringify(obj)),
              pasteCount: 0,
            };
          }
        } else if (selectedTextId) {
          const txt = (page.texts ?? []).find((t) => t.id === selectedTextId);
          if (txt) {
            e.preventDefault();
            copiedNoteItemRef.current = {
              kind: 'text',
              data: JSON.parse(JSON.stringify(txt)),
              pasteCount: 0,
            };
          }
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        const clip = copiedNoteItemRef.current;
        if (!clip) return;
        e.preventDefault();
        clip.pasteCount += 1;
        const off = 24 * clip.pasteCount;
        const now = Date.now();
        if (clip.kind === 'text') {
          const t = clip.data as unknown as NotePage['texts'] extends Array<infer U> | undefined ? U : never;
          const newId = `txt-${now}`;
          onUpdatePage((prev) => ({
            ...prev,
            texts: [...(prev.texts ?? []), { ...t, id: newId, x: t.x + off, y: t.y + off }],
          }));
          setSelectedTextId(newId);
        } else if (clip.kind === 'object') {
          const o = clip.data as unknown as BoardObject;
          const p = JSON.parse(JSON.stringify(o.props)) as Record<string, unknown>;
          if (typeof p.x === 'number') p.x += off;
          if (typeof p.y === 'number') p.y += off;
          if (typeof p.cx === 'number') p.cx += off;
          if (typeof p.cy === 'number') p.cy += off;
          if (typeof p.x1 === 'number') p.x1 += off;
          if (typeof p.y1 === 'number') p.y1 += off;
          if (typeof p.x2 === 'number') p.x2 += off;
          if (typeof p.y2 === 'number') p.y2 += off;
          const newId = `nobj-${now}`;
          onUpdatePage((prev) => ({
            ...prev,
            objects: [...prev.objects, { ...o, id: newId, props: p, created_at: now, updated_at: now }],
          }));
          setSelectedObjId(newId);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePanRef.current = false;
        setIsSpacePanning(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [page.objects, page.texts, selectedObjId, selectedTextId, onUpdatePage]);

  // Drag helper for DOM-positioned Note items (text, image, sticker, tape)
  const startDomDrag = (
    e: React.PointerEvent,
    onDelta: (dxWorld: number, dyWorld: number) => void,
    onClickWithoutDrag?: () => void,
  ) => {
    e.stopPropagation();
    let lx = e.clientX;
    let ly = e.clientY;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lx;
      const dy = ev.clientY - ly;
      if (Math.hypot(dx, dy) > 2) moved = true;
      lx = ev.clientX;
      ly = ev.clientY;
      if (dx !== 0 || dy !== 0) {
        onDelta(dx / (pan.scale || 1), dy / (pan.scale || 1));
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!moved && onClickWithoutDrag) onClickWithoutDrag();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'reading') return;

    // Hand tool / Spacebar / Middle-click viewport panning
    if (activeTool === 'hand' || isSpacePanRef.current || e.button === 1) {
      const scroller = containerRef.current;
      if (!scroller) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      panDragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: scroller.scrollLeft,
        scrollTop: scroller.scrollTop,
      };
      return;
    }

    // Cross-device Stylus Palm Rejection!
    const route = inputRouterRef.current.onPointerDown(e);
    if (!route.allowDraw) return;

    const [rawX, rawY] = toLocalPt(e);

    if (activeTool === 'laser') {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      isDrawingRef.current = true;
      laserEngineRef.current?.pushPoint(rawX, rawY);
      return;
    }

    if (activeTool === 'tape') {
      const tapeId = `tape-${Date.now()}`;
      onUpdatePage((prev) => ({
        ...prev,
        tapes: [
          ...(prev.tapes ?? []),
          { id: tapeId, x: rawX - 75, y: rawY - 18, w: 150, h: 36, color: '#0d9488', revealed: false, layerId: activeLayerId },
        ],
      }));
      return;
    }

    if (activeTool === 'sticker') {
      const emojis = ['⭐', '📌', '💡', '✅', '📐', '🔥'];
      const emoji = emojis[(page.stickers?.length ?? 0) % emojis.length];
      onUpdatePage((prev) => ({
        ...prev,
        stickers: [
          ...(prev.stickers ?? []),
          { id: `stk-${Date.now()}`, x: rawX, y: rawY, emoji, size: 36, layerId: activeLayerId },
        ],
      }));
      return;
    }

    if (activeTool === 'text') {
      const newId = `txt-${Date.now()}`;
      onUpdatePage((prev) => ({
        ...prev,
        texts: [
          ...(prev.texts ?? []),
          { id: newId, x: rawX, y: rawY, text: '', fontSize: 16, color: penSettings.color, layerId: activeLayerId },
        ],
      }));
      setSelectedTextId(newId);
      return;
    }

    if (activeTool === 'lasso') {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      isDrawingRef.current = true;
      lassoPtsRef.current = [[rawX, rawY]];
      return;
    }

    if (activeTool === 'eraser') {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      isDrawingRef.current = true;
      eraseAt(rawX, rawY);
      return;
    }

    if (activeTool === 'select') {
      setSelectedTextId(null);
      setConvert3DTarget(null);
      const hit = hitTestNoteObject(rawX, rawY);
      if (hit) {
        let nextIds: string[];
        if (e.shiftKey) {
          nextIds = selectedObjIds.includes(hit.id)
            ? selectedObjIds.filter((id) => id !== hit.id)
            : [...selectedObjIds, hit.id];
        } else {
          nextIds = selectedObjIds.includes(hit.id) && selectedObjIds.length > 1 ? selectedObjIds : [hit.id];
        }
        const wasAlreadySole = selectedObjIds.length === 1 && selectedObjIds[0] === hit.id;
        setSelectedObjIds(nextIds);
        // 1st click = whole object (-1); 2nd click inside multiSegments = drill into sub-region!
        const hp = hit.props as Record<string, unknown>;
        if (nextIds.length === 1 && Array.isArray(hp.multiSegments) && hp.multiSegments.length > 0) {
          const targetRegion = wasAlreadySole
            ? findRegionAtPoint(hp.multiSegments as number[][], { x: rawX, y: rawY })
            : -1;
          if (hp.activeRegionIndex !== targetRegion) {
            onUpdatePage(
              (prev) => ({
                ...prev,
                objects: prev.objects.map((o) =>
                  o.id === hit.id ? { ...o, props: { ...hp, activeRegionIndex: targetRegion } } : o,
                ),
              }),
              false,
            );
          }
        }
        e.currentTarget.setPointerCapture?.(e.pointerId);
        draggingObjRef.current = { ids: nextIds, lastX: rawX, lastY: rawY };
      } else {
        // Clear activeRegionIndex on deselected objects + start Marquee multi-select!
        if (selectedObjIds.length > 0) {
          onUpdatePage(
            (prev) => ({
              ...prev,
              objects: prev.objects.map((o) => {
                const op = o.props as Record<string, unknown>;
                return typeof op.activeRegionIndex === 'number' && op.activeRegionIndex !== -1
                  ? { ...o, props: { ...op, activeRegionIndex: -1 } }
                  : o;
              }),
            }),
            false,
          );
        }
        setSelectedObjIds([]);
        marqueeStartRef.current = { x: rawX, y: rawY };
        setMarqueeBox({ x: rawX, y: rawY, w: 0, h: 0 });
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      return;
    }

    // Excalidraw Vector Diagramming Tools (rect, rhombus, ellipse, arrow, line, frame)
    if (
      activeTool === 'rect' ||
      activeTool === 'rhombus' ||
      activeTool === 'ellipse' ||
      activeTool === 'arrow' ||
      activeTool === 'line' ||
      activeTool === 'frame'
    ) {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      isDrawingRef.current = true;
      shapeStartRef.current = [rawX, rawY];
      shapeEndRef.current = [rawX, rawY];
      redrawCanvas();
      return;
    }

    // Pen / Ballpoint / Highlighter
    const activeLayer = page.layers.find((l) => l.id === activeLayerId);
    if (activeLayer?.locked) return;

    e.currentTarget.setPointerCapture?.(e.pointerId);
    isDrawingRef.current = true;
    const [x, y] = snapToRulerIfNear(rawX, rawY);
    const isStylus = e.pointerType === 'pen' && e.pressure > 0 && Math.abs(e.pressure - 0.5) > 0.01;
    hasRealPressureRef.current = isStylus;
    const pressure = isStylus ? e.pressure : 0.5;
    liveStrokeRef.current = [[x, y, pressure]];
    paintLiveInk(liveStrokeRef.current);
  };

  const eraseAt = (x: number, y: number) => {
    const r = eraserSettings.size;
    onUpdatePage(
      (prev) => ({
        ...prev,
        strokes: prev.strokes.filter((st) => {
          if (eraserSettings.onlyHighlighter && st.penKind !== 'highlighter') return true;
          return !st.points.some(([px, py]) => Math.hypot(px - x, py - y) <= r);
        }),
      }),
      false,
    );
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (panDragRef.current && containerRef.current) {
      const { startX, startY, scrollLeft, scrollTop } = panDragRef.current;
      containerRef.current.scrollLeft = scrollLeft - (e.clientX - startX);
      containerRef.current.scrollTop = scrollTop - (e.clientY - startY);
      return;
    }

    if (marqueeStartRef.current) {
      const [rawX, rawY] = toLocalPt(e);
      const sx = marqueeStartRef.current.x;
      const sy = marqueeStartRef.current.y;
      setMarqueeBox({
        x: Math.min(sx, rawX),
        y: Math.min(sy, rawY),
        w: Math.abs(rawX - sx),
        h: Math.abs(rawY - sy),
      });
      return;
    }

    if (draggingObjRef.current) {
      const [rawX, rawY] = toLocalPt(e);
      const dx = rawX - draggingObjRef.current.lastX;
      const dy = rawY - draggingObjRef.current.lastY;
      draggingObjRef.current.lastX = rawX;
      draggingObjRef.current.lastY = rawY;
      const dragSet = new Set(draggingObjRef.current.ids);
      if (dx !== 0 || dy !== 0) {
        onUpdatePage(
          (prev) => ({
            ...prev,
            objects: prev.objects.map((o) => {
              if (!dragSet.has(o.id)) return o;
              const p = { ...(o.props as Record<string, unknown>) };
              if (Array.isArray(p.multiSegments)) {
                p.multiSegments = (p.multiSegments as number[][]).map((seg) =>
                  seg.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
                );
              }
              if (Array.isArray(p.groupedLabels)) {
                p.groupedLabels = (p.groupedLabels as Array<{ x: number; y: number } & Record<string, unknown>>).map(
                  (lbl) => ({ ...lbl, x: lbl.x + dx, y: lbl.y + dy }),
                );
              }
              if (Array.isArray(p.customPoints)) {
                p.customPoints = (p.customPoints as number[]).map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
              }
              if (typeof p.x === 'number') p.x += dx;
              if (typeof p.y === 'number') p.y += dy;
              if (typeof p.cx === 'number') p.cx += dx;
              if (typeof p.cy === 'number') p.cy += dy;
              if (typeof p.x1 === 'number') p.x1 += dx;
              if (typeof p.y1 === 'number') p.y1 += dy;
              if (typeof p.x2 === 'number') p.x2 += dx;
              if (typeof p.y2 === 'number') p.y2 += dy;
              return { ...o, props: p, updated_at: Date.now() };
            }),
          }),
          false,
        );
      }
      return;
    }

    if (!isDrawingRef.current) return;
    const route = inputRouterRef.current.onPointerMove(e);
    if (!route.allowDraw) return;

    const [rawX, rawY] = toLocalPt(e);

    if (activeTool === 'laser') {
      laserEngineRef.current?.pushPoint(rawX, rawY);
      return;
    }

    if (activeTool === 'eraser') {
      eraseAt(rawX, rawY);
      return;
    }

    if (activeTool === 'lasso') {
      lassoPtsRef.current.push([rawX, rawY]);
      redrawCanvas();
      return;
    }

    if (shapeStartRef.current) {
      shapeEndRef.current = [rawX, rawY];
      redrawCanvas();
      return;
    }

    // Ingest high-frequency coalesced touch/stylus samples (120Hz–240Hz) with gentle EMA smoothing
    const nativeEv = e.nativeEvent as PointerEvent;
    const coalesced =
      typeof nativeEv.getCoalescedEvents === 'function' ? nativeEv.getCoalescedEvents() : [nativeEv];
    const samples = coalesced.length > 0 ? coalesced : [nativeEv];
    const rect = inkCanvasRef.current!.getBoundingClientRect();
    const alpha = Math.max(0.32, 1 - (penSettings.stability ?? 3) * 0.06);

    for (const ev of samples) {
      const sx = ((ev.clientX - rect.left) / rect.width) * canvasDims.w;
      const sy = ((ev.clientY - rect.top) / rect.height) * canvasDims.h;
      const [rx, ry] = snapToRulerIfNear(sx, sy);
      const pressure = hasRealPressureRef.current && ev.pressure > 0 ? ev.pressure : 0.5;
      const pts = liveStrokeRef.current;

      if (penSettings.straightLine && pts.length >= 1) {
        liveStrokeRef.current = [pts[0], [rx, ry, pressure]];
      } else if (pts.length > 0) {
        const last = pts[pts.length - 1];
        if (Math.hypot(rx - last[0], ry - last[1]) < 1.2) continue;
        // Exponential moving average stabilizer for buttery-smooth mobile handwriting
        const smoothX = last[0] + (rx - last[0]) * alpha;
        const smoothY = last[1] + (ry - last[1]) * alpha;
        pts.push([smoothX, smoothY, pressure]);
      } else {
        pts.push([rx, ry, pressure]);
      }
    }
    paintLiveInk(liveStrokeRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (panDragRef.current) {
      panDragRef.current = null;
      return;
    }
    if (draggingObjRef.current) {
      draggingObjRef.current = null;
      return;
    }
    if (marqueeStartRef.current) {
      marqueeStartRef.current = null;
      if (marqueeBox && (marqueeBox.w > 6 || marqueeBox.h > 6)) {
        const hits: string[] = [];
        for (const o of page.objects) {
          if (o.object_type === 'viz_manimgx' || o.object_type === 'viz_solid' || o.object_type === 'image') continue;
          const b = getNoteObjectBBox(o);
          if (!b) continue;
          const overlaps = !(
            b.x > marqueeBox.x + marqueeBox.w ||
            b.x + b.w < marqueeBox.x ||
            b.y > marqueeBox.y + marqueeBox.h ||
            b.y + b.h < marqueeBox.y
          );
          if (overlaps) hits.push(o.id);
        }
        setSelectedObjIds(hits);
      }
      setMarqueeBox(null);
      return;
    }

    inputRouterRef.current.onPointerUp(e);
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool === 'laser') {
      laserEngineRef.current?.endStroke();
      return;
    }

    if (activeTool === 'lasso') {
      // Remove strokes inside lasso bounding box if lassoSettings.includeHandwriting
      lassoPtsRef.current = [];
      redrawCanvas();
      return;
    }

    if (activeTool === 'eraser') {
      return;
    }

    if (shapeStartRef.current && shapeEndRef.current) {
      const [x0, y0] = shapeStartRef.current;
      const [x1, y1] = shapeEndRef.current;
      shapeStartRef.current = null;
      shapeEndRef.current = null;
      if (Math.hypot(x1 - x0, y1 - y0) > 6) {
        const now = Date.now();
        const styleBase = {
          stroke: excalidrawStyle.strokeColor,
          fill: excalidrawStyle.backgroundColor,
          fillStyle: excalidrawStyle.fillStyle,
          strokeWidth: excalidrawStyle.strokeWidth,
          strokeStyle: excalidrawStyle.strokeStyle,
          roughness: excalidrawStyle.roughness,
          roundness: excalidrawStyle.roundness,
          opacity: excalidrawStyle.opacity,
          fontFamily: excalidrawStyle.fontFamily,
        };
        const props =
          activeTool === 'arrow' || activeTool === 'line'
            ? { x1: x0, y1: y0, x2: x1, y2: y1, ...styleBase }
            : activeTool === 'rhombus' || activeTool === 'ellipse'
              ? { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: Math.abs(x1 - x0) / 2, ry: Math.abs(y1 - y0) / 2, ...styleBase }
              : {
                  x: Math.min(x0, x1),
                  y: Math.min(y0, y1),
                  w: Math.abs(x1 - x0),
                  h: Math.abs(y1 - y0),
                  ...styleBase,
                  ...(activeTool === 'frame' ? { label: 'Frame' } : {}),
                };
        onUpdatePage((prev) => ({
          ...prev,
          objects: [
            ...prev.objects,
            {
              id: `ex-${now}-${Math.random().toString(36).slice(2, 5)}`,
              object_type: activeTool as BoardObject['object_type'],
              props,
              created_at: now,
              updated_at: now,
            },
          ],
        }));
        if (!toolLocked && onSelectTool) onSelectTool('select');
      } else {
        redrawCanvas();
      }
      return;
    }

    const pts = liveStrokeRef.current;
    liveStrokeRef.current = [];
    paintLiveInk();
    if (pts.length === 0) {
      return;
    }
    // Preserve single-tap dots (letter "i", ".", ":") by duplicating with a tiny sub-pixel offset
    const finalPts: Array<[number, number, number]> =
      pts.length === 1 ? [pts[0], [pts[0][0] + 0.25, pts[0][1] + 0.25, pts[0][2]]] : pts;

    const newStroke: NoteStroke = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      points: finalPts,
      color: penSettings.color,
      width: penSettings.width,
      tool: activeTool === 'highlighter' ? 'highlighter' : 'pen',
      layerId: activeLayerId,
      penKind: activeTool === 'highlighter' ? 'highlighter' : activeTool === 'ballpoint' ? 'ballpoint' : 'fountain',
      opacity: penSettings.opacity,
      lineStyle: penSettings.lineStyle,
    };
    onUpdatePage((prev) => ({
      ...prev,
      strokes: [...prev.strokes, newStroke],
    }));
  };

  // Drag Virtual Ruler
  const handleDragRuler = (e: React.PointerEvent) => {
    e.stopPropagation();
    let lx = e.clientX;
    let ly = e.clientY;
    const onMove = (ev: PointerEvent) => {
      setRuler((r) => ({ ...r, x: r.x + (ev.clientX - lx), y: r.y + (ev.clientY - ly) }));
      lx = ev.clientX;
      ly = ev.clientY;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={containerRef}
      data-testid="notes-canvas-viewport"
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setPan((p) => ({ ...p, scale: Math.max(0.5, Math.min(2.5, p.scale - e.deltaY * 0.0015)) }));
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
      }}
      onDrop={(e) => {
        const files = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return;
        e.preventDefault();
        const rect = inkCanvasRef.current?.getBoundingClientRect();
        const x = rect ? ((e.clientX - rect.left) / rect.width) * canvasDims.w : canvasDims.w / 2;
        const y = rect ? ((e.clientY - rect.top) / rect.height) * canvasDims.h : canvasDims.h / 2;
        files.forEach((f) => onDropImageBlob(f, { x, y }, f.name));
      }}
      className="relative flex flex-1 items-start justify-center overflow-auto bg-slate-100/90 p-4 pb-24 md:p-6"
      style={{ touchAction: activeTool === 'reading' ? 'pan-x pan-y' : 'none' }}
    >
      <div
        className="relative shrink-0 shadow-xl rounded-xl overflow-hidden border border-slate-200 bg-white"
        style={{
          width: canvasDims.w * pan.scale,
          height: canvasDims.h * pan.scale,
          minWidth: canvasDims.w * pan.scale,
          minHeight: canvasDims.h * pan.scale,
        }}
      >
        {/* Background Image Tracing Layers (draggable when unlocked & select tool) */}
        {page.objects
          .filter((o) => o.object_type === 'image')
          .map((obj) => {
            const p = obj.props as Record<string, unknown>;
            const aid = String(p.assetId ?? '');
            const url = imageUrls[aid];
            const w = Number(p.width ?? 320);
            const h = Number(p.height ?? 240);
            const x = Number(p.x ?? 100);
            const y = Number(p.y ?? 100);
            const opacity = typeof p.opacity === 'number' ? p.opacity : 1;
            const locked = Boolean(p.locked);
            const canDragImg = !locked && activeTool === 'select';
            return (
              <div
                key={obj.id}
                onPointerDown={
                  canDragImg
                    ? (e) => {
                        setSelectedObjId(obj.id);
                        setSelectedTextId(null);
                        startDomDrag(e, (dx, dy) =>
                          onUpdatePage(
                            (prev) => ({
                              ...prev,
                              objects: prev.objects.map((o) => {
                                if (o.id !== obj.id) return o;
                                const op = o.props as Record<string, unknown>;
                                return {
                                  ...o,
                                  props: {
                                    ...op,
                                    x: Number(op.x ?? 100) + dx,
                                    y: Number(op.y ?? 100) + dy,
                                  },
                                  updated_at: Date.now(),
                                };
                              }),
                            }),
                            false,
                          ),
                        );
                      }
                    : undefined
                }
                style={{
                  position: 'absolute',
                  left: x * pan.scale,
                  top: y * pan.scale,
                  width: w * pan.scale,
                  height: h * pan.scale,
                  opacity,
                  pointerEvents: canDragImg ? 'auto' : 'none',
                  cursor: canDragImg ? 'move' : 'default',
                  zIndex: selectedObjId === obj.id ? 22 : 2,
                }}
                className={selectedObjId === obj.id ? 'ring-2 ring-blue-500 rounded-md' : ''}
              >
                {url && <img src={url} alt={String(p.label ?? 'Gambar Catatan')} className="h-full w-full object-contain select-none" draggable={false} />}
              </div>
            );
          })}

        {/* Main Ink & Template Canvas (DPR-scaled for razor-sharp mobile/Retina clarity) */}
        <canvas
          ref={inkCanvasRef}
          data-testid="notes-ink-canvas"
          width={Math.round(canvasDims.w * dpr)}
          height={Math.round(canvasDims.h * dpr)}
          onPointerDown={(e) => {
            if (e.pointerType === 'touch') {
              activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (activePointersRef.current.size === 2 && containerRef.current) {
                // Switch seamlessly into 2-finger pinch-to-zoom & pan (cancels accidental ink!)
                isDrawingRef.current = false;
                liveStrokeRef.current = [];
                paintLiveInk();
                const [p1, p2] = Array.from(activePointersRef.current.values());
                pinchStartRef.current = {
                  dist: Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y)),
                  scale: pan.scale,
                  midX: (p1.x + p2.x) / 2,
                  midY: (p1.y + p2.y) / 2,
                  scrollLeft: containerRef.current.scrollLeft,
                  scrollTop: containerRef.current.scrollTop,
                };
                return;
              }
            }
            handlePointerDown(e);
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'touch' && activePointersRef.current.has(e.pointerId)) {
              activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (activePointersRef.current.size === 2 && pinchStartRef.current && containerRef.current) {
                const [p1, p2] = Array.from(activePointersRef.current.values());
                const dist = Math.max(10, Math.hypot(p2.x - p1.x, p2.y - p1.y));
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const nextScale = Math.max(0.4, Math.min(2.6, pinchStartRef.current.scale * (dist / pinchStartRef.current.dist)));
                setPan((prev) => ({ ...prev, scale: nextScale }));
                containerRef.current.scrollLeft = pinchStartRef.current.scrollLeft - (midX - pinchStartRef.current.midX);
                containerRef.current.scrollTop = pinchStartRef.current.scrollTop - (midY - pinchStartRef.current.midY);
                return;
              }
            }
            handlePointerMove(e);
          }}
          onPointerUp={(e) => {
            activePointersRef.current.delete(e.pointerId);
            if (activePointersRef.current.size < 2) pinchStartRef.current = null;
            handlePointerUp(e);
          }}
          onPointerCancel={(e) => {
            activePointersRef.current.delete(e.pointerId);
            if (activePointersRef.current.size < 2) pinchStartRef.current = null;
            handlePointerUp(e);
          }}
          className="relative z-10 block h-full w-full"
          style={{
            cursor:
              activeTool === 'hand' || activeTool === 'reading' || isSpacePanning
                ? 'grab'
                : activeTool === 'select'
                  ? 'default'
                  : activeTool === 'laser'
                    ? 'crosshair'
                    : activeTool === 'eraser'
                      ? 'cell'
                      : 'crosshair',
          }}
        />

        {/* Dedicated Zero-Lag Live Ink Overlay Canvas (120fps smooth mobile writing!) */}
        <canvas
          ref={liveInkCanvasRef}
          data-testid="notes-live-ink-canvas"
          width={Math.round(canvasDims.w * dpr)}
          height={Math.round(canvasDims.h * dpr)}
          className="pointer-events-none absolute inset-0 z-15 h-full w-full"
        />

        {/* Dedicated Transparent RAF Laser Pointer Canvas (Zero Undo Stack Pollution!) */}
        <canvas
          ref={laserCanvasRef}
          data-testid="notes-laser-canvas"
          width={canvasDims.w}
          height={canvasDims.h}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        />

        {/* Interactive Study Tapes (Pita Perekat — Drag in Select mode, Click to Hide/Reveal!) */}
        {(page.tapes ?? []).map((tape) => (
          <button
            key={tape.id}
            type="button"
            data-testid={`note-tape-${tape.id}`}
            onPointerDown={(e) => {
              if (activeTool === 'select') {
                startDomDrag(
                  e,
                  (dx, dy) =>
                    onUpdatePage(
                      (prev) => ({
                        ...prev,
                        tapes: (prev.tapes ?? []).map((t) =>
                          t.id === tape.id ? { ...t, x: t.x + dx, y: t.y + dy } : t,
                        ),
                      }),
                      false,
                    ),
                  () =>
                    onUpdatePage(
                      (prev) => ({
                        ...prev,
                        tapes: (prev.tapes ?? []).map((t) =>
                          t.id === tape.id ? { ...t, revealed: !t.revealed } : t,
                        ),
                      }),
                      false,
                    ),
                );
              }
            }}
            onClick={() => {
              if (activeTool === 'select') return;
              onUpdatePage(
                (prev) => ({
                  ...prev,
                  tapes: (prev.tapes ?? []).map((t) =>
                    t.id === tape.id ? { ...t, revealed: !t.revealed } : t,
                  ),
                }),
                false,
              );
            }}
            style={{
              position: 'absolute',
              left: tape.x * pan.scale,
              top: tape.y * pan.scale,
              width: tape.w * pan.scale,
              height: tape.h * pan.scale,
              zIndex: 24,
              backgroundColor: tape.revealed ? 'rgba(13, 148, 136, 0.14)' : tape.color,
              cursor: activeTool === 'select' ? 'move' : 'pointer',
            }}
            className="flex items-center justify-center rounded-md border border-teal-500/50 text-[10px] font-bold text-white shadow-sm transition"
            title={activeTool === 'select' ? 'Seret untuk pindah · Klik untuk buka/tutup' : 'Klik untuk membuka/menutup pita hafalan'}
          >
            {tape.revealed ? '' : 'Klik Buka Hafalan'}
          </button>
        ))}

        {/* Stickers (Draggable in Select mode) */}
        {(page.stickers ?? []).map((stk) => (
          <div
            key={stk.id}
            onPointerDown={
              activeTool === 'select'
                ? (e) =>
                    startDomDrag(e, (dx, dy) =>
                      onUpdatePage(
                        (prev) => ({
                          ...prev,
                          stickers: (prev.stickers ?? []).map((s) =>
                            s.id === stk.id ? { ...s, x: s.x + dx, y: s.y + dy } : s,
                          ),
                        }),
                        false,
                      ),
                    )
                : undefined
            }
            style={{
              position: 'absolute',
              left: stk.x * pan.scale,
              top: stk.y * pan.scale,
              fontSize: stk.size * pan.scale,
              transform: 'translate(-50%, -50%)',
              zIndex: 23,
            }}
            className={`select-none ${activeTool === 'select' ? 'pointer-events-auto cursor-move hover:scale-110 transition-transform' : 'pointer-events-none'}`}
          >
            {stk.emoji}
          </div>
        ))}

        {/* Editable & Draggable Text Notes */}
        {(page.texts ?? []).map((txt) => {
          const isSel = selectedTextId === txt.id;
          return (
            <div
              key={txt.id}
              data-testid={`notes-text-wrapper-${txt.id}`}
              style={{
                position: 'absolute',
                left: txt.x * pan.scale,
                top: txt.y * pan.scale,
                zIndex: isSel ? 28 : 25,
              }}
              className={`group flex items-center gap-0.5 rounded-lg border bg-white/90 px-1 py-0.5 shadow-xs transition ${
                isSel ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-blue-200/70 hover:border-blue-400'
              }`}
            >
              {/* Always-available Drag Grip Handle so text can be moved effortlessly */}
              <span
                data-testid={`notes-text-drag-${txt.id}`}
                title="Seret untuk memindahkan teks"
                onPointerDown={(e) => {
                  setSelectedTextId(txt.id);
                  setSelectedObjId(null);
                  startDomDrag(e, (dx, dy) =>
                    onUpdatePage(
                      (prev) => ({
                        ...prev,
                        texts: (prev.texts ?? []).map((t) =>
                          t.id === txt.id ? { ...t, x: Math.max(0, t.x + dx), y: Math.max(0, t.y + dy) } : t,
                        ),
                      }),
                      false,
                    ),
                  );
                }}
                className="flex cursor-grab select-none items-center px-1 text-xs font-bold text-slate-400 hover:text-blue-600 active:cursor-grabbing"
              >
                ⋮⋮
              </span>
              <input
                data-testid={`notes-text-input-${txt.id}`}
                type="text"
                size={Math.max(14, txt.text.length + 2)}
                placeholder="Ketik teks..."
                value={txt.text}
                onFocus={() => {
                  setSelectedTextId(txt.id);
                  setSelectedObjId(null);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onUpdatePage(
                    (prev) => ({
                      ...prev,
                      texts: (prev.texts ?? []).map((t) => (t.id === txt.id ? { ...t, text: e.target.value } : t)),
                    }),
                    false,
                  )
                }
                style={{
                  fontSize: txt.fontSize * pan.scale,
                  color: txt.color,
                }}
                className="min-w-[100px] bg-transparent px-1 py-0.5 font-medium outline-none"
              />
              <button
                type="button"
                title="Hapus teks"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setSelectedTextId(null);
                  onUpdatePage((prev) => ({
                    ...prev,
                    texts: (prev.texts ?? []).filter((t) => t.id !== txt.id),
                  }));
                }}
                className="rounded px-1 text-[11px] font-bold text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                ×
              </button>
            </div>
          );
        })}

        {/* Whiteboard-Parity Floating Selection Action Bar (Gabung, Pisah, Ubah 3D, Duplikat, Hapus) */}
        {selectedObjIds.length > 0 && (() => {
          const noteScene = buildNoteSceneState(page);
          const canMerge = canMergeSelectionToShape(selectedObjIds, noteScene);
          const canUngroup = canUngroupSelection(selectedObjIds, noteScene);
          const canSplit = canSplitRegions(selectedObjIds, noteScene);
          const primaryObj = selectedObjIds.length === 1 ? page.objects.find((o) => o.id === selectedObjIds[0]) : null;
          const can3D = Boolean(
            primaryObj &&
              primaryObj.object_type !== 'viz_solid' &&
              primaryObj.object_type !== 'viz_manimgx' &&
              primaryObj.object_type !== 'image' &&
              primaryObj.object_type !== 'line' &&
              primaryObj.object_type !== 'arrow',
          );
          let minX = Infinity, minY = Infinity, maxX = -Infinity;
          for (const sid of selectedObjIds) {
            const o = page.objects.find((item) => item.id === sid);
            const b = o ? getNoteObjectBBox(o) : null;
            if (b) {
              minX = Math.min(minX, b.x);
              minY = Math.min(minY, b.y);
              maxX = Math.max(maxX, b.x + b.w);
            }
          }
          if (!isFinite(minX)) return null;
          const barLeft = ((minX + maxX) / 2) * pan.scale;
          const barTop = Math.max(12, minY * pan.scale - 52);

          return (
            <div
              data-testid="notes-selection-toolbar"
              onPointerDown={(e) => e.stopPropagation()}
              style={{ left: barLeft, top: barTop, transform: 'translateX(-50%)' }}
              className="absolute z-40 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/98 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-xl backdrop-blur-md"
            >
              {canMerge && (
                <button
                  type="button"
                  onClick={() => {
                    const merged = mergeSelectionTo2DShape(selectedObjIds, noteScene);
                    if (!merged) return;
                    const newId = `note-grp-${Date.now()}`;
                    const srcSet = new Set(merged.sourceIds);
                    onUpdatePage((prev) => ({
                      ...prev,
                      objects: [
                        ...prev.objects.filter((o) => !srcSet.has(o.id)),
                        {
                          id: newId,
                          object_type: merged.objectType,
                          props: merged.props,
                          created_at: Date.now(),
                          updated_at: Date.now(),
                        },
                      ],
                    }));
                    setSelectedObjIds([newId]);
                  }}
                  className="rounded-xl bg-emerald-50 px-2.5 py-1 text-emerald-700 hover:bg-emerald-100"
                >
                  🔗 Gabung
                </button>
              )}
              {canSplit && (
                <button
                  type="button"
                  onClick={() => {
                    const res = splitObjectIntoRegions(selectedObjIds, noteScene);
                    if (!res) return;
                    const created: BoardObject[] = [];
                    for (const ev of res.events) {
                      if (ev.event_type === 'object.created') {
                        const pl = ev.payload as { id: string; object_type: BoardObject['object_type']; props: Record<string, unknown> };
                        created.push({
                          id: pl.id,
                          object_type: pl.object_type,
                          props: pl.props,
                          created_at: Date.now(),
                          updated_at: Date.now(),
                        });
                      }
                    }
                    onUpdatePage((prev) => ({
                      ...prev,
                      objects: [...prev.objects.filter((o) => o.id !== res.sourceId), ...created],
                    }));
                    setSelectedObjIds(res.newIds);
                  }}
                  className="rounded-xl bg-orange-50 px-2.5 py-1 text-orange-700 hover:bg-orange-100"
                >
                  🍰 Pecah
                </button>
              )}
              {canUngroup && (
                <button
                  type="button"
                  onClick={() => {
                    const res = ungroupSelectedObject(selectedObjIds, noteScene);
                    if (!res) return;
                    const created: BoardObject[] = [];
                    for (const ev of res.events) {
                      if (ev.event_type === 'object.created') {
                        const pl = ev.payload as { id: string; object_type: BoardObject['object_type']; props: Record<string, unknown> };
                        created.push({
                          id: pl.id,
                          object_type: pl.object_type,
                          props: pl.props,
                          created_at: Date.now(),
                          updated_at: Date.now(),
                        });
                      }
                    }
                    onUpdatePage((prev) => ({
                      ...prev,
                      objects: [...prev.objects.filter((o) => o.id !== res.sourceId), ...created],
                    }));
                    setSelectedObjIds(res.newIds);
                  }}
                  className="rounded-xl bg-amber-50 px-2.5 py-1 text-amber-700 hover:bg-amber-100"
                >
                  ✂️ Pisah
                </button>
              )}
              {can3D && primaryObj && (
                <button
                  type="button"
                  onClick={() =>
                    setConvert3DTarget({
                      id: primaryObj.id,
                      object_type: primaryObj.object_type,
                      props: primaryObj.props as Record<string, unknown>,
                    })
                  }
                  className="rounded-xl bg-indigo-50 px-2.5 py-1 text-indigo-700 hover:bg-indigo-100"
                >
                  📦 Ubah 3D
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const now = Date.now();
                  const copies: BoardObject[] = [];
                  for (const sid of selectedObjIds) {
                    const o = page.objects.find((item) => item.id === sid);
                    if (!o) continue;
                    const p = JSON.parse(JSON.stringify(o.props)) as Record<string, unknown>;
                    if (Array.isArray(p.multiSegments)) {
                      p.multiSegments = (p.multiSegments as number[][]).map((s) => s.map((v) => v + 24));
                    }
                    if (Array.isArray(p.customPoints)) {
                      p.customPoints = (p.customPoints as number[]).map((v) => v + 24);
                    }
                    if (typeof p.x === 'number') p.x += 24;
                    if (typeof p.y === 'number') p.y += 24;
                    if (typeof p.cx === 'number') p.cx += 24;
                    if (typeof p.cy === 'number') p.cy += 24;
                    if (typeof p.x1 === 'number') { p.x1 += 24; p.y1 = Number(p.y1) + 24; p.x2 = Number(p.x2) + 24; p.y2 = Number(p.y2) + 24; }
                    copies.push({ ...o, id: `note-dup-${now}-${Math.random().toString(36).slice(2, 5)}`, props: p, created_at: now, updated_at: now });
                  }
                  if (copies.length > 0) {
                    onUpdatePage((prev) => ({ ...prev, objects: [...prev.objects, ...copies] }));
                    setSelectedObjIds(copies.map((c) => c.id));
                  }
                }}
                className="rounded-xl px-2 py-1 hover:bg-slate-100"
              >
                📋 Duplikat
              </button>
              <button
                type="button"
                onClick={() => {
                  const delSet = new Set(selectedObjIds);
                  onUpdatePage((prev) => ({ ...prev, objects: prev.objects.filter((o) => !delSet.has(o.id)) }));
                  setSelectedObjIds([]);
                }}
                className="rounded-xl px-2 py-1 text-red-600 hover:bg-red-50"
              >
                🗑️ Hapus
              </button>
            </div>
          );
        })()}

        {/* 2D -> 3D Conversion Menu in /notes (identical to Whiteboard!) */}
        {convert3DTarget && (
          <div onPointerDown={(e) => e.stopPropagation()} className="fixed inset-0 z-50 pointer-events-none">
            <div className="pointer-events-auto">
              <ShapeToSolidMenu
                shape={convert3DTarget}
                screenPos={{ x: 260, y: 140 }}
                containerWidth={typeof window !== 'undefined' ? window.innerWidth : 1024}
                containerHeight={typeof window !== 'undefined' ? window.innerHeight : 768}
                onSelectProposal={(proposal: SolidProposal) => {
                  const solidId = `note-solid-${Date.now()}`;
                  const ev = createConvertShapeToSolidEvent(convert3DTarget, proposal, undefined, undefined, solidId);
                  const pl = ev.payload as { id: string; object_type: BoardObject['object_type']; props: Record<string, unknown> };
                  onUpdatePage((prev) => ({
                    ...prev,
                    objects: [
                      ...prev.objects.filter((o) => o.id !== convert3DTarget.id),
                      {
                        id: pl.id,
                        object_type: pl.object_type,
                        props: pl.props,
                        created_at: Date.now(),
                        updated_at: Date.now(),
                      },
                    ],
                  }));
                  setConvert3DTarget(null);
                  setSelectedObjIds([pl.id]);
                }}
                onDismiss={() => setConvert3DTarget(null)}
              />
            </div>
          </div>
        )}

        {/* Embedded Interactive 3D Solids directly on the Note Page (Colored 3D, 360° Orbit, Smooth Drag!) */}
        {page.objects
          .filter((o) => o.object_type === 'viz_solid')
          .map((obj) => {
            const p = obj.props as Record<string, unknown>;
            const x = Number(p.x ?? 120);
            const y = Number(p.y ?? 100);
            const w = Number(p.w ?? 320);
            const h = Number(p.h ?? 320);
            const solidType = String(p.solid_type ?? 'cube');
            const solidParams = {
              type: solidType,
              ...((p.params as Record<string, unknown>) ?? {}),
            } as unknown as SolidParams;
            return (
              <div
                key={obj.id}
                data-testid={`notes-solid-obj-${obj.id}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: w,
                  height: h,
                  transformOrigin: '0 0',
                  transform: `translate3d(${x * pan.scale}px, ${y * pan.scale}px, 0) scale(${pan.scale})`,
                  zIndex: selectedObjIds.includes(obj.id) ? 28 : 24,
                }}
              >
                <Suspense fallback={null}>
                  <TongchuangSolidWidget
                    id={obj.id}
                    params={solidParams}
                    extendedKind={typeof p.extended_kind === 'string' ? p.extended_kind : undefined}
                    profilePointsCm={Array.isArray(p.profile_points_cm) ? (p.profile_points_cm as [number, number][]) : undefined}
                    extraParams={typeof p.extra_params === 'object' && p.extra_params !== null ? (p.extra_params as Record<string, unknown>) : undefined}
                    selected={selectedObjIds.includes(obj.id)}
                    compact={true}
                    onSelect={() => setSelectedObjIds([obj.id])}
                    onCloseToolbar={() => setSelectedObjIds([])}
                    onDelete={() => {
                      onUpdatePage((prev) => ({ ...prev, objects: prev.objects.filter((o) => o.id !== obj.id) }));
                      setSelectedObjIds([]);
                    }}
                    onMovePosition={(dx, dy) =>
                      onUpdatePage(
                        (prev) => ({
                          ...prev,
                          objects: prev.objects.map((o) => {
                            if (o.id !== obj.id) return o;
                            const op = o.props as Record<string, unknown>;
                            return {
                              ...o,
                              props: {
                                ...op,
                                x: Number(op.x ?? 120) + dx / (pan.scale || 1),
                                y: Number(op.y ?? 100) + dy / (pan.scale || 1),
                              },
                              updated_at: Date.now(),
                            };
                          }),
                        }),
                        false,
                      )
                    }
                  />
                </Suspense>
              </div>
            );
          })}

        {/* Embedded ManimGX Visuals directly on the Note Page */}
        {page.objects
          .filter((o) => o.object_type === 'viz_manimgx')
          .map((obj) => {
            const p = obj.props as Record<string, unknown>;
            const x = Number(p.x ?? 80);
            const y = Number(p.y ?? 80);
            const w = Number(p.w ?? 460);
            const h = Number(p.h ?? 330);
            return (
              <div
                key={obj.id}
                data-testid={`notes-manimgx-obj-${obj.id}`}
                style={{
                  position: 'absolute',
                  left: x * pan.scale,
                  top: y * pan.scale,
                  width: w * pan.scale,
                  height: h * pan.scale,
                  zIndex: 26,
                }}
              >
                <ManimGxWidget
                  id={obj.id}
                  title={String(p.title ?? 'Visualisasi ManimGX')}
                  formulaLatex={String(p.formulaLatex ?? '(x - 2)^2 + (y - 1)^2 = 9')}
                  templateId={String(p.templateId ?? 'circle_cartesian') as ManimGxTemplateKind}
                  sceneCode={String(p.sceneCode ?? '')}
                  onMovePosition={(dx, dy) =>
                    onUpdatePage(
                      (prev) => ({
                        ...prev,
                        objects: prev.objects.map((o) => {
                          if (o.id !== obj.id) return o;
                          const op = o.props as Record<string, unknown>;
                          return {
                            ...o,
                            props: {
                              ...op,
                              x: Math.max(0, Number(op.x ?? 80) + dx / (pan.scale || 1)),
                              y: Math.max(0, Number(op.y ?? 80) + dy / (pan.scale || 1)),
                            },
                            updated_at: Date.now(),
                          };
                        }),
                      }),
                      false,
                    )
                  }
                  onUpdateSceneCode={(nextCode) =>
                    onUpdatePage(
                      (prev) => ({
                        ...prev,
                        objects: prev.objects.map((o) =>
                          o.id === obj.id
                            ? { ...o, props: { ...(o.props as Record<string, unknown>), sceneCode: nextCode }, updated_at: Date.now() }
                            : o,
                        ),
                      }),
                      false,
                    )
                  }
                  onDelete={() =>
                    onUpdatePage((prev) => ({
                      ...prev,
                      objects: prev.objects.filter((o) => o.id !== obj.id),
                    }))
                  }
                />
              </div>
            );
          })}

        {/* Virtual Rotatable Ruler (Matches Screenshot_20261124-235231.jpg.jpeg!) */}
        {showRuler && (
          <div
            data-testid="notes-virtual-ruler"
            onPointerDown={handleDragRuler}
            style={{
              position: 'absolute',
              left: ruler.x * pan.scale,
              top: ruler.y * pan.scale,
              width: 640 * pan.scale,
              height: 72 * pan.scale,
              transform: `translate(-50%, -50%) rotate(${ruler.angleDeg}deg)`,
              zIndex: 30,
            }}
            className="flex cursor-grab items-center justify-between border-y border-slate-300 bg-white/90 shadow-lg backdrop-blur-xs select-none active:cursor-grabbing"
          >
            {/* Ruler ticks */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-4">
              {Array.from({ length: 21 }, (_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-px bg-slate-500 ${i % 2 === 0 ? 'h-3' : 'h-1.5'}`} />
                  {i % 2 === 0 && <span className="text-[8px] font-mono text-slate-600">{Math.abs(10 - i)}</span>}
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-4">
              {Array.from({ length: 21 }, (_, i) => (
                <div key={i} className={`w-px bg-slate-400 ${i % 2 === 0 ? 'h-3' : 'h-1.5'}`} />
              ))}
            </div>

            {/* Center Angle Dial & Rotate Controls */}
            <div className="mx-auto flex items-center gap-2 rounded-full border border-dashed border-slate-400 bg-white/95 px-2.5 py-1 shadow-xs">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setRuler((r) => ({ ...r, angleDeg: (r.angleDeg - 15 + 360) % 360 }))}
                className="rounded px-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ↺
              </button>
              <span className="font-mono text-xs font-bold text-slate-800">{ruler.angleDeg}°</span>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setRuler((r) => ({ ...r, angleDeg: (r.angleDeg + 15) % 360 }))}
                className="rounded px-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ↻
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
