/**
 * resizeHandles.ts
 * Pure arithmetic helpers for shape-matched selection outlines, direct corner/vertex dragging,
 * and double-click vertex insertion on 2D whiteboard objects.
 * Zero Konva/DOM dependencies.
 */

import type { BoardObject } from '@ai-classroom/whiteboard-core';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ResizeHandleKind =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | `v:${number}`;

export interface HandlePoint {
  kind: ResizeHandleKind;
  x: number;
  y: number;
}

/**
 * Extracts exact flat vertex array [x0, y0, x1, y1, ...] for polygonal shapes.
 * Returns null for non-polygonal shapes (circle, ellipse, text, viz_*).
 */
export function getShapeVertices(obj: BoardObject): number[] | null {
  const p = obj.props as Record<string, unknown>;
  if (Array.isArray(p.customPoints) && p.customPoints.length >= 6) {
    return p.customPoints as number[];
  }

  switch (obj.object_type) {
    case 'rect': {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.w ?? p.width ?? 100);
      const h = Number(p.h ?? p.height ?? 60);
      return [x, y, x + w, y, x + w, y + h, x, y + h];
    }
    case 'triangle':
      return [
        Number(p.x1 ?? 0), Number(p.y1 ?? 0),
        Number(p.x2 ?? 50), Number(p.y2 ?? 80),
        Number(p.x3 ?? 100), Number(p.y3 ?? 0),
      ];
    case 'rhombus': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      return [cx, cy - ry, cx + rx, cy, cx, cy + ry, cx - rx, cy];
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
          : Number(p.sides ?? 6);
      const pts: number[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        pts.push(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      return pts;
    }
    case 'star': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const outerR = Number(p.outerR ?? p.r ?? 45);
      const innerR = Number(p.innerR ?? outerR / 2.2);
      const points = Number(p.points ?? 5);
      const pts: number[] = [];
      const step = Math.PI / points;
      for (let i = 0; i < 2 * points; i++) {
        const rad = i % 2 === 0 ? outerR : innerR;
        const angle = i * step - Math.PI / 2;
        pts.push(cx + rad * Math.cos(angle), cy + rad * Math.sin(angle));
      }
      return pts;
    }
    default:
      return null;
  }
}

export function getResizeHandles(bbox: BBox): HandlePoint[] {
  const { x, y, w, h } = bbox;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    { kind: 'nw', x, y },
    { kind: 'n', x: cx, y },
    { kind: 'ne', x: x + w, y },
    { kind: 'e', x: x + w, y: cy },
    { kind: 'se', x: x + w, y: y + h },
    { kind: 's', x: cx, y: y + h },
    { kind: 'sw', x, y: y + h },
    { kind: 'w', x, y: cy },
  ];
}

/**
 * Returns shape-matched handles:
 * - Custom polygons / triangles / pentagons / hexagons / rhombus / star -> handle on EVERY vertex
 * - Circle / Ellipse -> 4 cardinal handles right on the perimeter
 * - Line / Arrow -> 2 endpoint handles
 * - Rect -> 4 corners + 4 edge midpoints
 */
export function getShapeHandles(obj: BoardObject, bbox: BBox): HandlePoint[] {
  const p = obj.props as Record<string, unknown>;

  if (Array.isArray(p.customPoints) && p.customPoints.length >= 6) {
    const pts = p.customPoints as number[];
    const handles: HandlePoint[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      handles.push({ kind: `v:${i / 2}`, x: pts[i], y: pts[i + 1] });
    }
    return handles;
  }

  if (obj.object_type === 'circle' || obj.object_type === 'ellipse') {
    const cx = bbox.x + bbox.w / 2;
    const cy = bbox.y + bbox.h / 2;
    return [
      { kind: 'n', x: cx, y: bbox.y },
      { kind: 'e', x: bbox.x + bbox.w, y: cy },
      { kind: 's', x: cx, y: bbox.y + bbox.h },
      { kind: 'w', x: bbox.x, y: cy },
    ];
  }

  if (obj.object_type === 'line' || obj.object_type === 'arrow') {
    return [
      { kind: 'nw', x: Number(p.x1 ?? bbox.x), y: Number(p.y1 ?? bbox.y) },
      { kind: 'se', x: Number(p.x2 ?? bbox.x + bbox.w), y: Number(p.y2 ?? bbox.y + bbox.h) },
    ];
  }

  if (
    obj.object_type === 'triangle' ||
    obj.object_type === 'rhombus' ||
    obj.object_type === 'pentagon' ||
    obj.object_type === 'hexagon' ||
    obj.object_type === 'polygon' ||
    obj.object_type === 'star'
  ) {
    const verts = getShapeVertices(obj);
    if (verts) {
      const handles: HandlePoint[] = [];
      for (let i = 0; i < verts.length; i += 2) {
        handles.push({ kind: `v:${i / 2}`, x: verts[i], y: verts[i + 1] });
      }
      return handles;
    }
  }

  return getResizeHandles(bbox);
}

export function findHitResizeHandle(
  pos: { x: number; y: number },
  bbox: BBox,
  scale = 1,
  obj?: BoardObject
): ResizeHandleKind | null {
  const tol = Math.max(10, 14 / (scale || 1));
  const handles = obj ? getShapeHandles(obj, bbox) : getResizeHandles(bbox);
  for (const h of handles) {
    if (Math.hypot(pos.x - h.x, pos.y - h.y) <= tol) {
      return h.kind;
    }
  }
  return null;
}

/**
 * Inserts a new draggable vertex at `pos` on the nearest edge of a polygonal shape
 * (triggered when the user double-clicks a corner or edge of a selected shape).
 */
export function insertVertexAtPoint(
  obj: BoardObject,
  pos: { x: number; y: number }
): Record<string, unknown> | null {
  const verts = getShapeVertices(obj);
  if (!verts || verts.length < 6) return null;

  const n = verts.length / 2;
  let bestEdgeIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < n; i++) {
    const x1 = verts[i * 2];
    const y1 = verts[i * 2 + 1];
    const nextI = (i + 1) % n;
    const x2 = verts[nextI * 2];
    const y2 = verts[nextI * 2 + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 1e-6) {
      t = Math.max(0, Math.min(1, ((pos.x - x1) * dx + (pos.y - y1) * dy) / lenSq));
    }
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const dist = Math.hypot(pos.x - px, pos.y - py);
    if (dist < bestDist) {
      bestDist = dist;
      bestEdgeIdx = i;
    }
  }

  // Insert new point right after bestEdgeIdx (if clicked right on a corner, nudge slightly so it's immediately grabbable)
  const vx = verts[bestEdgeIdx * 2];
  const vy = verts[bestEdgeIdx * 2 + 1];
  const nextI = (bestEdgeIdx + 1) % n;
  const nx = verts[nextI * 2];
  const ny = verts[nextI * 2 + 1];

  const tooCloseToCorner =
    Math.hypot(pos.x - vx, pos.y - vy) < 8 || Math.hypot(pos.x - nx, pos.y - ny) < 8;
  const insertX = tooCloseToCorner ? (vx + nx) / 2 : pos.x;
  const insertY = tooCloseToCorner ? (vy + ny) / 2 : pos.y;

  const nextVerts = [...verts];
  nextVerts.splice((bestEdgeIdx + 1) * 2, 0, Math.round(insertX), Math.round(insertY));

  return {
    ...(obj.props as Record<string, unknown>),
    customPoints: nextVerts,
  };
}

/**
 * Computes new object props when dragging one of the shape handles (corner, edge, or individual vertex).
 */
export function computeResizedProps(
  obj: BoardObject,
  handle: ResizeHandleKind,
  origBBox: BBox,
  origProps: Record<string, unknown>,
  pos: { x: number; y: number }
): Record<string, unknown> {
  // Individual vertex dragging (v:0, v:1, ...)
  if (handle.startsWith('v:')) {
    const idx = Number(handle.slice(2));
    if (obj.object_type === 'triangle' && !Array.isArray(origProps.customPoints)) {
      if (idx === 0) return { ...origProps, x1: pos.x, y1: pos.y };
      if (idx === 1) return { ...origProps, x2: pos.x, y2: pos.y };
      if (idx === 2) return { ...origProps, x3: pos.x, y3: pos.y };
    }
    const baseVerts = getShapeVertices({ ...obj, props: origProps });
    if (baseVerts && idx * 2 + 1 < baseVerts.length) {
      const updated = [...baseVerts];
      updated[idx * 2] = pos.x;
      updated[idx * 2 + 1] = pos.y;
      return { ...origProps, customPoints: updated };
    }
    return origProps;
  }

  let minX = origBBox.x;
  let minY = origBBox.y;
  let maxX = origBBox.x + origBBox.w;
  let maxY = origBBox.y + origBBox.h;

  if (handle.includes('w')) minX = Math.min(maxX - 12, pos.x);
  if (handle.includes('e')) maxX = Math.max(minX + 12, pos.x);
  if (handle.includes('n')) minY = Math.min(maxY - 12, pos.y);
  if (handle.includes('s')) maxY = Math.max(minY + 12, pos.y);

  const newW = Math.max(12, maxX - minX);
  const newH = Math.max(12, maxY - minY);
  const newCx = minX + newW / 2;
  const newCy = minY + newH / 2;

  switch (obj.object_type) {
    case 'rect':
      return { ...origProps, x: minX, y: minY, w: newW, h: newH };

    case 'circle': {
      const r = Math.max(8, Math.max(newW, newH) / 2);
      return { ...origProps, x: newCx, y: newCy, r };
    }

    case 'ellipse':
    case 'rhombus':
      return { ...origProps, cx: newCx, cy: newCy, rx: newW / 2, ry: newH / 2 };

    case 'polygon':
    case 'pentagon':
    case 'hexagon': {
      const r = Math.max(8, Math.max(newW, newH) / 2);
      return { ...origProps, cx: newCx, cy: newCy, r };
    }

    case 'star': {
      const outerR = Math.max(10, Math.max(newW, newH) / 2);
      return { ...origProps, cx: newCx, cy: newCy, outerR, innerR: outerR / 2.2 };
    }

    case 'line':
    case 'arrow': {
      if (handle === 'nw' || handle === 'w' || handle === 'n') {
        return { ...origProps, x1: pos.x, y1: pos.y };
      }
      return { ...origProps, x2: pos.x, y2: pos.y };
    }

    default:
      return origProps;
  }
}
