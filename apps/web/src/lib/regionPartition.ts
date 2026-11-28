/**
 * regionPartition.ts — Planar Face Partition Engine for Merged 2D Objects (V9.2)
 *
 * Given `multiSegments: number[][]` (e.g. a circle divided by 1, 2, or 4 lines for 1/2, 2/4, 4/8
 * fractions, or a rectangle/rhombus split by diagonals), computes the exact bounded interior
 * polygon regions using segment intersection splitting + DCEL half-edge minimal face extraction.
 *
 * Pure geometry — zero DOM, zero Konva dependencies, WeakMap-cached for 60fps rendering.
 */

export interface PlanarRegion {
  index: number;
  points: number[]; // flat [x0, y0, x1, y1, ...]
  cx: number;
  cy: number;
  area: number;
}

interface Pt2 {
  x: number;
  y: number;
}

interface Seg2 {
  a: Pt2;
  b: Pt2;
}

const EPS_VERTEX = 1.5;
const SNAP_EXTEND_PX = 10;

function dist2(a: Pt2, b: Pt2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Computes intersection parameter t on segment AB and u on segment CD.
 * Returns null if parallel or outside [0, 1].
 */
function segmentIntersection(
  a: Pt2,
  b: Pt2,
  c: Pt2,
  d: Pt2,
  tol = 1e-4,
): { x: number; y: number; t: number; u: number } | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return null;

  const qpx = c.x - a.x;
  const qpy = c.y - a.y;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * ry - qpy * rx) / denom;
  if (t >= -tol && t <= 1 + tol && u >= -tol && u <= 1 + tol) {
    const ct = Math.max(0, Math.min(1, t));
    const cu = Math.max(0, Math.min(1, u));
    return { x: a.x + ct * rx, y: a.y + ct * ry, t: ct, u: cu };
  }
  return null;
}

function closestPointOnSegment(p: Pt2, a: Pt2, b: Pt2): { pt: Pt2; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) return { pt: a, dist: dist2(p, a) };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const pt = { x: a.x + t * dx, y: a.y + t * dy };
  return { pt, dist: dist2(p, pt) };
}

function signedArea(pts: Pt2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/**
 * Extracts all elementary segments from multiSegments, snapping slightly-short
 * open line endpoints onto nearby boundary edges so fraction dividers always close cleanly.
 */
function buildSnappedSegments(multiSegments: number[][]): Seg2[] {
  const rawPolylines: Pt2[][] = [];
  for (const flat of multiSegments) {
    if (!Array.isArray(flat) || flat.length < 4) continue;
    const pts: Pt2[] = [];
    for (let i = 0; i < flat.length - 1; i += 2) {
      const p = { x: flat[i], y: flat[i + 1] };
      if (pts.length === 0 || dist2(pts[pts.length - 1], p) > 0.5) {
        pts.push(p);
      }
    }
    if (pts.length >= 2) rawPolylines.push(pts);
  }

  // Collect all segments first so open endpoints can snap to other polylines
  const segsByPoly: Seg2[][] = rawPolylines.map((pts) => {
    const segs: Seg2[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      segs.push({ a: pts[i], b: pts[i + 1] });
    }
    return segs;
  });

  // Snap open endpoints of each polyline onto nearest segment of another polyline within SNAP_EXTEND_PX
  for (let pIdx = 0; pIdx < rawPolylines.length; pIdx++) {
    const pts = rawPolylines[pIdx];
    const isClosed = pts.length >= 3 && dist2(pts[0], pts[pts.length - 1]) < 4;
    if (isClosed) continue;

    for (const endIdx of [0, pts.length - 1]) {
      const ep = pts[endIdx];
      let bestDist = SNAP_EXTEND_PX;
      let bestPt: Pt2 | null = null;
      for (let oIdx = 0; oIdx < segsByPoly.length; oIdx++) {
        if (oIdx === pIdx) continue;
        for (const s of segsByPoly[oIdx]) {
          const hit = closestPointOnSegment(ep, s.a, s.b);
          if (hit.dist < bestDist) {
            bestDist = hit.dist;
            bestPt = hit.pt;
          }
        }
      }
      if (bestPt) {
        pts[endIdx] = bestPt;
      }
    }
  }

  const out: Seg2[] = [];
  for (const pts of rawPolylines) {
    for (let i = 0; i < pts.length - 1; i++) {
      if (dist2(pts[i], pts[i + 1]) > 0.5) {
        out.push({ a: pts[i], b: pts[i + 1] });
      }
    }
  }
  return out;
}

/**
 * Computes all bounded interior regions enclosed by `multiSegments`.
 */
export function computePlanarRegions(multiSegments: number[][]): PlanarRegion[] {
  const segs = buildSnappedSegments(multiSegments);
  if (segs.length < 3) return [];

  // 1. Find all split parameters t in [0, 1] for each segment
  const splits: number[][] = segs.map(() => [0, 1]);
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const hit = segmentIntersection(segs[i].a, segs[i].b, segs[j].a, segs[j].b);
      if (hit) {
        splits[i].push(hit.t);
        splits[j].push(hit.u);
      }
    }
  }

  // 2. Deduplicate vertices within EPS_VERTEX and create elementary undirected edges
  const vertices: Pt2[] = [];
  const getVertexId = (p: Pt2): number => {
    for (let i = 0; i < vertices.length; i++) {
      if (Math.abs(vertices[i].x - p.x) <= EPS_VERTEX && Math.abs(vertices[i].y - p.y) <= EPS_VERTEX) {
        return i;
      }
    }
    vertices.push({ x: p.x, y: p.y });
    return vertices.length - 1;
  };

  const edgeSet = new Set<string>();
  const adj = new Map<number, Set<number>>();
  const addEdge = (u: number, v: number) => {
    if (u === v) return;
    const key = u < v ? `${u}:${v}` : `${v}:${u}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    if (!adj.has(u)) adj.set(u, new Set());
    if (!adj.has(v)) adj.set(v, new Set());
    adj.get(u)!.add(v);
    adj.get(v)!.add(u);
  };

  for (let i = 0; i < segs.length; i++) {
    const ts = splits[i].sort((a, b) => a - b);
    const s = segs[i];
    let prevVid = getVertexId(s.a);
    for (let k = 1; k < ts.length; k++) {
      if (ts[k] - ts[k - 1] < 1e-4) continue;
      const p = {
        x: s.a.x + ts[k] * (s.b.x - s.a.x),
        y: s.a.y + ts[k] * (s.b.y - s.a.y),
      };
      const curVid = getVertexId(p);
      addEdge(prevVid, curVid);
      prevVid = curVid;
    }
  }

  // 3. Iteratively prune dangling degree-1 vertices (open tails)
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const [u, nbrs] of adj.entries()) {
      if (nbrs.size === 1) {
        const [v] = nbrs;
        adj.delete(u);
        adj.get(v)?.delete(u);
        pruned = true;
      }
    }
  }

  // 4. Sort outgoing half-edges at each vertex by angle (CCW in standard screen coords)
  const sortedAdj = new Map<number, number[]>();
  for (const [u, nbrs] of adj.entries()) {
    if (nbrs.size < 2) continue;
    const pu = vertices[u];
    const sorted = [...nbrs].sort((a, b) => {
      const angA = Math.atan2(vertices[a].y - pu.y, vertices[a].x - pu.x);
      const angB = Math.atan2(vertices[b].y - pu.y, vertices[b].x - pu.x);
      return angA - angB;
    });
    sortedAdj.set(u, sorted);
  }

  // 5. Walk DCEL half-edges to extract all minimal cycles (faces)
  const visited = new Set<string>();
  const rawFaces: Array<{ pts: Pt2[]; signedArea: number; absArea: number }> = [];

  for (const [u, nbrs] of sortedAdj.entries()) {
    for (const v of nbrs) {
      const startKey = `${u}->${v}`;
      if (visited.has(startKey)) continue;

      const cycle: Pt2[] = [];
      let curU = u;
      let curV = v;
      let guard = 0;
      let closed = false;

      while (guard++ < 400) {
        const key = `${curU}->${curV}`;
        if (visited.has(key)) {
          closed = curU === u && curV === v;
          break;
        }
        visited.add(key);
        cycle.push(vertices[curU]);

        const nextList = sortedAdj.get(curV);
        if (!nextList || nextList.length < 2) break;
        const backIdx = nextList.indexOf(curU);
        if (backIdx < 0) break;
        // Turn to previous neighbor in angle order -> traces minimal bounded face consistently
        const nextV = nextList[(backIdx - 1 + nextList.length) % nextList.length];
        curU = curV;
        curV = nextV;
      }

      if (closed && cycle.length >= 3) {
        const sa = signedArea(cycle);
        const aa = Math.abs(sa);
        if (aa >= 120) {
          rawFaces.push({ pts: cycle, signedArea: sa, absArea: aa });
        }
      }
    }
  }

  if (rawFaces.length === 0) return [];

  // 6. Filter out outer unbounded face(s) — bounded faces all have positive signed area
  //    (with our (backIdx - 1) turn convention in screen coordinates, bounded interior faces
  //    have signedArea > 0 while the outer face has signedArea < 0!).
  let bounded = rawFaces.filter((f) => f.signedArea > 0);
  if (bounded.length === 0) {
    // Fallback if orientation was flipped: keep all except the single largest face if >1 face
    const sortedByArea = [...rawFaces].sort((a, b) => a.absArea - b.absArea);
    bounded = sortedByArea.length > 1 ? sortedByArea.slice(0, -1) : sortedByArea;
  }

  // 7. Compute centroids & sort deterministically (top-to-bottom, left-to-right)
  const regions: PlanarRegion[] = bounded.map((f) => {
    let sx = 0;
    let sy = 0;
    for (const p of f.pts) {
      sx += p.x;
      sy += p.y;
    }
    const cx = sx / f.pts.length;
    const cy = sy / f.pts.length;
    return {
      index: 0,
      points: f.pts.flatMap((p) => [p.x, p.y]),
      cx,
      cy,
      area: f.absArea,
    };
  });

  regions.sort((a, b) => {
    const dy = Math.round(a.cy / 16) - Math.round(b.cy / 16);
    if (dy !== 0) return dy;
    return a.cx - b.cx;
  });

  return regions.map((r, idx) => ({ ...r, index: idx }));
}

// WeakMap cache so RenderObject runs at pure 60fps without recomputing regions every frame
const regionCache = new WeakMap<number[][], PlanarRegion[]>();

export function getCachedPlanarRegions(multiSegments: number[][]): PlanarRegion[] {
  let cached = regionCache.get(multiSegments);
  if (!cached) {
    cached = computePlanarRegions(multiSegments);
    regionCache.set(multiSegments, cached);
  }
  return cached;
}

/**
 * Ray-casting point-in-polygon check for flat [x0, y0, x1, y1, ...] points.
 */
export function isPointInPolygon(pt: { x: number; y: number }, flatPts: number[]): boolean {
  const n = Math.floor(flatPts.length / 2);
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = flatPts[i * 2];
    const yi = flatPts[i * 2 + 1];
    const xj = flatPts[j * 2];
    const yj = flatPts[j * 2 + 1];
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns the region index containing world point `pt`, or -1 if none.
 */
export function findRegionAtPoint(
  multiSegments: number[][],
  pt: { x: number; y: number },
): number {
  const regions = getCachedPlanarRegions(multiSegments);
  for (const r of regions) {
    if (isPointInPolygon(pt, r.points)) {
      return r.index;
    }
  }
  return -1;
}
