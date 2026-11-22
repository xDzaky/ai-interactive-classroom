/**
 * Geometry algorithms for shape recognition (P10-T09)
 * PCA Ellipse/Circle fit, RDP polygon extraction, corner refinement, fit scoring.
 */
import type { Pt, ShapeCandidate, ShapeKind, ShapeGeometry } from './types.js';
import { CONSTANTS } from './constants.js';
import { ptDistance, pathLength } from './resample.js';

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  diagonal: number;
  centerX: number;
  centerY: number;
}

export function computeBBox(points: Pt[]): BBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, diagonal: 0, centerX: 0, centerY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const width = Math.max(maxX - minX, 0.001);
  const height = Math.max(maxY - minY, 0.001);
  const diagonal = Math.hypot(width, height);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    diagonal,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/** Perpendicular distance from point p to line segment ab */
export function perpDistToLine(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return ptDistance(p, a);
  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return num / Math.sqrt(lenSq);
}

/** Distance from point p to line segment ab (clamped to segment ends) */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) return ptDistance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** Interior angle at vertex b between ba and bc in degrees (0 to 180) */
export function interiorAngleDeg(a: Pt, b: Pt, c: Pt): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  if (len1 < 1e-6 || len2 < 1e-6) return 180;
  const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
  const clampedDot = Math.max(-1, Math.min(1, dot));
  return (Math.acos(clampedDot) * 180) / Math.PI;
}

/** Ramer-Douglas-Peucker polyline simplification */
export function ramerDouglasPeucker(points: Pt[], epsilon: number): Pt[] {
  if (points.length <= 2) return [...points];

  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpDistToLine(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const right = ramerDouglasPeucker(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [first, last];
  }
}

/** Check if two 2D line segments cross each other (proper intersection) */
function segmentsIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  function ccw(p1: Pt, p2: Pt, p3: Pt) {
    return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  }
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

/** Check if a closed polygon self-intersects (non-adjacent edges cross) */
export function isPolygonSelfIntersecting(pts: Pt[]): boolean {
  const n = pts.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // adjacent wrapped edges
      const b1 = pts[j];
      const b2 = pts[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

/** Fit infinite line through two points and find intersection */
export function intersectLines(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-8) return null; // Parallel or degenerate
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

/** Mean distance from points to polygon boundary divided by bbox diagonal */
export function computePolygonFitError(samplePoints: Pt[], polygonVertices: Pt[], bboxDiag: number): number {
  if (polygonVertices.length < 3 || bboxDiag < 1e-4) return 1.0;
  const m = polygonVertices.length;
  let totalDist = 0;

  for (const pt of samplePoints) {
    let minDist = Infinity;
    for (let j = 0; j < m; j++) {
      const v1 = polygonVertices[j];
      const v2 = polygonVertices[(j + 1) % m];
      const d = distToSegment(pt, v1, v2);
      if (d < minDist) minDist = d;
    }
    totalDist += minDist;
  }

  const meanDist = totalDist / samplePoints.length;
  return meanDist / bboxDiag;
}

/**
 * Fit an ellipse using PCA on resampled stroke points
 */
export function fitEllipsePCA(points: Pt[]): {
  candidate: ShapeCandidate;
  axisRatio: number;
} | null {
  const n = points.length;
  if (n < 8) return null;

  // If closed loop with duplicate start/end point, avoid double-counting in centroid & covariance
  const isDuplicateEnd = ptDistance(points[0], points[n - 1]) <= Math.max(1.5, 0.005 * (computeBBox(points).diagonal || 1));
  const samplePts = isDuplicateEnd ? points.slice(0, n - 1) : points;
  const m = samplePts.length;

  // 1. Centroid
  let sumX = 0;
  let sumY = 0;
  for (const p of samplePts) {
    sumX += p.x;
    sumY += p.y;
  }
  const cx = sumX / m;
  const cy = sumY / m;

  // 2. Covariance matrix
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of samplePts) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= m;
  syy /= m;
  sxy /= m;

  // 3. Principal orientation
  const angleRad = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Project points to principal axes (u, v)
  let sumU2 = 0;
  let sumV2 = 0;
  const proj = samplePts.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const u = dx * cosA + dy * sinA;
    const v = -dx * sinA + dy * cosA;
    sumU2 += u * u;
    sumV2 += v * v;
    return { u, v };
  });

  let rx = Math.sqrt(2 * (sumU2 / m));
  let ry = Math.sqrt(2 * (sumV2 / m));
  if (rx < 1e-4 || ry < 1e-4) return null;

  // Scale adjustment so mean radial distance is 1.0
  let sumNormDist = 0;
  for (const { u, v } of proj) {
    sumNormDist += Math.hypot(u / rx, v / ry);
  }
  const scaleFactor = sumNormDist / m;
  if (scaleFactor > 0.001) {
    rx *= scaleFactor;
    ry *= scaleFactor;
  }

  // Calculate RMS radial error
  let sumErrSq = 0;
  for (const { u, v } of proj) {
    const normDist = Math.hypot(u / rx, v / ry);
    const err = normDist - 1.0;
    sumErrSq += err * err;
  }
  let rmsErr = Math.sqrt(sumErrSq / m);

  let rotDeg = (angleRad * 180) / Math.PI;
  // Normalize angle to [0, 180)
  rotDeg = ((rotDeg % 180) + 180) % 180;

  const minR = Math.min(rx, ry);
  const maxR = Math.max(rx, ry);
  const axisRatio = minR / maxR;
  const isCircle = axisRatio >= CONSTANTS.CIRCLE_AXIS_RATIO;

  let finalRx = rx;
  let finalRy = ry;
  let finalRot = rotDeg;

  if (isCircle) {
    // For circle, compute true radial deviation against mean radius
    let sumR = 0;
    for (const p of samplePts) {
      sumR += Math.hypot(p.x - cx, p.y - cy);
    }
    const avgR = sumR / m;
    let circleErrSq = 0;
    for (const p of samplePts) {
      const r = Math.hypot(p.x - cx, p.y - cy);
      const e = r / avgR - 1.0;
      circleErrSq += e * e;
    }
    rmsErr = Math.sqrt(circleErrSq / m);
    finalRx = avgR;
    finalRy = avgR;
    finalRot = 0;
  }

  const confidence = Math.max(0, Math.min(1, 1 - rmsErr / CONSTANTS.ELLIPSE_RMS_DIVISOR));

  const geometry: ShapeGeometry = {
    type: 'ellipse',
    cx,
    cy,
    rx: finalRx,
    ry: finalRy,
    rotationDeg: finalRot,
  };

  return {
    candidate: {
      kind: isCircle ? 'circle' : 'ellipse',
      confidence,
      fitError: rmsErr,
      geometry,
    },
    axisRatio,
  };
}
