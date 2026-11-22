/**
 * selectionHitTest.ts — Whiteboard Selection & Hit Testing (P10-T02)
 * Pure functions for hit testing strokes, shapes, and marquee selection intersection.
 * Completely pure arithmetic — zero DOM, zero Konva dependencies.
 */

import type { BoardObject, BoardStroke, SceneState } from '@ai-classroom/whiteboard-core';

export interface BoundingBox2D {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeObjectBbox(obj: BoardObject): BoundingBox2D {
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
    case 'viz_solid':
    case 'viz_graph': {
      const cx = Number(p.cx ?? (p.x ?? 200));
      const cy = Number(p.cy ?? (p.y ?? 200));
      const size = 180;
      return { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
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
 */
export function findHitItem(
  pt: { x: number; y: number },
  scene: SceneState
): string | null {
  // Check order in reverse (topmost first)
  for (let i = scene.order.length - 1; i >= 0; i--) {
    const id = scene.order[i];
    const bbox = getItemBBox(id, scene);
    if (bbox && isPointInBBox(pt, bbox)) {
      return id;
    }
  }

  // Also check any objects not in order
  for (const id of Object.keys(scene.objects)) {
    if (!scene.order.includes(id)) {
      const bbox = computeObjectBbox(scene.objects[id]);
      if (isPointInBBox(pt, bbox)) {
        return id;
      }
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
