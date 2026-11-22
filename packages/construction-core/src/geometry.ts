/**
 * @ai-classroom/construction-core — geometry.ts
 * Clean-room 2D analytical geometry algorithms.
 */

import type {
  Point2D,
  ComputedPoint,
  ComputedLine,
  ComputedCircle,
  ComputedPolygon,
  ComputedAngle,
} from "./types.js";

const EPSILON = 1e-9;

export function distance(p1: Point2D, p2: Point2D): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

export function computeMidpoint(p1: Point2D, p2: Point2D): ComputedPoint {
  return {
    kind: 'point',
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function computeLine(p1: Point2D, p2: Point2D): ComputedLine | undefined {
  const d = distance(p1, p2);
  if (d < EPSILON) return undefined;

  let a = p1.y - p2.y;
  let b = p2.x - p1.x;
  let c = p1.x * p2.y - p2.x * p1.y;

  const norm = Math.hypot(a, b);
  a /= norm;
  b /= norm;
  c /= norm;

  return { kind: 'line', p1, p2, a, b, c, length: d };
}

export function computePerpendicularLine(
  point: Point2D,
  line: ComputedLine
): ComputedLine {
  // Normal of ax + by + c = 0 is (a, b).
  // Perpendicular line has normal (-b, a).
  const a = -line.b;
  const b = line.a;
  const c = -(a * point.x + b * point.y);

  // Pick two distinct points on this perpendicular line
  const p1 = point;
  const p2: Point2D = {
    x: point.x - line.a,
    y: point.y - line.b,
  };

  return { kind: 'line', p1, p2, a, b, c };
}

export function computeParallelLine(
  point: Point2D,
  line: ComputedLine
): ComputedLine {
  const a = line.a;
  const b = line.b;
  const c = -(a * point.x + b * point.y);

  const p1 = point;
  const p2: Point2D = {
    x: point.x - line.b,
    y: point.y + line.a,
  };

  return { kind: 'line', p1, p2, a, b, c };
}

export function computeCircleCP(center: Point2D, perimeterPoint: Point2D): ComputedCircle | undefined {
  const r = distance(center, perimeterPoint);
  if (r < EPSILON) return undefined;
  return { kind: 'circle', center, radius: r };
}

export function computeCircle3P(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D
): ComputedCircle | undefined {
  // Check collinearity via cross product
  const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  if (Math.abs(cross) < EPSILON) return undefined;

  // Midpoints of segments p1-p2 and p2-p3
  const mid12 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const mid23 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

  // Slopes / normal directions
  const l1 = computeLine(p1, p2);
  const l2 = computeLine(p2, p3);
  if (!l1 || !l2) return undefined;

  const perp1 = computePerpendicularLine(mid12, l1);
  const perp2 = computePerpendicularLine(mid23, l2);

  const center = computeLineLineIntersection(perp1, perp2);
  if (!center) return undefined;

  const centerPoint = { x: center.x, y: center.y };
  const radius = distance(centerPoint, p1);

  return { kind: 'circle', center: centerPoint, radius };
}

export function computeLineLineIntersection(
  l1: ComputedLine,
  l2: ComputedLine
): ComputedPoint | undefined {
  const det = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(det) < EPSILON) return undefined; // Parallel or coincident

  const x = (l1.b * l2.c - l2.b * l1.c) / det;
  const y = (l2.a * l1.c - l1.a * l2.c) / det;

  return { kind: 'point', x, y };
}

export function computeLineCircleIntersection(
  line: ComputedLine,
  circle: ComputedCircle,
  index: 0 | 1
): ComputedPoint | undefined {
  // Line: ax + by + c = 0 (normalized)
  // Distance from circle center to line
  const d = line.a * circle.center.x + line.b * circle.center.y + line.c;
  if (Math.abs(d) > circle.radius + EPSILON) return undefined;

  const closestX = circle.center.x - line.a * d;
  const closestY = circle.center.y - line.b * d;

  const discr = Math.max(0, circle.radius * circle.radius - d * d);
  const h = Math.sqrt(discr);

  // Direction along line: (-b, a)
  const pt1: Point2D = { x: closestX - line.b * h, y: closestY + line.a * h };
  const pt2: Point2D = { x: closestX + line.b * h, y: closestY - line.a * h };

  // Sort deterministically (x first, then y)
  const pts = [pt1, pt2].sort((pA, pB) => pA.x !== pB.x ? pA.x - pB.x : pA.y - pB.y);

  const picked = pts[index];
  return { kind: 'point', x: picked.x, y: picked.y };
}

export function computeCircleCircleIntersection(
  c1: ComputedCircle,
  c2: ComputedCircle,
  index: 0 | 1
): ComputedPoint | undefined {
  const d = distance(c1.center, c2.center);
  if (d < EPSILON) return undefined; // Concentric
  if (d > c1.radius + c2.radius + EPSILON) return undefined; // Separate
  if (d < Math.abs(c1.radius - c2.radius) - EPSILON) return undefined; // Inside

  // Radical axis: 2(x2-x1)x + 2(y2-y1)y + (x1^2 - x2^2 + y1^2 - y2^2 + r2^2 - r1^2) = 0
  let a = 2 * (c2.center.x - c1.center.x);
  let b = 2 * (c2.center.y - c1.center.y);
  let c =
    c1.center.x * c1.center.x -
    c2.center.x * c2.center.x +
    c1.center.y * c1.center.y -
    c2.center.y * c2.center.y +
    c2.radius * c2.radius -
    c1.radius * c1.radius;

  const norm = Math.hypot(a, b);
  if (norm < EPSILON) return undefined;
  a /= norm;
  b /= norm;
  c /= norm;

  const radicalLine: ComputedLine = {
    kind: 'line',
    p1: { x: 0, y: 0 },
    p2: { x: 0, y: 0 },
    a,
    b,
    c,
  };

  return computeLineCircleIntersection(radicalLine, c1, index);
}

export function computePolygon(vertices: Point2D[]): ComputedPolygon | undefined {
  if (vertices.length < 3) return undefined;

  let perimeter = 0;
  let doubleArea = 0;

  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    perimeter += distance(curr, next);
    doubleArea += curr.x * next.y - next.x * curr.y;
  }

  const area = Math.abs(doubleArea) / 2;
  return { kind: 'polygon', vertices, area, perimeter };
}

export function computeAngle(
  p1: Point2D,
  vertex: Point2D,
  p2: Point2D
): ComputedAngle | undefined {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

  const len1 = Math.hypot(v1.x, v1.y);
  const len2 = Math.hypot(v2.x, v2.y);
  if (len1 < EPSILON || len2 < EPSILON) return undefined;

  const dot = v1.x * v2.x + v1.y * v2.y;
  const cosTheta = Math.max(-1, Math.min(1, dot / (len1 * len2)));
  const radians = Math.acos(cosTheta);
  const degrees = (radians * 180) / Math.PI;

  return { kind: 'angle', degrees, radians };
}
