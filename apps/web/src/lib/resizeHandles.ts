/**
 * resizeHandles.ts
 * Pure arithmetic helpers for direct corner/edge handle resizing of 2D whiteboard objects.
 * Zero Konva/DOM dependencies.
 */

import type { BoardObject } from '@ai-classroom/whiteboard-core';

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ResizeHandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface HandlePoint {
  kind: ResizeHandleKind;
  x: number;
  y: number;
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

export function findHitResizeHandle(
  pos: { x: number; y: number },
  bbox: BBox,
  scale = 1
): ResizeHandleKind | null {
  const tol = Math.max(10, 13 / (scale || 1));
  for (const h of getResizeHandles(bbox)) {
    if (Math.hypot(pos.x - h.x, pos.y - h.y) <= tol) {
      return h.kind;
    }
  }
  return null;
}

/**
 * Computes new object props when dragging one of the 8 corner/edge handles.
 */
export function computeResizedProps(
  obj: BoardObject,
  handle: ResizeHandleKind,
  origBBox: BBox,
  origProps: Record<string, unknown>,
  pos: { x: number; y: number }
): Record<string, unknown> {
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

    case 'triangle': {
      const ox1 = (origProps.x1 as number) ?? origBBox.x;
      const oy1 = (origProps.y1 as number) ?? origBBox.y;
      const ox2 = (origProps.x2 as number) ?? origBBox.x + origBBox.w;
      const oy2 = (origProps.y2 as number) ?? origBBox.y + origBBox.h;
      const ox3 = (origProps.x3 as number) ?? origBBox.x;
      const oy3 = (origProps.y3 as number) ?? origBBox.y + origBBox.h;
      const sx = origBBox.w > 1 ? newW / origBBox.w : 1;
      const sy = origBBox.h > 1 ? newH / origBBox.h : 1;
      return {
        ...origProps,
        x1: minX + (ox1 - origBBox.x) * sx,
        y1: minY + (oy1 - origBBox.y) * sy,
        x2: minX + (ox2 - origBBox.x) * sx,
        y2: minY + (oy2 - origBBox.y) * sy,
        x3: minX + (ox3 - origBBox.x) * sx,
        y3: minY + (oy3 - origBBox.y) * sy,
      };
    }

    default:
      return origProps;
  }
}
