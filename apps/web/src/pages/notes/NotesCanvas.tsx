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
import React, { useEffect, useRef, useState } from 'react';
import getStroke from 'perfect-freehand';
import type {
  NotePage,
  NoteStroke,
  PaperTemplateKind,
} from '@ai-classroom/whiteboard-core';
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

  const [selectedObjId, setSelectedObjId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const isSpacePanRef = useRef(false);
  const panDragRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const draggingObjRef = useRef<{ id: string; lastX: number; lastY: number } | null>(null);
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

    // Selection highlight for selected vector object in /notes
    if (selectedObjId) {
      const selObj = page.objects.find((o) => o.id === selectedObjId);
      if (selObj && selObj.object_type !== 'image' && selObj.object_type !== 'viz_manimgx') {
        const sp = selObj.props as Record<string, unknown>;
        let bx = 0;
        let by = 0;
        let bw = 0;
        let bh = 0;
        if (selObj.object_type === 'rect' || selObj.object_type === 'frame') {
          bx = Number(sp.x ?? 0);
          by = Number(sp.y ?? 0);
          bw = Number(sp.w ?? 100);
          bh = Number(sp.h ?? 60);
        } else if (selObj.object_type === 'rhombus' || selObj.object_type === 'ellipse') {
          const rx = Number(sp.rx ?? 50);
          const ry = Number(sp.ry ?? 35);
          bx = Number(sp.cx ?? 0) - rx;
          by = Number(sp.cy ?? 0) - ry;
          bw = rx * 2;
          bh = ry * 2;
        } else if (selObj.object_type === 'arrow' || selObj.object_type === 'line') {
          const x1 = Number(sp.x1 ?? 0);
          const y1 = Number(sp.y1 ?? 0);
          const x2 = Number(sp.x2 ?? 100);
          const y2 = Number(sp.y2 ?? 100);
          bx = Math.min(x1, x2);
          by = Math.min(y1, y2);
          bw = Math.max(12, Math.abs(x2 - x1));
          bh = Math.max(12, Math.abs(y2 - y1));
        }
        if (bw > 0 && bh > 0) {
          ctx.save();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(bx - 5, by - 5, bw + 10, bh + 10);
          ctx.restore();
        }
      }
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
  }, [page, canvasDims, selectedObjId]);

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
      if (obj.object_type === 'viz_manimgx' || obj.object_type === 'image') continue;
      const p = obj.props as Record<string, unknown>;
      if (obj.object_type === 'rect' || obj.object_type === 'frame') {
        const ox = Number(p.x ?? 0);
        const oy = Number(p.y ?? 0);
        const ow = Number(p.w ?? 100);
        const oh = Number(p.h ?? 60);
        if (x >= ox - 8 && x <= ox + ow + 8 && y >= oy - 8 && y <= oy + oh + 8) return obj;
      } else if (obj.object_type === 'rhombus' || obj.object_type === 'ellipse') {
        const cx = Number(p.cx ?? 0);
        const cy = Number(p.cy ?? 0);
        const rx = Number(p.rx ?? 50);
        const ry = Number(p.ry ?? 35);
        if (x >= cx - rx - 8 && x <= cx + rx + 8 && y >= cy - ry - 8 && y <= cy + ry + 8) return obj;
      } else if (obj.object_type === 'arrow' || obj.object_type === 'line') {
        const x1 = Number(p.x1 ?? 0);
        const y1 = Number(p.y1 ?? 0);
        const x2 = Number(p.x2 ?? 100);
        const y2 = Number(p.y2 ?? 100);
        const minX = Math.min(x1, x2) - 10;
        const maxX = Math.max(x1, x2) + 10;
        const minY = Math.min(y1, y2) - 10;
        const maxY = Math.max(y1, y2) + 10;
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) return obj;
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
      const hit = hitTestNoteObject(rawX, rawY);
      if (hit) {
        setSelectedObjId(hit.id);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        draggingObjRef.current = { id: hit.id, lastX: rawX, lastY: rawY };
      } else {
        setSelectedObjId(null);
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

    if (draggingObjRef.current) {
      const [rawX, rawY] = toLocalPt(e);
      const dx = rawX - draggingObjRef.current.lastX;
      const dy = rawY - draggingObjRef.current.lastY;
      draggingObjRef.current.lastX = rawX;
      draggingObjRef.current.lastY = rawY;
      const dragId = draggingObjRef.current.id;
      if (dx !== 0 || dy !== 0) {
        onUpdatePage(
          (prev) => ({
            ...prev,
            objects: prev.objects.map((o) => {
              if (o.id !== dragId) return o;
              const p = { ...(o.props as Record<string, unknown>) };
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
