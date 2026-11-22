/**
 * Resampling and arc-length utilities for sketch-core (P10-T09)
 */
import type { Pt } from './types.js';

/** Calculate Euclidean distance between two points */
export function ptDistance(a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/** Calculate total arc length of a polyline */
export function pathLength(points: Pt[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += ptDistance(points[i - 1], points[i]);
  }
  return len;
}

/** Filter consecutive points that are closer than minDist */
export function filterMinDistance(points: Pt[], minDist: number): Pt[] {
  if (points.length <= 1) return [...points];
  const result: Pt[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    if (ptDistance(prev, curr) >= minDist) {
      result.push(curr);
    }
  }
  // Ensure the last point is preserved if sufficiently distinct
  const last = points[points.length - 1];
  if (result.length === 1 || ptDistance(result[result.length - 1], last) > 0.001) {
    if (result[result.length - 1] !== last) {
      result.push(last);
    }
  }
  return result;
}

/**
 * Resample polyline to exactly N equidistant points along the arc length
 */
export function resample(points: Pt[], n = 64): Pt[] {
  if (points.length === 0) return [];
  if (points.length === 1 || n <= 1) return Array.from({ length: n }, () => ({ ...points[0] }));

  const totalLength = pathLength(points);
  if (totalLength <= 1e-6) {
    return Array.from({ length: n }, () => ({ ...points[0] }));
  }

  const interval = totalLength / (n - 1);
  const resampled: Pt[] = [{ ...points[0] }];

  let accumulatedDist = 0;
  let currentSegmentIndex = 0;
  let pPrev = points[0];

  for (let i = 1; i < n - 1; i++) {
    const targetDist = i * interval;

    while (currentSegmentIndex < points.length - 1) {
      const pNext = points[currentSegmentIndex + 1];
      const segLength = ptDistance(pPrev, pNext);

      if (accumulatedDist + segLength >= targetDist - 1e-7) {
        // Point lies on this segment
        const remaining = targetDist - accumulatedDist;
        const ratio = segLength > 1e-7 ? Math.min(Math.max(remaining / segLength, 0), 1) : 0;
        const newPt: Pt = {
          x: pPrev.x + (pNext.x - pPrev.x) * ratio,
          y: pPrev.y + (pNext.y - pPrev.y) * ratio,
        };
        resampled.push(newPt);
        break;
      } else {
        accumulatedDist += segLength;
        currentSegmentIndex++;
        pPrev = points[currentSegmentIndex];
      }
    }
  }

  // Ensure last point is exactly the end point
  resampled.push({ ...points[points.length - 1] });

  // Guarantee exactly n points
  while (resampled.length < n) {
    resampled.push({ ...points[points.length - 1] });
  }

  return resampled.slice(0, n);
}
