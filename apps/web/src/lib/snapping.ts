/**
 * snapping.ts — P02-T05
 * Grid snapping utilities for shape builder.
 * Pure functions — no DOM, no React.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Snap a point to the nearest grid cell.
 * @param pt  World-space point
 * @param gridSize  Grid cell size in world units (default 40)
 */
export function snapToGrid(pt: Point, gridSize = 40): Point {
  return {
    x: Math.round(pt.x / gridSize) * gridSize,
    y: Math.round(pt.y / gridSize) * gridSize,
  };
}

/**
 * Snap a width/height pair so the shape stays grid-aligned.
 */
export function snapSize(w: number, h: number, gridSize = 40): { w: number; h: number } {
  return {
    w: Math.max(gridSize, Math.round(w / gridSize) * gridSize),
    h: Math.max(gridSize, Math.round(h / gridSize) * gridSize),
  };
}

/**
 * Constrain drag delta to 45° angles (for arrow/line with Shift held).
 */
export function constrainToAxis(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);

  if (angle < 22.5) {
    // Horizontal
    return { x: end.x, y: start.y };
  } else if (angle > 67.5) {
    // Vertical
    return { x: start.x, y: end.y };
  } else {
    // Diagonal — use shorter axis to maintain 45°
    const d = Math.min(Math.abs(dx), Math.abs(dy));
    return {
      x: start.x + Math.sign(dx) * d,
      y: start.y + Math.sign(dy) * d,
    };
  }
}

/**
 * Snap point to nearby object anchor points (corners, centers).
 * Returns the snapped point if within threshold, or the original.
 */
export interface AnchorPoint extends Point {
  kind: "corner" | "center" | "edge";
}

export function snapToAnchors(
  pt: Point,
  anchors: AnchorPoint[],
  threshold = 10
): Point {
  let best: Point | null = null;
  let bestDist = threshold;

  for (const anchor of anchors) {
    const d = Math.hypot(pt.x - anchor.x, pt.y - anchor.y);
    if (d < bestDist) {
      bestDist = d;
      best = anchor;
    }
  }

  return best ?? pt;
}
