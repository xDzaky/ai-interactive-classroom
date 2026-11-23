/**
 * selectionHitTest.ts — Whiteboard Selection & Hit Testing (P10-T02)
 * Pure functions for hit testing strokes, shapes, and marquee selection intersection.
 * Completely pure arithmetic — zero DOM, zero Konva dependencies.
 */

import {
  isPointInOBB,
  type BoardObject,
  type BoardStroke,
  type SceneState,
  type CanonicalTransform,
} from '@ai-classroom/whiteboard-core';

export interface BoundingBox2D {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DEFAULT_SOLID_WIDGET_SIZE = 320;
export const DEFAULT_GRAPH_WIDGET_WIDTH = 360;
export const DEFAULT_GRAPH_WIDGET_HEIGHT = 240;
export const DEFAULT_MATH_BLOCK_WIDTH = 320;
export const DEFAULT_MATH_BLOCK_HEIGHT = 120;

export function getObjectRotation(obj: BoardObject): number {
  const rot = Number((obj.props as Record<string, unknown>).rotation ?? 0);
  return Number.isFinite(rot) ? rot : 0;
}

export function getObjectTransform(obj: BoardObject): CanonicalTransform {
  const bbox = computeObjectBbox(obj);
  return {
    cx: bbox.x + bbox.w / 2,
    cy: bbox.y + bbox.h / 2,
    width: Math.max(10, bbox.w),
    height: Math.max(10, bbox.h),
    rotation: getObjectRotation(obj),
  };
}

export function computeObjectBbox(obj: BoardObject): BoundingBox2D {
  const raw = obj.props as Record<string, unknown>;
  if (Array.isArray(raw.customPoints) && raw.customPoints.length >= 6) {
    const pts = raw.customPoints as number[];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] < minX) minX = pts[i];
      if (pts[i] > maxX) maxX = pts[i];
      if (pts[i + 1] < minY) minY = pts[i + 1];
      if (pts[i + 1] > maxY) maxY = pts[i + 1];
    }
    return { x: minX, y: minY, w: Math.max(10, maxX - minX), h: Math.max(10, maxY - minY) };
  }
  const p = obj.props as Record<string, number & string>;
  switch (obj.object_type) {
    case 'rect': {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.w ?? p.width ?? 100);
      const h = Number(p.h ?? p.height ?? 60);
      return { x, y, w, h };
    }
    case 'circle': {
      const cx = Number(p.x ?? 0);
      const cy = Number(p.y ?? 0);
      const r = Number(p.r ?? p.radius ?? 40);
      return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    }
    case 'ellipse': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 50));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 30));
      return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
    }
    case 'rhombus': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const rx = Number(p.rx ?? (p.w ? Number(p.w) / 2 : 40));
      const ry = Number(p.ry ?? (p.h ? Number(p.h) / 2 : 50));
      return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
    }
    case 'pentagon':
    case 'hexagon':
    case 'polygon': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const r = Number(p.r ?? 40);
      return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    }
    case 'star': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const outerR = Number(p.outerR ?? (p.r ?? 45));
      return { x: cx - outerR, y: cy - outerR, w: outerR * 2, h: outerR * 2 };
    }
    case 'triangle': {
      const xs = [Number(p.x1 ?? 0), Number(p.x2 ?? 50), Number(p.x3 ?? 100)];
      const ys = [Number(p.y1 ?? 0), Number(p.y2 ?? 80), Number(p.y3 ?? 0)];
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    }
    case 'arrow':
    case 'line': {
      const x1 = Number(p.x1 ?? 0);
      const y1 = Number(p.y1 ?? 0);
      const x2 = Number(p.x2 ?? 100);
      const y2 = Number(p.y2 ?? 100);
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      return { x: minX, y: minY, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
    }
    case 'trapezoid':
    case 'parallelogram':
    case 'kite': {
      const cx = Number(p.cx ?? p.x ?? 0);
      const cy = Number(p.cy ?? p.y ?? 0);
      const w = Number(p.w ?? p.bottomW ?? 120);
      const h = Number(p.h ?? 80);
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    }
    case 'viz_solid': {
      const x = Number(p.x ?? (typeof p.cx === 'number' ? p.cx - DEFAULT_SOLID_WIDGET_SIZE / 2 : 200));
      const y = Number(p.y ?? (typeof p.cy === 'number' ? p.cy - DEFAULT_SOLID_WIDGET_SIZE / 2 : 120));
      const w = Number(p.w ?? p.width ?? DEFAULT_SOLID_WIDGET_SIZE);
      const h = Number(p.h ?? p.height ?? DEFAULT_SOLID_WIDGET_SIZE);
      return { x, y, w, h };
    }
    case 'viz_graph': {
      const x = Number(p.x ?? 200);
      const y = Number(p.y ?? 120);
      const w = Number(p.w ?? p.width ?? DEFAULT_GRAPH_WIDGET_WIDTH);
      const h = Number(p.h ?? p.height ?? DEFAULT_GRAPH_WIDGET_HEIGHT);
      return { x, y, w, h };
    }
    case 'math_block': {
      const x = Number(p.x ?? 200);
      const y = Number(p.y ?? 120);
      const w = Number(p.w ?? p.width ?? DEFAULT_MATH_BLOCK_WIDTH);
      const h = Number(p.h ?? p.height ?? DEFAULT_MATH_BLOCK_HEIGHT);
      return { x, y, w, h };
    }
    default: {
      const x = Number(p.x ?? 0);
      const y = Number(p.y ?? 0);
      const w = Number(p.w ?? p.width ?? 100);
      const h = Number(p.h ?? p.height ?? 60);
      return { x, y, w, h };
    }
  }
}

export function getStrokeBBox(stroke: BoardStroke): BoundingBox2D {
  if (stroke.points.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  let minX = stroke.points[0][0];
  let maxX = minX;
  let minY = stroke.points[0][1];
  let maxY = minY;

  for (let i = 1; i < stroke.points.length; i++) {
    const x = stroke.points[i][0];
    const y = stroke.points[i][1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const padding = Math.max(stroke.width, 8);
  return {
    x: minX - padding,
    y: minY - padding,
    w: Math.max(maxX - minX + padding * 2, 10),
    h: Math.max(maxY - minY + padding * 2, 10),
  };
}

export function getItemBBox(
  id: string,
  scene: SceneState
): BoundingBox2D | null {
  const obj = scene.objects[id];
  if (obj) {
    return computeObjectBbox(obj);
  }
  const stroke = scene.strokes[id];
  if (stroke) {
    return getStrokeBBox(stroke);
  }
  return null;
}

export function isPointInBBox(
  pt: { x: number; y: number },
  bbox: BoundingBox2D,
  tolerance = 8
): boolean {
  return (
    pt.x >= bbox.x - tolerance &&
    pt.x <= bbox.x + bbox.w + tolerance &&
    pt.y >= bbox.y - tolerance &&
    pt.y <= bbox.y + bbox.h + tolerance
  );
}

export function doBBoxesIntersect(
  b1: BoundingBox2D,
  b2: BoundingBox2D
): boolean {
  return !(
    b2.x > b1.x + b1.w ||
    b2.x + b2.w < b1.x ||
    b2.y > b1.y + b1.h ||
    b2.y + b2.h < b1.y
  );
}

/**
 * Finds the topmost item (object or stroke) at world position (x, y).
 * Uses OBB hit-testing for rotated objects so hitboxes always align with visuals.
 */
export function findHitItem(
  pt: { x: number; y: number },
  scene: SceneState
): string | null {
  const hitTestId = (id: string): boolean => {
    const obj = scene.objects[id];
    if (obj) {
      const rot = getObjectRotation(obj);
      if (Math.abs(rot) > 1e-4) {
        return isPointInOBB(pt, getObjectTransform(obj), 8);
      }
      return isPointInBBox(pt, computeObjectBbox(obj));
    }
    const stroke = scene.strokes[id];
    if (stroke) {
      return isPointInBBox(pt, getStrokeBBox(stroke));
    }
    return false;
  };

  // Check order in reverse (topmost first)
  for (let i = scene.order.length - 1; i >= 0; i--) {
    const id = scene.order[i];
    if (hitTestId(id)) {
      return id;
    }
  }

  // Also check any objects not in order
  for (const id of Object.keys(scene.objects)) {
    if (!scene.order.includes(id) && hitTestId(id)) {
      return id;
    }
  }

  return null;
}

/**
 * Finds all items intersecting the marquee selection rectangle.
 */
export function findItemsInMarquee(
  marquee: BoundingBox2D,
  scene: SceneState
): string[] {
  const normalizedMarquee: BoundingBox2D = {
    x: marquee.w < 0 ? marquee.x + marquee.w : marquee.x,
    y: marquee.h < 0 ? marquee.y + marquee.h : marquee.y,
    w: Math.abs(marquee.w),
    h: Math.abs(marquee.h),
  };

  const selectedIds: string[] = [];

  for (const id of scene.order) {
    const bbox = getItemBBox(id, scene);
    if (bbox && doBBoxesIntersect(normalizedMarquee, bbox)) {
      selectedIds.push(id);
    }
  }

  return selectedIds;
}
