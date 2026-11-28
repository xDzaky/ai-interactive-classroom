/**
 * mergeStrokesToShape.ts — Multi-Object & Broken Sketch Merger (2D & 3D Ready)
 *
 * 1. If 2+ raw broken strokes / single lines form a CLOSED 2D loop (e.g. 2 L-strokes -> rect,
 *    3 lines -> triangle), snaps them into a crisp 2D shape ready for 3D conversion.
 * 2. If ANY mix of 2D shapes + lines + strokes is selected (e.g. rhombus + right-angle square +
 *    2 diagonal lines, or pentagon + internal lines, or open lines), merges ALL of them into
 *    ONE single unified composite BoardObject (`multiSegments`) so nothing is left behind!
 */
import type { BoardObject, SceneState, WhiteboardEvent } from '@ai-classroom/whiteboard-core';
import { recognizeShape } from '@ai-classroom/sketch-core';
import { computePlanarRegions, isPointInPolygon } from './regionPartition';

export interface GroupedItemSnapshot {
  kind: 'object' | 'stroke';
  object_type?: BoardObject['object_type'];
  props?: Record<string, unknown>;
  points?: Array<[number, number, number]>;
  color?: string;
  width?: number;
  tool?: 'pen' | 'highlighter' | 'eraser';
}

export interface MergedShapeResult {
  objectType: BoardObject['object_type'];
  props: Record<string, unknown>;
  label: string;
  sourceIds: string[];
}

const MERGEABLE_2D_TYPES = new Set<BoardObject['object_type']>([
  'line',
  'arrow',
  'rect',
  'circle',
  'ellipse',
  'triangle',
  'rhombus',
  'pentagon',
  'hexagon',
  'polygon',
  'trapezoid',
  'parallelogram',
  'kite',
  'star',
]);

function dist(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function rotatePoints(
  pts: Array<[number, number]>,
  cx: number,
  cy: number,
  deg: number,
): Array<[number, number]> {
  if (!deg || Math.abs(deg) < 1e-4) return pts;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return pts.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  });
}

/**
 * Extracts exact polyline segment(s) from ANY 2D BoardObject so it can be merged
 * cleanly with other shapes, lines, and strokes into a single unified object.
 */
function extractObjectSegments(obj: BoardObject): Array<Array<[number, number]>> {
  const p = obj.props as Record<string, unknown>;
  const rot = Number(p.rotation ?? 0);

  if (Array.isArray(p.multiSegments) && p.multiSegments.length > 0) {
    const out: Array<Array<[number, number]>> = [];
    for (const rawSeg of p.multiSegments as number[][]) {
      if (Array.isArray(rawSeg) && rawSeg.length >= 4) {
        const pts: Array<[number, number]> = [];
        for (let i = 0; i < rawSeg.length - 1; i += 2) {
          pts.push([rawSeg[i], rawSeg[i + 1]]);
        }
        out.push(pts);
      }
    }
    return out;
  }

  if (Array.isArray(p.customPoints) && p.customPoints.length >= 6) {
    const raw = p.customPoints as number[];
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < raw.length - 1; i += 2) {
      pts.push([raw[i], raw[i + 1]]);
    }
    if (pts.length >= 3) pts.push([pts[0][0], pts[0][1]]);
    return [pts];
  }

  switch (obj.object_type) {
    case 'line':
    case 'arrow': {
      const x1 = Number(p.x1 ?? 0);
      const y1 = Number(p.y1 ?? 0);
      const x2 = Number(p.x2 ?? 100);
      const y2 = Number(p.y2 ?? 100);
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      return [
        rotatePoints(
          [
            [x1, y1],
            [cx, cy],
            [x2, y2],
          ],
          cx,
          cy,
          rot,
        ),
      ];
    }
    case 'rect': {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.w ?? p.width ?? 100);
      const h = Number(p.h ?? p.height ?? 60);
      const pts: Array<[number, number]> = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ];
      return [rotatePoints(pts, x + w / 2, y + h / 2, rot)];
    }
    case 'triangle': {
      const x1 = Number(p.x1 ?? 0);
      const y1 = Number(p.y1 ?? 0);
      const x2 = Number(p.x2 ?? 50);
      const y2 = Number(p.y2 ?? 80);
      const x3 = Number(p.x3 ?? 100);
      const y3 = Number(p.y3 ?? 0);
      const cx = (x1 + x2 + x3) / 3;
      const cy = (y1 + y2 + y3) / 3;
      return [
        rotatePoints(
          [
            [x1, y1],
            [x2, y2],
            [x3, y3],
            [x1, y1],
          ],
          cx,
          cy,
          rot,
        ),
      ];
    }
    case 'rhombus': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      const pts: Array<[number, number]> = [
        [cx, cy - ry],
        [cx + rx, cy],
        [cx, cy + ry],
        [cx - rx, cy],
        [cx, cy - ry],
      ];
      return [rotatePoints(pts, cx, cy, rot)];
    }
    case 'circle': {
      const cx = Number(p.x ?? p.cx ?? 0);
      const cy = Number(p.y ?? p.cy ?? 0);
      const r = Number(p.r ?? p.radius ?? 40);
      const pts: Array<[number, number]> = [];
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const a = (i * 2 * Math.PI) / steps;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return [pts];
    }
    case 'ellipse': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 50));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 30));
      const pts: Array<[number, number]> = [];
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const a = (i * 2 * Math.PI) / steps;
        pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
      }
      return [rotatePoints(pts, cx, cy, rot)];
    }
    case 'pentagon':
    case 'hexagon':
    case 'polygon': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      const sides =
        obj.object_type === 'pentagon'
          ? 5
          : obj.object_type === 'hexagon'
            ? 6
            : Math.max(3, Number(p.sides ?? 5));
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= sides; i++) {
        const a = ((i % sides) * 2 * Math.PI) / sides - Math.PI / 2;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return [rotatePoints(pts, cx, cy, rot)];
    }
    case 'star': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const outerR = Number(p.outerR ?? p.r ?? 45);
      const innerR = Number(p.innerR ?? outerR * 0.45);
      const numPts = Math.max(3, Number(p.points ?? 5));
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= numPts * 2; i++) {
        const idx = i % (numPts * 2);
        const r = idx % 2 === 0 ? outerR : innerR;
        const a = (idx * Math.PI) / numPts - Math.PI / 2;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return [rotatePoints(pts, cx, cy, rot)];
    }
    case 'trapezoid': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const topW = Number(p.topW ?? 70);
      const bottomW = Number(p.bottomW ?? p.w ?? 120);
      const h = Number(p.h ?? 80);
      const pts: Array<[number, number]> = [
        [cx - topW / 2, cy - h / 2],
        [cx + topW / 2, cy - h / 2],
        [cx + bottomW / 2, cy + h / 2],
        [cx - bottomW / 2, cy + h / 2],
        [cx - topW / 2, cy - h / 2],
      ];
      return [rotatePoints(pts, cx, cy, rot)];
    }
    case 'parallelogram': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const w = Number(p.w ?? 120);
      const h = Number(p.h ?? 70);
      const skew = Number(p.skew ?? 24);
      const pts: Array<[number, number]> = [
        [cx - w / 2 + skew, cy - h / 2],
        [cx + w / 2 + skew, cy - h / 2],
        [cx + w / 2 - skew, cy + h / 2],
        [cx - w / 2 - skew, cy + h / 2],
        [cx - w / 2 + skew, cy - h / 2],
      ];
      return [rotatePoints(pts, cx, cy, rot)];
    }
    case 'kite': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const w = Number(p.w ?? 90);
      const h = Number(p.h ?? 120);
      const pts: Array<[number, number]> = [
        [cx, cy - h / 2],
        [cx + w / 2, cy - h * 0.12],
        [cx, cy + h / 2],
        [cx - w / 2, cy - h * 0.12],
        [cx, cy - h / 2],
      ];
      return [rotatePoints(pts, cx, cy, rot)];
    }
    default:
      return [];
  }
}

/**
 * Checks whether the current selection can be merged (2+ 2D shapes/lines/strokes,
 * or 1 freehand pen stroke).
 */
export function canMergeSelectionToShape(selectedIds: string[], scene: SceneState): boolean {
  if (selectedIds.length === 0) return false;
  let mergeableCount = 0;
  for (const id of selectedIds) {
    if (scene.strokes[id]) {
      mergeableCount += 1;
    } else {
      const obj = scene.objects[id];
      if (obj && MERGEABLE_2D_TYPES.has(obj.object_type)) {
        mergeableCount += 1;
      }
    }
  }
  return (
    mergeableCount >= 2 ||
    (selectedIds.length === 1 && mergeableCount === 1 && Boolean(scene.strokes[selectedIds[0]]))
  );
}

interface StitchResult {
  chain: Array<[number, number]>;
  maxInternalGap: number;
  closingGap: number;
  pathLength: number;
}

/**
 * Greedily stitches multiple polyline segments into one continuous chain
 * by connecting nearest endpoints (reversing segments as needed), WITHOUT
 * blindly forcing the contour closed.
 */
function stitchSegments(segments: Array<Array<[number, number]>>): StitchResult {
  if (segments.length === 0) {
    return { chain: [], maxInternalGap: 0, closingGap: Infinity, pathLength: 0 };
  }
  const remaining = segments.map((s) => [...s]);
  const chain: Array<[number, number]> = [...remaining.shift()!];
  let maxInternalGap = 0;

  while (remaining.length > 0) {
    const tail = chain[chain.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    let reverseBest = false;

    for (let i = 0; i < remaining.length; i++) {
      const seg = remaining[i];
      const dStart = dist(tail, seg[0]);
      const dEnd = dist(tail, seg[seg.length - 1]);
      if (dStart < bestDist) {
        bestDist = dStart;
        bestIdx = i;
        reverseBest = false;
      }
      if (dEnd < bestDist) {
        bestDist = dEnd;
        bestIdx = i;
        reverseBest = true;
      }
    }

    if (bestDist > maxInternalGap) maxInternalGap = bestDist;
    const picked = remaining.splice(bestIdx, 1)[0];
    if (reverseBest) picked.reverse();
    chain.push(...picked);
  }

  let pathLength = 0;
  for (let i = 1; i < chain.length; i++) {
    pathLength += dist(chain[i - 1], chain[i]);
  }
  const closingGap = chain.length >= 2 ? dist(chain[0], chain[chain.length - 1]) : Infinity;
  return { chain, maxInternalGap, closingGap, pathLength };
}

/**
 * Merges selected 2D shapes, lines, and strokes into ONE unified BoardObject:
 * - If ALL selected items are raw strokes / simple lines AND form a closed 2D loop -> snaps to crisp 2D shape.
 * - Otherwise (any mix of shapes + lines, or open lines) -> merges ALL selected geometry into ONE unified
 *   composite `polygon` object (`multiSegments`) so every shape and line stays together as 1 object!
 */
export function mergeSelectionTo2DShape(
  selectedIds: string[],
  scene: SceneState,
): MergedShapeResult | null {
  const segments: Array<Array<[number, number]>> = [];
  const sourceIds: string[] = [];
  const groupedItems: GroupedItemSnapshot[] = [];
  const coloredSourcePolys: Array<{ points: number[]; color: string }> = [];
  let strokeColor = '#0f172a';
  let strokeWidth = 3;
  let hasExistingShape = false;

  for (const id of selectedIds) {
    const st = scene.strokes[id];
    if (st && st.points.length >= 2) {
      segments.push(st.points.map(([x, y]) => [x, y]));
      sourceIds.push(id);
      groupedItems.push({
        kind: 'stroke',
        points: st.points.map(([x, y, pr]) => [x, y, pr]),
        color: st.color,
        width: st.width,
        tool: st.tool,
      });
      strokeColor = st.color || strokeColor;
      strokeWidth = st.width || strokeWidth;
      continue;
    }
    const obj = scene.objects[id];
    if (obj && MERGEABLE_2D_TYPES.has(obj.object_type)) {
      const p = obj.props as Record<string, unknown>;
      const extracted = extractObjectSegments(obj);
      if (extracted.length > 0) {
        // Preserve existing per-region colors OR solid shape fill before merging!
        if (
          Array.isArray(p.multiSegments) &&
          typeof p.regionFills === 'object' &&
          p.regionFills !== null
        ) {
          const rf = p.regionFills as Record<string, string>;
          const oldRegions = computePlanarRegions(p.multiSegments as number[][]);
          for (const reg of oldRegions) {
            const col = rf[String(reg.index)];
            if (col && col !== 'transparent') {
              coloredSourcePolys.push({ points: reg.points, color: col });
            }
          }
        } else if (typeof p.fill === 'string' && p.fill !== '' && p.fill !== 'transparent') {
          const flat = extracted[0].flatMap(([x, y]) => [x, y]);
          if (flat.length >= 6) {
            coloredSourcePolys.push({ points: flat, color: p.fill });
          }
        }

        segments.push(...extracted);
        sourceIds.push(id);
        groupedItems.push({
          kind: 'object',
          object_type: obj.object_type,
          props: JSON.parse(JSON.stringify(p)) as Record<string, unknown>,
        });
        if (typeof p.stroke === 'string') strokeColor = p.stroke;
        if (typeof p.strokeWidth === 'number') strokeWidth = p.strokeWidth;
        if (
          obj.object_type !== 'line' ||
          Array.isArray(p.multiSegments) ||
          Array.isArray(p.customPoints)
        ) {
          hasExistingShape = true;
        }
      }
    }
  }

  if (segments.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const seg of segments) {
    for (const [x, y] of seg) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const w = Math.max(12, Math.round(maxX - minX));
  const h = Math.max(12, Math.round(maxY - minY));
  const diag = Math.hypot(w, h);
  const cx = Math.round(minX + w / 2);
  const cy = Math.round(minY + h / 2);

  const baseStyle = {
    stroke: strokeColor,
    strokeWidth: Math.max(2, strokeWidth),
    fill: 'transparent',
  };

  const flatMultiSegments = segments.map((seg) =>
    seg.flatMap(([x, y]) => [Math.round(x), Math.round(y)]),
  );

  // Map previously colored polygons onto the newly partitioned regions so colors are NEVER lost!
  const preservedRegionFills: Record<string, string> = {};
  if (coloredSourcePolys.length > 0) {
    const newRegions = computePlanarRegions(flatMultiSegments);
    for (const reg of newRegions) {
      for (let i = coloredSourcePolys.length - 1; i >= 0; i--) {
        if (isPointInPolygon({ x: reg.cx, y: reg.cy }, coloredSourcePolys[i].points)) {
          preservedRegionFills[String(reg.index)] = coloredSourcePolys[i].color;
          break;
        }
      }
    }
  }

  const compositeGroupProps = {
    multiSegments: flatMultiSegments,
    ...(Object.keys(preservedRegionFills).length > 0 ? { regionFills: preservedRegionFills } : {}),
    activeRegionIndex: -1,
    groupedOrigin: { x: Math.round(minX), y: Math.round(minY), w, h },
    groupedItems,
    x: Math.round(minX),
    y: Math.round(minY),
    cx,
    cy,
    w,
    h,
    r: Math.round(Math.max(w, h) / 2),
    ...baseStyle,
  };

  // If ANY existing 2D shape (rhombus, rect, pentagon, circle, etc.) is part of the selection,
  // merge ALL selected shapes & lines into ONE unified composite object (keeping every single line & edge!).
  if (hasExistingShape) {
    return {
      objectType: 'polygon',
      props: compositeGroupProps,
      label: 'Gabungan Objek',
      sourceIds,
    };
  }

  // Only raw strokes / simple lines selected -> check if they genuinely form a closed 2D loop
  const { chain, maxInternalGap, closingGap, pathLength } = stitchSegments(segments);
  const gapThreshold = Math.max(36, diag * 0.25);
  const isClosedLoop =
    chain.length >= 3 &&
    diag >= 24 &&
    closingGap <= gapThreshold &&
    maxInternalGap <= gapThreshold &&
    pathLength >= diag * 1.8;

  // Open lines / T-junction / non-closed strokes -> merge ONLY the lines into ONE composite object!
  if (!isClosedLoop) {
    return {
      objectType: 'polygon',
      props: compositeGroupProps,
      label: 'Gabungan Garis',
      sourceIds,
    };
  }

  // Closed loop of broken strokes/lines -> snap to crisp 2D shape
  const closedContour = [...chain, chain[0]];
  const rec = recognizeShape(closedContour.map(([x, y]) => ({ x, y })));
  const best = rec.best;
  if (best && best.kind === 'circle' && best.geometry.type === 'ellipse') {
    const r = Math.max(16, Math.round((best.geometry.rx + best.geometry.ry) / 2));
    return {
      objectType: 'circle',
      props: { x: Math.round(best.geometry.cx), y: Math.round(best.geometry.cy), r, ...baseStyle },
      label: 'Lingkaran',
      sourceIds,
    };
  }
  if (best && best.kind === 'ellipse' && best.geometry.type === 'ellipse') {
    return {
      objectType: 'ellipse',
      props: {
        cx: Math.round(best.geometry.cx),
        cy: Math.round(best.geometry.cy),
        rx: Math.max(16, Math.round(best.geometry.rx)),
        ry: Math.max(16, Math.round(best.geometry.ry)),
        ...baseStyle,
      },
      label: 'Elips',
      sourceIds,
    };
  }
  if (
    best &&
    (best.kind === 'triangle' || best.kind === 'right_triangle') &&
    best.geometry.type === 'polygon' &&
    best.geometry.points.length >= 3
  ) {
    const [v1, v2, v3] = best.geometry.points;
    return {
      objectType: 'triangle',
      props: {
        x1: Math.round(v1.x),
        y1: Math.round(v1.y),
        x2: Math.round(v2.x),
        y2: Math.round(v2.y),
        x3: Math.round(v3.x),
        y3: Math.round(v3.y),
        ...baseStyle,
      },
      label: 'Segitiga',
      sourceIds,
    };
  }
  if (best && (best.kind === 'rhombus' || best.kind === 'kite')) {
    return {
      objectType: 'rhombus',
      props: { cx, cy, w, h, rx: w / 2, ry: h / 2, ...baseStyle },
      label: 'Belah Ketupat',
      sourceIds,
    };
  }
  if (best && (best.kind === 'pentagon' || best.kind === 'hexagon')) {
    const sides = best.kind === 'pentagon' ? 5 : 6;
    return {
      objectType: best.kind,
      props: { cx, cy, r: Math.round(Math.max(w, h) / 2), sides, ...baseStyle },
      label: sides === 5 ? 'Segi Lima' : 'Segi Enam',
      sourceIds,
    };
  }

  // 3 separate closed line segments -> crisp Triangle
  if (segments.length === 3 && best?.kind !== 'rect' && best?.kind !== 'square') {
    const corners = segments.map((s) => s[0]);
    return {
      objectType: 'triangle',
      props: {
        x1: Math.round(corners[0][0]),
        y1: Math.round(corners[0][1]),
        x2: Math.round(corners[1][0]),
        y2: Math.round(corners[1][1]),
        x3: Math.round(corners[2][0]),
        y3: Math.round(corners[2][1]),
        ...baseStyle,
      },
      label: 'Segitiga',
      sourceIds,
    };
  }

  // Closed 2 L-strokes -> crisp Rectangle
  return {
    objectType: 'rect',
    props: {
      x: Math.round(minX),
      y: Math.round(minY),
      w,
      h,
      ...baseStyle,
    },
    label: Math.abs(w - h) <= Math.max(w, h) * 0.12 ? 'Persegi' : 'Persegi Panjang',
    sourceIds,
  };
}

/**
 * Checks whether the current selection is a grouped composite object that can be ungrouped.
 */
export function canUngroupSelection(selectedIds: string[], scene: SceneState): boolean {
  if (selectedIds.length !== 1) return false;
  const obj = scene.objects[selectedIds[0]];
  if (!obj) return false;
  const p = obj.props as Record<string, unknown>;
  return (
    (Array.isArray(p.groupedItems) && p.groupedItems.length >= 2) ||
    (Array.isArray(p.multiSegments) && p.multiSegments.length >= 2)
  );
}

/**
 * Ungroups a merged composite object back into its exact original objects & strokes,
 * transformed to match any translation / resize applied while grouped!
 */
export function ungroupSelectedObject(
  selectedIds: string[],
  scene: SceneState,
): { sourceId: string; events: WhiteboardEvent[]; newIds: string[] } | null {
  if (!canUngroupSelection(selectedIds, scene)) return null;
  const sourceId = selectedIds[0];
  const obj = scene.objects[sourceId];
  if (!obj) return null;

  const p = obj.props as Record<string, unknown>;
  const events: WhiteboardEvent[] = [
    { event_type: 'object.deleted', payload: { id: sourceId } },
  ];
  const newIds: string[] = [];
  const ts = Date.now();

  const groupedItems = Array.isArray(p.groupedItems)
    ? (p.groupedItems as GroupedItemSnapshot[])
    : null;

  if (groupedItems && groupedItems.length >= 2) {
    const orig = (p.groupedOrigin as { x: number; y: number; w: number; h: number } | undefined) ?? {
      x: Number(p.x ?? 0),
      y: Number(p.y ?? 0),
      w: Number(p.w ?? 100),
      h: Number(p.h ?? 100),
    };
    const curX = Number(p.x ?? orig.x);
    const curY = Number(p.y ?? orig.y);
    const curW = Math.max(1, Number(p.w ?? orig.w));
    const curH = Math.max(1, Number(p.h ?? orig.h));
    const sx = curW / Math.max(1, orig.w);
    const sy = curH / Math.max(1, orig.h);
    const sAvg = (sx + sy) / 2;

    const tx = (v: number) => Math.round(curX + (v - orig.x) * sx);
    const ty = (v: number) => Math.round(curY + (v - orig.y) * sy);

    groupedItems.forEach((item, idx) => {
      const nid = `ungroup-${ts}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
      if (item.kind === 'stroke' && Array.isArray(item.points)) {
        newIds.push(nid);
        events.push({
          event_type: 'stroke.committed',
          payload: {
            id: nid,
            points: item.points.map(([px, py, pr]) => [tx(px), ty(py), pr] as [number, number, number]),
            color: item.color ?? (typeof p.stroke === 'string' ? p.stroke : '#0f172a'),
            width: item.width ?? Number(p.strokeWidth ?? 3),
            tool: item.tool ?? 'pen',
          },
        } as unknown as WhiteboardEvent);
        return;
      }

      if (item.kind === 'object' && item.object_type && item.props) {
        const nextProps = JSON.parse(JSON.stringify(item.props)) as Record<string, unknown>;
        if (Array.isArray(nextProps.multiSegments)) {
          nextProps.multiSegments = (nextProps.multiSegments as number[][]).map((seg) =>
            seg.map((v, i) => (i % 2 === 0 ? tx(v) : ty(v))),
          );
        }
        if (Array.isArray(nextProps.customPoints)) {
          nextProps.customPoints = (nextProps.customPoints as number[]).map((v, i) =>
            i % 2 === 0 ? tx(v) : ty(v),
          );
        }
        if (typeof nextProps.x === 'number') nextProps.x = tx(nextProps.x);
        if (typeof nextProps.y === 'number') nextProps.y = ty(nextProps.y);
        if (typeof nextProps.cx === 'number') nextProps.cx = tx(nextProps.cx);
        if (typeof nextProps.cy === 'number') nextProps.cy = ty(nextProps.cy);
        if (typeof nextProps.w === 'number') nextProps.w = Math.max(8, Math.round(nextProps.w * sx));
        if (typeof nextProps.h === 'number') nextProps.h = Math.max(8, Math.round(nextProps.h * sy));
        if (typeof nextProps.rx === 'number') nextProps.rx = Math.max(4, Math.round(nextProps.rx * sx));
        if (typeof nextProps.ry === 'number') nextProps.ry = Math.max(4, Math.round(nextProps.ry * sy));
        if (typeof nextProps.r === 'number') nextProps.r = Math.max(6, Math.round(nextProps.r * sAvg));
        if (typeof nextProps.outerR === 'number') nextProps.outerR = Math.max(6, Math.round(nextProps.outerR * sAvg));
        if (typeof nextProps.innerR === 'number') nextProps.innerR = Math.max(4, Math.round(nextProps.innerR * sAvg));
        if (typeof nextProps.topW === 'number') nextProps.topW = Math.max(8, Math.round(nextProps.topW * sx));
        if (typeof nextProps.bottomW === 'number') nextProps.bottomW = Math.max(8, Math.round(nextProps.bottomW * sx));
        if (typeof nextProps.x1 === 'number') nextProps.x1 = tx(nextProps.x1);
        if (typeof nextProps.y1 === 'number') nextProps.y1 = ty(nextProps.y1);
        if (typeof nextProps.x2 === 'number') nextProps.x2 = tx(nextProps.x2);
        if (typeof nextProps.y2 === 'number') nextProps.y2 = ty(nextProps.y2);
        if (typeof nextProps.x3 === 'number') nextProps.x3 = tx(nextProps.x3);
        if (typeof nextProps.y3 === 'number') nextProps.y3 = ty(nextProps.y3);

        newIds.push(nid);
        events.push({
          event_type: 'object.created',
          payload: {
            id: nid,
            object_type: item.object_type,
            props: nextProps,
          },
        } as unknown as WhiteboardEvent);
      }
    });

    return { sourceId, events, newIds };
  }

  // Fallback for legacy multiSegments objects without groupedItems snapshot
  const segs = Array.isArray(p.multiSegments) ? (p.multiSegments as number[][]) : [];
  segs.forEach((seg, idx) => {
    if (!Array.isArray(seg) || seg.length < 4) return;
    const nid = `ungroup-${ts}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
    newIds.push(nid);
    const isClosedSeg =
      seg.length >= 8 &&
      Math.hypot(seg[0] - seg[seg.length - 2], seg[1] - seg[seg.length - 1]) < 4;
    if (isClosedSeg) {
      events.push({
        event_type: 'object.created',
        payload: {
          id: nid,
          object_type: 'polygon',
          props: {
            customPoints: seg.slice(0, seg.length - 2),
            stroke: p.stroke ?? '#0f172a',
            strokeWidth: p.strokeWidth ?? 3,
            fill: 'transparent',
          },
        },
      } as unknown as WhiteboardEvent);
    } else {
      events.push({
        event_type: 'object.created',
        payload: {
          id: nid,
          object_type: 'line',
          props: {
            x1: seg[0],
            y1: seg[1],
            x2: seg[seg.length - 2],
            y2: seg[seg.length - 1],
            stroke: p.stroke ?? '#0f172a',
            strokeWidth: p.strokeWidth ?? 3,
          },
        },
      } as unknown as WhiteboardEvent);
    }
  });

  return newIds.length > 0 ? { sourceId, events, newIds } : null;
}

/**
 * Checks whether the current selection is a divided multiSegments object with 2+ enclosed regions
 * that can be split into independent movable/deletable colored slices (e.g. 1/8, 3/4 fraction slices!).
 */
export function canSplitRegions(selectedIds: string[], scene: SceneState): boolean {
  if (selectedIds.length !== 1) return false;
  const obj = scene.objects[selectedIds[0]];
  if (!obj) return false;
  const p = obj.props as Record<string, unknown>;
  if (!Array.isArray(p.multiSegments) || p.multiSegments.length < 2) return false;
  return computePlanarRegions(p.multiSegments as number[][]).length >= 2;
}

/**
 * Splits a divided multiSegments object into independent standalone colored `polygon` slices
 * so individual slices can be dragged apart, deleted (e.g. 3/4), or re-merged with Gabung!
 * If a specific sub-region was active (`activeRegionIndex >= 0`), gently pops that slice outward.
 */
export function splitObjectIntoRegions(
  selectedIds: string[],
  scene: SceneState,
): { sourceId: string; events: WhiteboardEvent[]; newIds: string[] } | null {
  if (!canSplitRegions(selectedIds, scene)) return null;
  const sourceId = selectedIds[0];
  const obj = scene.objects[sourceId];
  if (!obj) return null;

  const p = obj.props as Record<string, unknown>;
  const segs = p.multiSegments as number[][];
  const regions = computePlanarRegions(segs);
  if (regions.length < 2) return null;

  const rf =
    typeof p.regionFills === 'object' && p.regionFills !== null
      ? (p.regionFills as Record<string, string>)
      : {};
  const activeIdx = typeof p.activeRegionIndex === 'number' ? p.activeRegionIndex : -1;
  const stroke = typeof p.stroke === 'string' ? p.stroke : '#0f172a';
  const strokeWidth = typeof p.strokeWidth === 'number' ? p.strokeWidth : 2;

  const groupCx = regions.reduce((s, r) => s + r.cx, 0) / regions.length;
  const groupCy = regions.reduce((s, r) => s + r.cy, 0) / regions.length;

  const events: WhiteboardEvent[] = [
    { event_type: 'object.deleted', payload: { id: sourceId } },
  ];
  const newIds: string[] = [];
  const ts = Date.now();

  regions.forEach((reg, idx) => {
    const nid = `slice-${ts}-${idx}-${Math.random().toString(36).slice(2, 5)}`;
    let pts = reg.points;
    // Gently pop out the active slice radially (just like pulling a 1/8 pizza slice out!)
    if (reg.index === activeIdx) {
      const vx = reg.cx - groupCx;
      const vy = reg.cy - groupCy;
      const len = Math.hypot(vx, vy) || 1;
      const popX = Math.round((vx / len) * 22);
      const popY = Math.round((vy / len) * 22);
      pts = reg.points.map((v, i) => (i % 2 === 0 ? v + popX : v + popY));
    }
    const fill = rf[String(reg.index)] ?? 'transparent';
    newIds.push(nid);
    events.push({
      event_type: 'object.created',
      payload: {
        id: nid,
        object_type: 'polygon',
        props: {
          customPoints: pts,
          stroke,
          strokeWidth,
          fill,
        },
      },
    } as unknown as WhiteboardEvent);
  });

  // If a specific slice was popped out, select JUST that popped slice so user can immediately drag or delete it!
  const focusIds = activeIdx >= 0 && newIds[activeIdx] ? [newIds[activeIdx]] : newIds;
  return { sourceId, events, newIds: focusIds };
}
