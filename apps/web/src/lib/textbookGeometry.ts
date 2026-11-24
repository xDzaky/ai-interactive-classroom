/**
 * textbookGeometry.ts — Pure Textbook Geometry Primitives & Perpendicular Snap Engine (V5)
 *
 * Implements:
 * - perpSnapPoint: orthogonal projection of B onto segment AD with ±4° snap + instant right-angle basis
 * - buildRightAngleSquare: 4 vertices [V, V+s*u, V+s*u+s*v, V+s*v]
 * - computeEdgeLabelPlacement: upright label placement & rotation along any segment
 * - buildConcentricArcSvgPath: concentric angle arcs (tier 1/2/3) with degree calculation
 */
import type { Point2D } from '@ai-classroom/whiteboard-core';

export interface PerpSnapResult {
  snapped: boolean;
  foot: Point2D;
  uDir: Point2D;
  vDir: Point2D;
  angleErrorDeg: number;
}

/**
 * Given a drawing ray from origin B toward cursor P and a target segment A-D,
 * snaps P to the orthogonal foot H on AD if the angle to the perpendicular is within toleranceDeg (default 4°).
 */
export function perpSnapPoint(
  originB: Point2D,
  cursorP: Point2D,
  segA: Point2D,
  segD: Point2D,
  toleranceDeg = 4,
): PerpSnapResult {
  const adx = segD.x - segA.x;
  const ady = segD.y - segA.y;
  const adLenSq = adx * adx + ady * ady;
  if (adLenSq < 1e-6) {
    return { snapped: false, foot: cursorP, uDir: { x: 1, y: 0 }, vDir: { x: 0, y: 1 }, angleErrorDeg: 90 };
  }

  const tRaw = ((originB.x - segA.x) * adx + (originB.y - segA.y) * ady) / adLenSq;
  const t = Math.max(0, Math.min(1, tRaw));
  const H: Point2D = { x: segA.x + t * adx, y: segA.y + t * ady };

  const bhx = H.x - originB.x;
  const bhy = H.y - originB.y;
  const bpx = cursorP.x - originB.x;
  const bpy = cursorP.y - originB.y;
  const bhLen = Math.hypot(bhx, bhy);
  const bpLen = Math.hypot(bpx, bpy);

  if (bhLen < 4 || bpLen < 4) {
    return { snapped: false, foot: cursorP, uDir: { x: 1, y: 0 }, vDir: { x: 0, y: 1 }, angleErrorDeg: 90 };
  }

  const cosErr = Math.max(-1, Math.min(1, (bhx * bpx + bhy * bpy) / (bhLen * bpLen)));
  const angleErrorDeg = (Math.acos(cosErr) * 180) / Math.PI;
  const distToFoot = Math.hypot(cursorP.x - H.x, cursorP.y - H.y);

  const adLen = Math.sqrt(adLenSq);
  const uDir: Point2D = { x: adx / adLen, y: ady / adLen };
  const vDir: Point2D = { x: -bhx / bhLen, y: -bhy / bhLen };

  return {
    snapped: angleErrorDeg <= toleranceDeg && distToFoot <= Math.max(24, bhLen * 0.25),
    foot: H,
    uDir,
    vDir,
    angleErrorDeg,
  };
}

/** 4 corner points of a right-angle square marker */
export function buildRightAngleSquare(
  vertex: Point2D,
  uDir: Point2D,
  vDir: Point2D,
  sizePx = 14,
): [Point2D, Point2D, Point2D, Point2D] {
  const p1: Point2D = { x: vertex.x + sizePx * uDir.x, y: vertex.y + sizePx * uDir.y };
  const p2: Point2D = { x: p1.x + sizePx * vDir.x, y: p1.y + sizePx * vDir.y };
  const p3: Point2D = { x: vertex.x + sizePx * vDir.x, y: vertex.y + sizePx * vDir.y };
  return [vertex, p1, p2, p3];
}

/**
 * Places a label along segment p1->p2 at parameter t with perpendicular offset,
 * flipping angle by +π if |angle| > π/2 so text is NEVER upside-down!
 */
export function computeEdgeLabelPlacement(
  p1: Point2D,
  p2: Point2D,
  t = 0.5,
  offsetPerpPx = -16,
  alignToEdge = true,
): { x: number; y: number; rotationDeg: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const x = (1 - t) * p1.x + t * p2.x + offsetPerpPx * nx;
  const y = (1 - t) * p1.y + t * p2.y + offsetPerpPx * ny;

  if (!alignToEdge) return { x, y, rotationDeg: 0 };
  let angle = Math.atan2(dy, dx);
  if (angle > Math.PI / 2) angle -= Math.PI;
  if (angle < -Math.PI / 2) angle += Math.PI;
  return { x, y, rotationDeg: (angle * 180) / Math.PI };
}
