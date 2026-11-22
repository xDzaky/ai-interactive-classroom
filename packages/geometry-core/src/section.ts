/**
 * 3D Plane / Line mathematics & Polyhedron Cross-Sections — @ai-classroom/geometry-core (P11-T03)
 * Implements plane equations, segment-plane intersections, convex cross-section polygon extraction,
 * point-line and line-line distance, and dihedral angles.
 */

import type { Vec3, Polyhedron } from './polyhedron.js';
import {
  vecSub,
  vecAdd,
  vecCross,
  vecDot,
  vecLength,
  computeCentroid,
} from './polyhedron.js';

export interface Plane {
  n: Vec3;
  d: number; // Plane equation: n . x = d, where n is normalized
}

export interface SectionPolygon {
  points: Vec3[];
  area: number;
  perimeter: number;
  anglesDeg: number[];
}

/** Normalize 3D vector */
export function vecNormalize(v: Vec3): Vec3 {
  const len = vecLength(v);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/** Multiply vector by scalar */
export function vecScale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** Distance between two 3D points */
export function pt3Dist(a: Vec3, b: Vec3): number {
  return vecLength(vecSub(a, b));
}

/**
 * Construct plane from 3 non-collinear points: n . x = d
 * Returns null if points are collinear or identical.
 */
export function planeFrom3Points(p1: Vec3, p2: Vec3, p3: Vec3): Plane | null {
  const v1 = vecSub(p2, p1);
  const v2 = vecSub(p3, p1);
  const cross = vecCross(v1, v2);
  const len = vecLength(cross);
  if (len < 1e-7) return null; // Collinear
  const n: Vec3 = [cross[0] / len, cross[1] / len, cross[2] / len];
  const d = vecDot(n, p1);
  return { n, d };
}

/**
 * Intersect line segment p1 -> p2 with plane n . x = d
 * Returns { t, point } where t in [0, 1], or null if parallel / no intersection.
 */
export function intersectSegmentPlane(
  p1: Vec3,
  p2: Vec3,
  plane: Plane
): { t: number; point: Vec3 } | null {
  const { n, d } = plane;
  const dir = vecSub(p2, p1);
  const denom = vecDot(n, dir);

  // Parallel to plane
  if (Math.abs(denom) < 1e-9) return null;

  const t = (d - vecDot(n, p1)) / denom;

  // Segment boundaries with small numeric tolerance
  if (t < -1e-5 || t > 1 + 1e-5) return null;

  const clampedT = Math.max(0, Math.min(1, t));
  const point: Vec3 = [
    p1[0] + clampedT * dir[0],
    p1[1] + clampedT * dir[1],
    p1[2] + clampedT * dir[2],
  ];

  return { t: clampedT, point };
}

/**
 * Intersect a polyhedron with a plane, returning the convex section polygon.
 * Returns null if the plane misses the polyhedron or intersects in fewer than 3 points.
 */
export function intersectPolyhedronPlane(poly: Polyhedron, plane: Plane): SectionPolygon | null {
  const rawPoints: Vec3[] = [];

  // 1. Intersect plane with all unique polyhedron edges
  for (const [u, v] of poly.edges) {
    const p1 = poly.vertices[u];
    const p2 = poly.vertices[v];
    const hit = intersectSegmentPlane(p1, p2, plane);
    if (hit) {
      rawPoints.push(hit.point);
    }
  }

  // 2. Merge points closer than 1e-4 (e.g. plane passing exactly through a vertex)
  const uniquePoints: Vec3[] = [];
  for (const p of rawPoints) {
    const isDup = uniquePoints.some((u) => pt3Dist(u, p) < 1e-4);
    if (!isDup) {
      uniquePoints.push(p);
    }
  }

  if (uniquePoints.length < 3) return null;

  // 3. Order points cyclically around their centroid on the plane
  const centroid = computeCentroid(uniquePoints);

  // Build orthonormal basis (uAxis, vAxis) on plane
  const norm = plane.n;
  // Choose arbitrary vector not parallel to norm
  const nonParallel: Vec3 = Math.abs(norm[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const uAxis = vecNormalize(vecCross(nonParallel, norm));
  const vAxis = vecCross(norm, uAxis);

  // Sort by angle around centroid
  const sorted = [...uniquePoints].sort((a, b) => {
    const da = vecSub(a, centroid);
    const db = vecSub(b, centroid);
    const angleA = Math.atan2(vecDot(da, vAxis), vecDot(da, uAxis));
    const angleB = Math.atan2(vecDot(db, vAxis), vecDot(db, uAxis));
    return angleA - angleB;
  });

  const k = sorted.length;

  // 4. Compute perimeter
  let perimeter = 0;
  for (let i = 0; i < k; i++) {
    perimeter += pt3Dist(sorted[i], sorted[(i + 1) % k]);
  }

  // 5. Compute area via fan triangulation from centroid
  let area = 0;
  for (let i = 0; i < k; i++) {
    const pA = sorted[i];
    const pB = sorted[(i + 1) % k];
    const e1 = vecSub(pA, centroid);
    const e2 = vecSub(pB, centroid);
    area += 0.5 * vecLength(vecCross(e1, e2));
  }

  // 6. Compute interior angles in degrees
  const anglesDeg: number[] = [];
  for (let i = 0; i < k; i++) {
    const prev = sorted[(i - 1 + k) % k];
    const curr = sorted[i];
    const next = sorted[(i + 1) % k];

    const v1 = vecNormalize(vecSub(prev, curr));
    const v2 = vecNormalize(vecSub(next, curr));
    const cosAngle = Math.max(-1, Math.min(1, vecDot(v1, v2)));
    anglesDeg.push((Math.acos(cosAngle) * 180) / Math.PI);
  }

  return {
    points: sorted,
    area,
    perimeter,
    anglesDeg,
  };
}

/**
 * Shortest distance from point p to line defined by points a and b.
 */
export function pointLineDistance(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = vecSub(b, a);
  const ap = vecSub(p, a);
  const lenAB = vecLength(ab);
  if (lenAB < 1e-9) return vecLength(ap);
  const cross = vecCross(ap, ab);
  return vecLength(cross) / lenAB;
}

/**
 * Shortest distance between two lines: L1 = p1 + t*d1, L2 = p2 + s*d2.
 */
export function lineLineDistance(p1: Vec3, d1: Vec3, p2: Vec3, d2: Vec3): number {
  const cross = vecCross(d1, d2);
  const lenCross = vecLength(cross);
  const dp = vecSub(p2, p1);

  if (lenCross < 1e-9) {
    // Parallel lines -> distance from p1 to line L2
    const dir2Norm = vecNormalize(d2);
    const proj = vecScale(dir2Norm, vecDot(dp, dir2Norm));
    return vecLength(vecSub(dp, proj));
  }

  // Skew lines
  return Math.abs(vecDot(dp, cross)) / lenCross;
}

/**
 * Dihedral angle between two planes with normal vectors n1 and n2 (in degrees).
 */
export function dihedralAngleDeg(n1: Vec3, n2: Vec3): number {
  const norm1 = vecNormalize(n1);
  const norm2 = vecNormalize(n2);
  const dot = Math.max(-1, Math.min(1, vecDot(norm1, norm2)));
  return (Math.acos(dot) * 180) / Math.PI;
}
