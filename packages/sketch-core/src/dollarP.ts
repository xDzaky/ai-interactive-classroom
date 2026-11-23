/**
 * $P Point-Cloud Multi-Stroke Recognizer (Vatavu, Anthony & Wobbrock, 2012)
 * Lightweight, zero-dependency, order- and direction-invariant fallback recognizer
 * for hand-drawn 3D solid sketches (cube, cuboid, cylinder, cone, pyramid, prism, sphere).
 */
import type { Pt } from './types.js';

export type SolidSketchKind =
  | 'cube'
  | 'cuboid'
  | 'cylinder'
  | 'cone'
  | 'pyramid'
  | 'prism'
  | 'sphere'
  | 'custom_prism';

interface CloudPoint {
  x: number;
  y: number;
  strokeId: number;
}

interface CloudTemplate {
  name: SolidSketchKind;
  points: CloudPoint[];
}

const NUM_POINTS = 32;

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(pts: CloudPoint[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].strokeId === pts[i - 1].strokeId) {
      d += dist(pts[i - 1], pts[i]);
    }
  }
  return d;
}

function resample(points: CloudPoint[], n: number): CloudPoint[] {
  const I = pathLength(points) / (n - 1);
  if (I <= 1e-6) {
    return Array.from({ length: n }, () => ({ ...points[0] }));
  }
  let D = 0;
  const src = points.map((p) => ({ ...p }));
  const dst: CloudPoint[] = [{ ...src[0] }];

  for (let i = 1; i < src.length; i++) {
    if (src[i].strokeId === src[i - 1].strokeId) {
      const d = dist(src[i - 1], src[i]);
      if (D + d >= I) {
        const qx = src[i - 1].x + ((I - D) / d) * (src[i].x - src[i - 1].x);
        const qy = src[i - 1].y + ((I - D) / d) * (src[i].y - src[i - 1].y);
        const q: CloudPoint = { x: qx, y: qy, strokeId: src[i].strokeId };
        dst.push(q);
        src.splice(i, 0, q);
        D = 0;
      } else {
        D += d;
      }
    }
  }
  while (dst.length < n) {
    dst.push({ ...src[src.length - 1] });
  }
  return dst.slice(0, n);
}

function normalizeCloud(raw: CloudPoint[]): CloudPoint[] {
  const pts = resample(raw, NUM_POINTS);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const size = Math.max(maxX - minX, maxY - minY, 1e-5);
  const scaled = pts.map((p) => ({
    x: (p.x - minX) / size,
    y: (p.y - minY) / size,
    strokeId: p.strokeId,
  }));

  let cx = 0;
  let cy = 0;
  for (const p of scaled) {
    cx += p.x;
    cy += p.y;
  }
  cx /= scaled.length;
  cy /= scaled.length;

  return scaled.map((p) => ({ x: p.x - cx, y: p.y - cy, strokeId: p.strokeId }));
}

function cloudDistance(pts1: CloudPoint[], pts2: CloudPoint[], start: number): number {
  const n = pts1.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0;
  let i = start;
  do {
    let minD = Infinity;
    let index = -1;
    for (let j = 0; j < n; j++) {
      if (!matched[j]) {
        const d = dist(pts1[i], pts2[j]);
        if (d < minD) {
          minD = d;
          index = j;
        }
      }
    }
    if (index >= 0) matched[index] = true;
    const weight = 1 - ((i - start + n) % n) / n;
    sum += weight * minD;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyCloudMatch(pts1: CloudPoint[], pts2: CloudPoint[]): number {
  const e = 0.5;
  const step = Math.max(1, Math.floor(Math.pow(pts1.length, 1 - e)));
  let minD = Infinity;
  for (let i = 0; i < pts1.length; i += step) {
    const d1 = cloudDistance(pts1, pts2, i);
    const d2 = cloudDistance(pts2, pts1, i);
    minD = Math.min(minD, d1, d2);
  }
  return minD;
}

function strokesToCloud(strokes: Pt[][]): CloudPoint[] {
  const out: CloudPoint[] = [];
  strokes.forEach((s, sid) => {
    for (const p of s) {
      out.push({ x: p.x, y: p.y, strokeId: sid });
    }
  });
  return out;
}

function makeEllipseStroke(cx: number, cy: number, rx: number, ry: number, steps = 16): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return pts;
}

function buildTemplates(): CloudTemplate[] {
  const raw: { name: SolidSketchKind; strokes: Pt[][] }[] = [
    // Cube (visible-only 9 edges)
    {
      name: 'cube',
      strokes: [
        [{ x: 0, y: 30 }, { x: 70, y: 30 }, { x: 70, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 30 }],
        [{ x: 0, y: 30 }, { x: 30, y: 0 }, { x: 100, y: 0 }, { x: 70, y: 30 }],
        [{ x: 100, y: 0 }, { x: 100, y: 70 }, { x: 70, y: 100 }],
      ],
    },
    // Cylinder (top ellipse + 2 sides + bottom arc)
    {
      name: 'cylinder',
      strokes: [
        makeEllipseStroke(50, 18, 40, 14),
        [{ x: 10, y: 18 }, { x: 10, y: 92 }],
        [{ x: 90, y: 18 }, { x: 90, y: 92 }],
        makeEllipseStroke(50, 92, 40, 14),
      ],
    },
    // Cone (apex + 2 sides + bottom ellipse)
    {
      name: 'cone',
      strokes: [
        [{ x: 50, y: 0 }, { x: 10, y: 85 }],
        [{ x: 50, y: 0 }, { x: 90, y: 85 }],
        makeEllipseStroke(50, 85, 40, 14),
      ],
    },
    // Pyramid (base + apex converging edges)
    {
      name: 'pyramid',
      strokes: [
        [{ x: 10, y: 90 }, { x: 75, y: 90 }, { x: 95, y: 65 }, { x: 30, y: 65 }, { x: 10, y: 90 }],
        [{ x: 50, y: 5 }, { x: 10, y: 90 }],
        [{ x: 50, y: 5 }, { x: 75, y: 90 }],
        [{ x: 50, y: 5 }, { x: 95, y: 65 }],
      ],
    },
    // Sphere (outer circle + equator ellipse)
    {
      name: 'sphere',
      strokes: [
        makeEllipseStroke(50, 50, 48, 48, 24),
        makeEllipseStroke(50, 50, 48, 16, 16),
      ],
    },
  ];

  return raw.map((t) => ({
    name: t.name,
    points: normalizeCloud(strokesToCloud(t.strokes)),
  }));
}

const TEMPLATES = buildTemplates();

export interface DollarPResult {
  name: SolidSketchKind;
  score: number; // 0..1 higher is better
  distance: number;
}

export function recognizeDollarP(strokes: Pt[][]): DollarPResult | null {
  const cloud = strokesToCloud(strokes);
  if (cloud.length < 6) return null;
  const candidate = normalizeCloud(cloud);

  let bestName: SolidSketchKind = 'cube';
  let bestDist = Infinity;

  for (const tpl of TEMPLATES) {
    const d = greedyCloudMatch(candidate, tpl.points);
    if (d < bestDist) {
      bestDist = d;
      bestName = tpl.name;
    }
  }

  // Empirical calibration: distance ~ 1.8 is very close, > 4.2 is unrelated
  const score = Math.max(0, Math.min(1, 1 - (bestDist - 1.2) / 3.5));
  if (score < 0.45) return null;
  return { name: bestName, score, distance: bestDist };
}
