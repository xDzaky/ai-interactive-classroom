/**
 * strokePath.ts — P10-T06
 *
 * Stroke outline caching and point reduction on commit.
 * - Point reduction: min distance filter, Ramer-Douglas-Peucker simplification, max cap (400)
 * - Outline memoization via WeakMap keyed by stroke.points array reference
 */
import { getStroke } from "perfect-freehand";
import type { BoardStroke } from "@ai-classroom/whiteboard-core";

export interface ReducePointsOptions {
  minDistance?: number;
  tolerance?: number;
  maxPoints?: number;
}

/**
 * Calculates perpendicular distance from point p to line segment ab.
 */
function perpDistance(
  p: [number, number, number],
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Ramer-Douglas-Peucker 3D point simplification preserving pressure.
 */
function rdp(
  pts: [number, number, number][],
  tolerance: number,
): [number, number, number][] {
  if (pts.length <= 2) return pts;

  let maxDist = 0;
  let maxIdx = 0;
  const start = pts[0];
  const end = pts[pts.length - 1];

  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDistance(pts[i], start, end);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = rdp(pts.slice(0, maxIdx + 1), tolerance);
    const right = rdp(pts.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [start, end];
}

/**
 * Reduces raw pointer points on stroke commit:
 * 1. Drops points with distance < minDistance from previous
 * 2. Applies RDP simplification with tolerance (default <= 0.4)
 * 3. Enforces hard cap (default 400 points) by uniform subsampling
 */
export function reducePoints(
  points: [number, number, number][],
  options: ReducePointsOptions = {},
): [number, number, number][] {
  if (points.length <= 2) return points;

  const minDistance = options.minDistance ?? 0.8;
  const tolerance = options.tolerance ?? 0.35;
  const maxPoints = options.maxPoints ?? 400;

  // 1. Min distance filter (preserve start & end)
  const distFiltered: [number, number, number][] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = distFiltered[distFiltered.length - 1];
    const curr = points[i];
    if (Math.hypot(curr[0] - prev[0], curr[1] - prev[1]) >= minDistance) {
      distFiltered.push(curr);
    }
  }
  distFiltered.push(points[points.length - 1]);

  // 2. RDP simplification
  let simplified = rdp(distFiltered, tolerance);

  // 3. Hard cap at maxPoints (subsample if still over cap)
  if (simplified.length > maxPoints) {
    const step = (simplified.length - 1) / (maxPoints - 1);
    const capped: [number, number, number][] = [];
    for (let i = 0; i < maxPoints; i++) {
      const idx = Math.min(simplified.length - 1, Math.round(i * step));
      capped.push(simplified[idx]);
    }
    simplified = capped;
  }

  return simplified;
}

// ---------------------------------------------------------------------------
// WeakMap memoization for stroke outline points
// ---------------------------------------------------------------------------

const outlinePointsCache = new WeakMap<[number, number, number][], number[]>();

/**
 * Computes the perfect-freehand outline points ONCE per stroke.
 * Subsequent calls return the cached number[] array in O(1).
 */
export function getCachedStrokePoints(stroke: BoardStroke): number[] {
  let cached = outlinePointsCache.get(stroke.points);
  if (cached) return cached;

  if (stroke.points.length < 2) return [];

  const freehand = getStroke(stroke.points, {
    size: stroke.width * 2.2,
    thinning: 0.55,
    smoothing: 0.5,
    streamline: 0.45,
    easing: (t: number) => Math.sin((t * Math.PI) / 2),
    simulatePressure: stroke.points[0][2] < 0.1,
  });

  cached = freehand.flatMap(([x, y]) => [x, y]);
  outlinePointsCache.set(stroke.points, cached);
  return cached;
}
