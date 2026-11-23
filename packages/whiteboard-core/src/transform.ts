/**
 * @ai-classroom/whiteboard-core — CanonicalTransform & OBB Math
 *
 * Unified center-pivot transformation and Oriented Bounding Box (OBB) arithmetic.
 * Zero DOM or Konva dependencies. Pure deterministic math.
 */

export interface CanonicalTransform {
  /** World X center of the object */
  cx: number;
  /** World Y center of the object */
  cy: number;
  /** Unrotated local width (> 0) */
  width: number;
  /** Unrotated local height (> 0) */
  height: number;
  /** Rotation in radians around (cx, cy) */
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type BoxHandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * Converts a point in world coordinates to the object's local unrotated space
 * centered at (0, 0).
 */
export function worldToLocal(pt: Point2D, tf: CanonicalTransform): Point2D {
  const dx = pt.x - tf.cx;
  const dy = pt.y - tf.cy;
  const cos = Math.cos(-tf.rotation);
  const sin = Math.sin(-tf.rotation);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

/**
 * Converts a point in the object's local space (centered at (0, 0)) back to world space.
 */
export function localToWorld(localPt: Point2D, tf: CanonicalTransform): Point2D {
  const cos = Math.cos(tf.rotation);
  const sin = Math.sin(tf.rotation);
  return {
    x: tf.cx + localPt.x * cos - localPt.y * sin,
    y: tf.cy + localPt.x * sin + localPt.y * cos,
  };
}

/**
 * Hit-test a world point against an Oriented Bounding Box (OBB).
 */
export function isPointInOBB(
  pt: Point2D,
  tf: CanonicalTransform,
  tolerance = 8,
): boolean {
  const local = worldToLocal(pt, tf);
  const halfW = tf.width / 2 + tolerance;
  const halfH = tf.height / 2 + tolerance;
  return Math.abs(local.x) <= halfW && Math.abs(local.y) <= halfH;
}

/**
 * Returns the 4 world-space corners of the OBB in [nw, ne, se, sw] order.
 */
export function getOBBCorners(tf: CanonicalTransform): [Point2D, Point2D, Point2D, Point2D] {
  const hw = tf.width / 2;
  const hh = tf.height / 2;
  return [
    localToWorld({ x: -hw, y: -hh }, tf),
    localToWorld({ x: hw, y: -hh }, tf),
    localToWorld({ x: hw, y: hh }, tf),
    localToWorld({ x: -hw, y: hh }, tf),
  ];
}

/**
 * Returns the world-space Axis-Aligned Bounding Box enclosing the rotated OBB.
 */
export function getOBBAABB(tf: CanonicalTransform): AABB {
  const corners = getOBBCorners(tf);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Resizes a rotated object while keeping the opposite anchor pinned in world space,
 * preventing any sliding/drift when resizing rotated objects.
 */
export function resizeWithPinnedAnchor(
  orig: CanonicalTransform,
  handle: BoxHandleKind,
  pointerWorld: Point2D,
  minSize = 12,
): CanonicalTransform {
  const localPtr = worldToLocal(pointerWorld, orig);

  let minX = -orig.width / 2;
  let maxX = orig.width / 2;
  let minY = -orig.height / 2;
  let maxY = orig.height / 2;

  if (handle.includes('w')) minX = Math.min(maxX - minSize, localPtr.x);
  if (handle.includes('e')) maxX = Math.max(minX + minSize, localPtr.x);
  if (handle.includes('n')) minY = Math.min(maxY - minSize, localPtr.y);
  if (handle.includes('s')) maxY = Math.max(minY + minSize, localPtr.y);

  const newW = Math.max(minSize, maxX - minX);
  const newH = Math.max(minSize, maxY - minY);
  const localNewCenter = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
  const worldNewCenter = localToWorld(localNewCenter, orig);

  return {
    ...orig,
    cx: worldNewCenter.x,
    cy: worldNewCenter.y,
    width: newW,
    height: newH,
  };
}

/**
 * Computes rotation angle (radians) from object center to pointer.
 * When `snap15Deg` is true (e.g. Shift held), snaps to 15-degree increments.
 */
export function computeRotationAngle(
  center: Point2D,
  pointerWorld: Point2D,
  snap15Deg = false,
): number {
  let angle = Math.atan2(pointerWorld.y - center.y, pointerWorld.x - center.x) + Math.PI / 2;
  if (snap15Deg) {
    const step = Math.PI / 12; // 15 deg
    angle = Math.round(angle / step) * step;
  }
  return angle;
}

/**
 * Returns the world position of the rotation lollipop handle above the OBB top edge.
 */
export function getRotationHandleWorldPos(
  tf: CanonicalTransform,
  zoom = 1,
  offsetPx = 28,
): Point2D {
  const dist = tf.height / 2 + offsetPx / Math.max(zoom, 0.1);
  return localToWorld({ x: 0, y: -dist }, tf);
}

/**
 * Computes recentered bounding box and local-relative polygon points after vertex editing.
 */
export function recenterPolygonPoints(flatPts: number[]): {
  cx: number;
  cy: number;
  width: number;
  height: number;
  localPoints: number[];
} {
  if (flatPts.length < 2) {
    return { cx: 0, cy: 0, width: 0, height: 0, localPoints: [] };
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < flatPts.length; i += 2) {
    if (flatPts[i] < minX) minX = flatPts[i];
    if (flatPts[i] > maxX) maxX = flatPts[i];
    if (flatPts[i + 1] < minY) minY = flatPts[i + 1];
    if (flatPts[i + 1] > maxY) maxY = flatPts[i + 1];
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const localPoints: number[] = [];
  for (let i = 0; i < flatPts.length; i += 2) {
    localPoints.push(flatPts[i] - cx, flatPts[i + 1] - cy);
  }
  return {
    cx,
    cy,
    width: Math.max(10, maxX - minX),
    height: Math.max(10, maxY - minY),
    localPoints,
  };
}
