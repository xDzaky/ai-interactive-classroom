/**
 * composite.ts — 3D <-> 2D Round-Trip, 2D Boolean Union, & Compound 3D Assembly
 * (@ai-classroom/geometry-core V3)
 */
import type { SolidParams, SolidType } from './index.js';
import { computeGeometry } from './index.js';
import { normalizeProfile2D } from './profile2d.js';

export interface SolidSource2DShape {
  objectType: string;
  verticesCm: [number, number][];
  fill?: string;
  stroke?: string;
}

export interface SolidSource2D {
  shapes: SolidSource2DShape[];
  mergedProfileCm: [number, number][];
  extrudeMode: 'extrude' | 'taper' | 'revolve';
  depthCm: number;
  topScale?: number;
}

export interface CompoundSolidPart {
  id: string;
  label: string;
  solidType: SolidType;
  extendedKind?: string;
  params: SolidParams;
  profilePointsCm?: [number, number][];
  offsetCm: [number, number, number];
  rotationRad?: [number, number, number];
  colorHex?: number;
  texturePreset?: string;
}

export interface CompoundStats {
  totalVolume: number;
  totalSurfaceArea: number;
  partCount: number;
}

/**
 * Extracts a clean 2D base profile (in cm, centered at origin) from ANY 3D solid
 * so every 3D solid can round-trip back to 2D via "Edit 2D".
 */
export function extractBaseProfile2D(
  params: SolidParams,
  profilePointsCm?: [number, number][],
): { objectType: string; verticesCm: [number, number][]; depthCm: number } {
  if (profilePointsCm && profilePointsCm.length >= 3) {
    const depth =
      params.type === 'prism' || params.type === 'pyramid'
        ? params.h
        : params.type === 'cube'
          ? params.s
          : 4;
    return {
      objectType: 'polygon',
      verticesCm: profilePointsCm.map(([x, y]) => [x, y]),
      depthCm: depth,
    };
  }

  switch (params.type) {
    case 'cube': {
      const h = params.s / 2;
      return {
        objectType: 'rect',
        verticesCm: [
          [-h, -h],
          [h, -h],
          [h, h],
          [-h, h],
        ],
        depthCm: params.s,
      };
    }
    case 'cuboid': {
      const hw = params.l / 2;
      const hh = params.w / 2;
      return {
        objectType: 'rect',
        verticesCm: [
          [-hw, -hh],
          [hw, -hh],
          [hw, hh],
          [-hw, hh],
        ],
        depthCm: params.h,
      };
    }
    case 'pyramid': {
      const hb = params.b / 2;
      return {
        objectType: 'rect',
        verticesCm: [
          [-hb, -hb],
          [hb, -hb],
          [hb, hb],
          [-hb, hb],
        ],
        depthCm: params.h,
      };
    }
    case 'prism': {
      const r = params.a / Math.sqrt(3);
      return {
        objectType: 'triangle',
        verticesCm: [
          [0, -r],
          [params.a / 2, r / 2],
          [-params.a / 2, r / 2],
        ],
        depthCm: params.h,
      };
    }
    case 'cylinder':
    case 'cone':
    case 'sphere':
    case 'torus': {
      const r = params.type === 'torus' ? params.R : params.r;
      const pts: [number, number][] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pts.push([parseFloat((Math.cos(a) * r).toFixed(3)), parseFloat((Math.sin(a) * r).toFixed(3))]);
      }
      const depth = params.type === 'cylinder' || params.type === 'cone' ? params.h : r * 2;
      return { objectType: 'circle', verticesCm: pts, depthCm: depth };
    }
  }
}

// ---------------------------------------------------------------------------
// Pure-TS 2D Boolean Union for Touching / Overlapping Polygons (e.g. Square + Triangle -> House!)
// ---------------------------------------------------------------------------

function pointInPolygon(pt: [number, number], poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect =
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointOnSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
  eps = 1e-3,
): boolean {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]) <= eps;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  if (t < -eps || t > 1 + eps) return false;
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  return Math.hypot(p[0] - px, p[1] - py) <= eps;
}

function segmentIntersection(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): [number, number] | null {
  const rX = b[0] - a[0];
  const rY = b[1] - a[1];
  const sX = d[0] - c[0];
  const sY = d[1] - c[1];
  const denom = rX * sY - rY * sX;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sY - (c[1] - a[1]) * sX) / denom;
  const u = ((c[0] - a[0]) * rY - (c[1] - a[1]) * rX) / denom;
  if (t > 1e-4 && t < 1 - 1e-4 && u > 1e-4 && u < 1 - 1e-4) {
    return [a[0] + t * rX, a[1] + t * rY];
  }
  return null;
}

function isStrictlyInsideAny(pt: [number, number], polys: [number, number][][], skipIdx: number): boolean {
  for (let i = 0; i < polys.length; i++) {
    if (i === skipIdx) continue;
    const poly = polys[i];
    // On boundary does NOT count as strictly inside
    let onEdge = false;
    for (let e = 0; e < poly.length; e++) {
      if (pointOnSegment(pt, poly[e], poly[(e + 1) % poly.length], 1e-2)) {
        onEdge = true;
        break;
      }
    }
    if (!onEdge && pointInPolygon(pt, poly)) return true;
  }
  return false;
}

/**
 * Merges 2+ touching or overlapping 2D polygons into a single clean outer boundary polygon
 * (e.g. Square + Triangle touching at top edge -> 5-vertex House pentagon!).
 */
export function mergeProfiles2DUnion(rawPolys: [number, number][][]): [number, number][] {
  if (rawPolys.length === 0) return [];
  if (rawPolys.length === 1) return normalizeProfile2D(rawPolys[0], false).points;

  const polys = rawPolys.map((p) => normalizeProfile2D(p, false).points);

  // 1. Split every polygon edge at all intersection points & shared vertices of other polygons
  const boundarySegments: Array<[[number, number], [number, number]]> = [];

  for (let pi = 0; pi < polys.length; pi++) {
    const poly = polys[pi];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const splits: [number, number][] = [a, b];

      for (let pj = 0; pj < polys.length; pj++) {
        if (pi === pj) continue;
        const other = polys[pj];
        for (let j = 0; j < other.length; j++) {
          const c = other[j];
          const d = other[(j + 1) % other.length];
          if (pointOnSegment(c, a, b, 1e-2)) splits.push(c);
          const inter = segmentIntersection(a, b, c, d);
          if (inter) splits.push(inter);
        }
      }

      // Sort splits along a -> b
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      splits.sort((p1, p2) => (p1[0] - a[0]) * dx + (p1[1] - a[1]) * dy - ((p2[0] - a[0]) * dx + (p2[1] - a[1]) * dy));

      // Keep subsegments whose midpoint is NOT strictly inside another polygon
      // and NOT a shared opposite-direction interior seam!
      for (let s = 0; s < splits.length - 1; s++) {
        const p1 = splits[s];
        const p2 = splits[s + 1];
        if (Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) < 1e-2) continue;
        const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

        if (isStrictlyInsideAny(mid, polys, pi)) continue;

        // Check if this subsegment is an opposite-direction shared seam with another polygon
        let isSharedSeam = false;
        for (let pj = 0; pj < polys.length; pj++) {
          if (pi === pj) continue;
          const other = polys[pj];
          for (let j = 0; j < other.length; j++) {
            const c = other[j];
            const d = other[(j + 1) % other.length];
            if (pointOnSegment(mid, c, d, 1e-2)) {
              const dot = (p2[0] - p1[0]) * (d[0] - c[0]) + (p2[1] - p1[1]) * (d[1] - c[1]);
              if (dot < 0) {
                isSharedSeam = true;
                break;
              }
            }
          }
          if (isSharedSeam) break;
        }
        if (!isSharedSeam) {
          boundarySegments.push([p1, p2]);
        }
      }
    }
  }

  if (boundarySegments.length < 3) {
    return polys[0];
  }

  // 2. Chain directed boundary segments into the largest closed outer loop
  const used = new Array<boolean>(boundarySegments.length).fill(false);
  let bestLoop: [number, number][] = [];
  let bestArea = -1;

  for (let start = 0; start < boundarySegments.length; start++) {
    if (used[start]) continue;
    used[start] = true;
    const loop: [number, number][] = [boundarySegments[start][0], boundarySegments[start][1]];
    let guard = boundarySegments.length + 2;
    while (guard-- > 0) {
      const tail = loop[loop.length - 1];
      if (Math.hypot(tail[0] - loop[0][0], tail[1] - loop[0][1]) < 0.05 && loop.length >= 4) {
        loop.pop();
        break;
      }
      let nextIdx = -1;
      let minDist = 0.08;
      for (let j = 0; j < boundarySegments.length; j++) {
        if (used[j]) continue;
        const d = Math.hypot(boundarySegments[j][0][0] - tail[0], boundarySegments[j][0][1] - tail[1]);
        if (d < minDist) {
          minDist = d;
          nextIdx = j;
        }
      }
      if (nextIdx < 0) break;
      used[nextIdx] = true;
      loop.push(boundarySegments[nextIdx][1]);
    }
    if (loop.length >= 3) {
      const norm = normalizeProfile2D(loop, false);
      if (norm.area > bestArea) {
        bestArea = norm.area;
        bestLoop = norm.points;
      }
    }
  }

  // 3. Remove redundant collinear vertices along straight edges
  if (bestLoop.length >= 4) {
    const cleaned: [number, number][] = [];
    const n = bestLoop.length;
    for (let i = 0; i < n; i++) {
      const prev = bestLoop[(i - 1 + n) % n];
      const curr = bestLoop[i];
      const next = bestLoop[(i + 1) % n];
      const cross = Math.abs((curr[0] - prev[0]) * (next[1] - curr[1]) - (curr[1] - prev[1]) * (next[0] - curr[0]));
      if (cross > 1e-3) cleaned.push(curr);
    }
    if (cleaned.length >= 3) return cleaned;
  }

  return bestLoop.length >= 3 ? bestLoop : polys[0];
}

/**
 * Computes combined volume and surface area for a Compound 3D Assembly.
 */
export function computeCompoundStats(parts: CompoundSolidPart[]): CompoundStats {
  let totalVolume = 0;
  let totalSurfaceArea = 0;
  for (const part of parts) {
    try {
      const res = computeGeometry(part.params);
      totalVolume += res.volume;
      totalSurfaceArea += res.surface_area;
    } catch {
      // ignore invalid part
    }
  }
  return {
    totalVolume: parseFloat(totalVolume.toFixed(4)),
    totalSurfaceArea: parseFloat(totalSurfaceArea.toFixed(4)),
    partCount: parts.length,
  };
}
