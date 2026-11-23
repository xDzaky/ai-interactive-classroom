/**
 * @ai-classroom/geometry-core — Profile2D
 * Normalizes any 2D shape (rect, triangle, trapezoid, ellipse, n-gon, star, customPoints)
 * into a clean Counter-Clockwise (CCW) 2D profile with exact area, perimeter, and centroid.
 */

export type Pt2 = [number, number];

export interface Profile2D {
  points: Pt2[];
  area: number;
  perimeter: number;
  centroid: Pt2;
  bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

/** Signed shoelace area (> 0 means CCW in standard math XY coords) */
export function computeSignedArea(points: Pt2[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    sum += x1 * y2 - x2 * y1;
  }
  return sum * 0.5;
}

/**
 * Normalizes flat `[x0, y0, x1, y1, ...]` or `Pt2[]` into a CCW centered `Profile2D`,
 * removing consecutive duplicates.
 */
export function normalizeProfile2D(input: number[] | Pt2[], centerAtOrigin = true): Profile2D {
  const raw: Pt2[] = [];
  if (input.length > 0 && typeof input[0] === 'number') {
    const flat = input as number[];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      raw.push([flat[i], flat[i + 1]]);
    }
  } else {
    for (const p of input as Pt2[]) {
      raw.push([p[0], p[1]]);
    }
  }

  // Filter consecutive near-duplicate vertices
  const dedup: Pt2[] = [];
  for (const p of raw) {
    const prev = dedup[dedup.length - 1];
    if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 1e-5) {
      dedup.push(p);
    }
  }
  if (dedup.length > 2) {
    const first = dedup[0];
    const last = dedup[dedup.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-5) {
      dedup.pop();
    }
  }

  // Ensure CCW winding
  let pts = dedup;
  let signedArea = computeSignedArea(pts);
  if (signedArea < 0) {
    pts = [...pts].reverse();
    signedArea = -signedArea;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    sumX += x;
    sumY += y;
  }
  const n = Math.max(1, pts.length);
  const cx = sumX / n;
  const cy = sumY / n;

  if (centerAtOrigin && pts.length > 0) {
    pts = pts.map(([x, y]) => [x - cx, y - cy]);
    minX -= cx;
    maxX -= cx;
    minY -= cy;
    maxY -= cy;
  }

  let perimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    perimeter += Math.hypot(x2 - x1, y2 - y1);
  }

  return {
    points: pts,
    area: Math.abs(signedArea),
    perimeter,
    centroid: centerAtOrigin ? [0, 0] : [cx, cy],
    bbox: {
      minX: Number.isFinite(minX) ? minX : 0,
      minY: Number.isFinite(minY) ? minY : 0,
      maxX: Number.isFinite(maxX) ? maxX : 0,
      maxY: Number.isFinite(maxY) ? maxY : 0,
      width: Number.isFinite(maxX - minX) ? maxX - minX : 0,
      height: Number.isFinite(maxY - minY) ? maxY - minY : 0,
    },
  };
}

export function createRegularPolygonProfile(sides: number, radius: number): Profile2D {
  const n = Math.max(3, Math.round(sides));
  const pts: Pt2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i * 2 * Math.PI) / n;
    pts.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  return normalizeProfile2D(pts, true);
}

export function createEllipseProfile(rx: number, ry: number, segments = 32): Profile2D {
  const pts: Pt2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i * 2 * Math.PI) / segments;
    pts.push([rx * Math.cos(a), ry * Math.sin(a)]);
  }
  return normalizeProfile2D(pts, true);
}
