/**
 * Multi-Stroke 3D Sketch Recognizer (@ai-classroom/sketch-core)
 *
 * 4-stage deterministic pipeline:
 * 1. Spatial-Temporal Stroke Clustering (Δt <= 2.5s & expanded bbox overlap / snap radius)
 * 2. RDP Polyline Simplification & Vertex Clustering -> Junction Graph (L, Y, Arrow, T)
 * 3. Rule-Based 3D Solid Topology Classifier (Cube, Cuboid, Prism, Pyramid, Cylinder, Cone, Sphere, Concave Custom Prism)
 * 4. $P Point-Cloud Multi-Stroke Fallback
 */
import type { Pt } from './types.js';
import { computeBBox } from './geometry.js';
import { recognizeDollarP, type SolidSketchKind } from './dollarP.js';

export interface TimedStroke {
  id: string;
  points: Pt[];
  timestamp: number;
}

export type JunctionKind = 'L' | 'Y' | 'Arrow' | 'T' | 'End' | 'Complex';

export interface GraphVertex {
  id: number;
  x: number;
  y: number;
  degree: number;
  junction: JunctionKind;
}

export interface GraphEdge {
  u: number;
  v: number;
  dx: number;
  dy: number;
  length: number;
  angleDeg: number; // 0..180
}

export interface MultiStroke3DResult {
  kind: SolidSketchKind;
  confidence: number;
  label: string;
  strokeIds: string[];
  bbox: { x: number; y: number; w: number; h: number };
  /** Extracted 3D parameters in cm-like normalized units */
  params: Record<string, number>;
  /** Optional 2D polygon profile (for custom_prism / concave shapes like crown) */
  profilePoints?: [number, number][];
  reason: string;
}

// ---------------------------------------------------------------------------
// Stage 1: Spatial-Temporal Clustering
// ---------------------------------------------------------------------------

export function clusterRecentStrokes(
  strokes: TimedStroke[],
  maxTimeGapMs = 2500,
): TimedStroke[] {
  if (strokes.length === 0) return [];
  const latest = strokes[strokes.length - 1];
  const cluster: TimedStroke[] = [latest];

  const getBounds = (list: TimedStroke[]) => {
    const allPts = list.flatMap((s) => s.points);
    return computeBBox(allPts);
  };

  // Walk backwards and include temporally + spatially connected strokes
  for (let i = strokes.length - 2; i >= 0; i--) {
    const cand = strokes[i];
    const newestInCluster = cluster[cluster.length - 1];
    if (newestInCluster.timestamp - cand.timestamp > maxTimeGapMs) break;

    const cb = getBounds(cluster);
    const sb = computeBBox(cand.points);
    const margin = Math.max(24, 0.18 * Math.max(cb.width, cb.height, sb.width, sb.height));

    const overlaps =
      sb.minX <= cb.maxX + margin &&
      sb.maxX >= cb.minX - margin &&
      sb.minY <= cb.maxY + margin &&
      sb.maxY >= cb.minY - margin;

    if (overlaps) {
      cluster.push(cand);
    }
  }

  return cluster.reverse();
}

// ---------------------------------------------------------------------------
// Stage 2: RDP Polyline Simplification + Primitive Classification + Junction Graph
// ---------------------------------------------------------------------------

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function rdpSimplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  let maxD = 0;
  let idx = 0;
  const end = pts.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpDist(pts[i], pts[0], pts[end]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > eps) {
    const left = rdpSimplify(pts.slice(0, idx + 1), eps);
    const right = rdpSimplify(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [pts[0], pts[end]];
}

interface StrokePrimitive {
  strokeId: string;
  kind: 'line' | 'polygon' | 'ellipse' | 'arc' | 'polyline';
  bbox: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; cx: number; cy: number };
  vertices: Pt[];
  closed: boolean;
  isConcave: boolean;
}

function isPolygonConcave(pts: Pt[]): boolean {
  const n = pts.length;
  if (n < 4) return false;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const c = pts[(i + 2) % n];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) > 1e-3) {
      const s = Math.sign(cross);
      if (sign === 0) sign = s;
      else if (s !== sign) return true;
    }
  }
  return false;
}

function classifySingleStroke(s: TimedStroke): StrokePrimitive {
  const bb = computeBBox(s.points);
  const diag = Math.hypot(bb.width, bb.height);
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const endGap = Math.hypot(last.x - first.x, last.y - first.y);
  const closed = s.points.length >= 6 && endGap < Math.max(22, diag * 0.28);

  const simp = rdpSimplify(s.points, Math.max(4, diag * 0.045));
  const verts = closed && simp.length > 2 && Math.hypot(simp[0].x - simp[simp.length - 1].x, simp[0].y - simp[simp.length - 1].y) < Math.max(18, diag * 0.2)
    ? simp.slice(0, -1)
    : simp;

  const bbox = {
    minX: bb.minX,
    minY: bb.minY,
    maxX: bb.maxX,
    maxY: bb.maxY,
    width: bb.width,
    height: bb.height,
    cx: bb.centerX,
    cy: bb.centerY,
  };

  if (!closed && verts.length === 2 && diag > 12) {
    return { strokeId: s.id, kind: 'line', bbox, vertices: verts, closed: false, isConcave: false };
  }

  // Check circularity / ellipse fit for closed curves
  if (closed && s.points.length >= 10) {
    const rx = Math.max(bb.width / 2, 1);
    const ry = Math.max(bb.height / 2, 1);
    let errSum = 0;
    for (const p of s.points) {
      const nx = (p.x - bb.centerX) / rx;
      const ny = (p.y - bb.centerY) / ry;
      errSum += Math.abs(Math.hypot(nx, ny) - 1);
    }
    const meanErr = errSum / s.points.length;
    if (meanErr < 0.16 && verts.length >= 5) {
      return { strokeId: s.id, kind: 'ellipse', bbox, vertices: verts, closed: true, isConcave: false };
    }
  }

  if (closed && verts.length >= 3) {
    return {
      strokeId: s.id,
      kind: 'polygon',
      bbox,
      vertices: verts,
      closed: true,
      isConcave: isPolygonConcave(verts),
    };
  }

  // Open curved arc check (e.g., bottom arc of a cylinder/cone)
  if (!closed && verts.length >= 3 && s.points.length >= 8) {
    const chord = Math.hypot(last.x - first.x, last.y - first.y);
    let maxDev = 0;
    for (const p of s.points) {
      maxDev = Math.max(maxDev, perpDist(p, first, last));
    }
    if (chord > 20 && maxDev / chord > 0.1 && maxDev / chord < 0.65 && Math.abs(last.y - first.y) < chord * 0.35) {
      return { strokeId: s.id, kind: 'arc', bbox, vertices: verts, closed: false, isConcave: false };
    }
  }

  return { strokeId: s.id, kind: 'polyline', bbox, vertices: verts, closed, isConcave: false };
}

function buildJunctionGraph(
  primitives: StrokePrimitive[],
  snapRadius: number,
): { vertices: GraphVertex[]; edges: GraphEdge[] } {
  const clusters: { x: number; y: number; count: number }[] = [];

  const findOrAdd = (p: Pt): number => {
    for (let i = 0; i < clusters.length; i++) {
      if (Math.hypot(clusters[i].x - p.x, clusters[i].y - p.y) <= snapRadius) {
        const c = clusters[i];
        c.x = (c.x * c.count + p.x) / (c.count + 1);
        c.y = (c.y * c.count + p.y) / (c.count + 1);
        c.count++;
        return i;
      }
    }
    clusters.push({ x: p.x, y: p.y, count: 1 });
    return clusters.length - 1;
  };

  const edgeSet = new Set<string>();
  const rawEdges: [number, number][] = [];

  for (const prim of primitives) {
    if (prim.kind === 'ellipse' || prim.kind === 'arc') continue;
    const pts = prim.vertices;
    const count = prim.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      const u = findOrAdd(pts[i]);
      const v = findOrAdd(pts[(i + 1) % pts.length]);
      if (u === v) continue;
      const lo = Math.min(u, v);
      const hi = Math.max(u, v);
      const key = `${lo}:${hi}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        rawEdges.push([lo, hi]);
      }
    }
  }

  const adj: number[][] = Array.from({ length: clusters.length }, () => []);
  const edges: GraphEdge[] = rawEdges.map(([u, v]) => {
    adj[u].push(v);
    adj[v].push(u);
    const dx = clusters[v].x - clusters[u].x;
    const dy = clusters[v].y - clusters[u].y;
    const length = Math.hypot(dx, dy);
    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 180;
    return { u, v, dx, dy, length, angleDeg };
  });

  const vertices: GraphVertex[] = clusters.map((c, id) => {
    const nbrs = adj[id];
    const degree = nbrs.length;
    let junction: JunctionKind = 'End';
    if (degree === 2) {
      junction = 'L';
    } else if (degree === 3) {
      // Compute cyclic angles around vertex to distinguish Y vs Arrow vs T
      const angles = nbrs
        .map((nId) => Math.atan2(clusters[nId].y - c.y, clusters[nId].x - c.x))
        .sort((a, b) => a - b);
      const gaps = [
        angles[1] - angles[0],
        angles[2] - angles[1],
        angles[0] + Math.PI * 2 - angles[2],
      ];
      const maxGap = Math.max(...gaps);
      const hasStraight = gaps.some((g) => Math.abs(g - Math.PI) < 0.22);
      if (hasStraight) junction = 'T';
      else if (maxGap < Math.PI - 0.08) junction = 'Y';
      else junction = 'Arrow';
    } else if (degree > 3) {
      junction = 'Complex';
    }
    return { id, x: c.x, y: c.y, degree, junction };
  });

  return { vertices, edges };
}

// ---------------------------------------------------------------------------
// Stage 3: Rule-Based 3D Solid Topology Classifier
// ---------------------------------------------------------------------------

function angleDiff180(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return d > 90 ? 180 - d : d;
}

export function recognizeMultiStroke3D(
  strokes: TimedStroke[],
): MultiStroke3DResult | null {
  if (strokes.length === 0) return null;

  const allPts = strokes.flatMap((s) => s.points);
  if (allPts.length < 6) return null;
  const overallBB = computeBBox(allPts);
  const diag = Math.hypot(overallBB.width, overallBB.height);
  if (diag < 35) return null;

  const bbox = {
    x: overallBB.minX,
    y: overallBB.minY,
    w: overallBB.width,
    h: overallBB.height,
  };
  const strokeIds = strokes.map((s) => s.id);
  const primitives = strokes.map(classifySingleStroke);
  const snapRadius = Math.max(12, diag * 0.09);

  // ── Case 1: Single closed concave polygon (e.g. crown, L-shape, star) -> Custom 3D Prism ──
  if (strokes.length === 1 && primitives[0].kind === 'polygon' && primitives[0].isConcave) {
    const verts = primitives[0].vertices;
    const scaleCm = 4 / Math.max(bbox.w, bbox.h, 1);
    const cx = bbox.x + bbox.w / 2;
    const cy = bbox.y + bbox.h / 2;
    const profilePoints: [number, number][] = verts.map((p) => [
      parseFloat(((p.x - cx) * scaleCm).toFixed(3)),
      parseFloat((-(p.y - cy) * scaleCm).toFixed(3)),
    ]);
    return {
      kind: 'custom_prism',
      confidence: 0.9,
      label: 'Prisma Poligon Kustom 3D',
      strokeIds,
      bbox,
      params: { height: 3.5 },
      profilePoints,
      reason: 'concave-polygon-profile',
    };
  }

  // Multi-stroke 3D solids require at least 2 strokes
  if (strokes.length < 2) return null;

  const ellipses = primitives.filter((p) => p.kind === 'ellipse');
  const arcs = primitives.filter((p) => p.kind === 'arc');
  const lines = primitives.filter((p) => p.kind === 'line');
  const polygons = primitives.filter((p) => p.kind === 'polygon');

  // ── Case 2: Sphere (outer circle + inner equator ellipse) ──
  if (ellipses.length >= 2) {
    const sorted = [...ellipses].sort((a, b) => b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height);
    const outer = sorted[0];
    const inner = sorted[1];
    const outerAspect = outer.bbox.width / Math.max(outer.bbox.height, 1);
    const innerFlat = inner.bbox.height / Math.max(inner.bbox.width, 1);
    const centerDist = Math.hypot(outer.bbox.cx - inner.bbox.cx, outer.bbox.cy - inner.bbox.cy);
    if (
      outerAspect >= 0.78 &&
      outerAspect <= 1.28 &&
      innerFlat < 0.65 &&
      centerDist < Math.max(outer.bbox.width, outer.bbox.height) * 0.25 &&
      Math.abs(inner.bbox.width - outer.bbox.width) / outer.bbox.width < 0.3
    ) {
      return {
        kind: 'sphere',
        confidence: 0.92,
        label: 'Bola 3D',
        strokeIds,
        bbox,
        params: { r: 3 },
        reason: 'circle-plus-equator-ellipse',
      };
    }
  }

  // ── Case 3: Cylinder (2 parallel ellipses OR 1 ellipse + 1 arc + 2 side lines) ──
  if (ellipses.length >= 1 && (ellipses.length >= 2 || arcs.length >= 1) && lines.length >= 2) {
    const topOrBot = ellipses[0];
    const otherCap = ellipses.length >= 2 ? ellipses[1] : arcs[0];
    const widthRatio = Math.abs(topOrBot.bbox.width - otherCap.bbox.width) / Math.max(topOrBot.bbox.width, 1);
    const verticalSep = Math.abs(topOrBot.bbox.cy - otherCap.bbox.cy);
    if (widthRatio < 0.35 && verticalSep > topOrBot.bbox.height * 0.6) {
      const r = parseFloat(Math.max(1.5, Math.min(4, (topOrBot.bbox.width / Math.max(bbox.h, 1)) * 2.5)).toFixed(1));
      const h = parseFloat(Math.max(2.5, Math.min(6, (verticalSep / Math.max(topOrBot.bbox.width, 1)) * r * 2)).toFixed(1));
      return {
        kind: 'cylinder',
        confidence: 0.9,
        label: 'Tabung 3D',
        strokeIds,
        bbox,
        params: { r, h },
        reason: 'two-caps-with-side-lines',
      };
    }
  }

  // ── Case 4: Cone (1 ellipse/arc + 2 converging lines meeting at apex) ──
  if ((ellipses.length === 1 || arcs.length === 1) && lines.length >= 2) {
    const base = ellipses[0] ?? arcs[0];
    const l1 = lines[0].vertices;
    const l2 = lines[1].vertices;
    const endpoints1 = [l1[0], l1[l1.length - 1]];
    const endpoints2 = [l2[0], l2[l2.length - 1]];
    let minApexDist = Infinity;
    for (const a of endpoints1) {
      for (const b of endpoints2) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < minApexDist) minApexDist = d;
      }
    }
    if (minApexDist <= snapRadius * 1.4) {
      return {
        kind: 'cone',
        confidence: 0.89,
        label: 'Kerucut 3D',
        strokeIds,
        bbox,
        params: { r: 2.5, h: 5 },
        reason: 'ellipse-base-with-converging-apex',
      };
    }
  }

  // ── Stage 2b: Junction Graph for Polyhedral Solids (Cube, Cuboid, Prism, Pyramid) ──
  const graph = buildJunctionGraph(primitives, snapRadius);
  const { vertices, edges } = graph;

  const yCount = vertices.filter((v) => v.junction === 'Y').length;
  const arrowCount = vertices.filter((v) => v.junction === 'Arrow').length;
  const lCount = vertices.filter((v) => v.junction === 'L').length;

  // Group edges by orientation: horizontal (~0/180), vertical (~90), oblique (15..75 or 105..165)
  const horizEdges = edges.filter((e) => angleDiff180(e.angleDeg, 0) <= 18);
  const vertEdges = edges.filter((e) => angleDiff180(e.angleDeg, 90) <= 18);
  const obliqueEdges = edges.filter(
    (e) => angleDiff180(e.angleDeg, 0) > 18 && angleDiff180(e.angleDeg, 90) > 18,
  );

  // Check if oblique edges share a dominant parallel direction (within ±18 deg)
  let parallelObliqueCount = 0;
  let avgObliqueLen = 0;
  if (obliqueEdges.length >= 2) {
    for (const ref of obliqueEdges) {
      const group = obliqueEdges.filter((e) => angleDiff180(e.angleDeg, ref.angleDeg) <= 18);
      if (group.length > parallelObliqueCount) {
        parallelObliqueCount = group.length;
        avgObliqueLen = group.reduce((s, e) => s + e.length, 0) / group.length;
      }
    }
  }

  // ── Case 5: Cube / Cuboid (visible-only 7V/9E OR transparent wireframe 8V/12E) ──
  if (
    vertices.length >= 6 &&
    vertices.length <= 10 &&
    edges.length >= 8 &&
    edges.length <= 14 &&
    horizEdges.length >= 2 &&
    vertEdges.length >= 2 &&
    parallelObliqueCount >= 2 &&
    (yCount >= 1 || arrowCount >= 2 || (lCount >= 2 && polygons.some((p) => p.vertices.length === 4)))
  ) {
    const avgW = horizEdges.reduce((s, e) => s + e.length, 0) / horizEdges.length;
    const avgH = vertEdges.reduce((s, e) => s + e.length, 0) / vertEdges.length;
    // Cavalier / cabinet oblique projection depth compensation
    const estD = avgObliqueLen / 0.55;
    const maxDim = Math.max(avgW, avgH, estD, 1);
    const minDim = Math.min(avgW, avgH, estD);
    const ratio = maxDim / Math.max(minDim, 1);

    if (ratio <= 1.32) {
      return {
        kind: 'cube',
        confidence: 0.93,
        label: 'Kubus 3D',
        strokeIds,
        bbox,
        params: { s: 4 },
        reason: `junction-graph-cube(V=${vertices.length},E=${edges.length},Y=${yCount},Arrow=${arrowCount})`,
      };
    }
    const normFactor = 5 / maxDim;
    return {
      kind: 'cuboid',
      confidence: 0.91,
      label: 'Balok 3D',
      strokeIds,
      bbox,
      params: {
        l: parseFloat(Math.max(2, avgW * normFactor).toFixed(1)),
        h: parseFloat(Math.max(2, avgH * normFactor).toFixed(1)),
        w: parseFloat(Math.max(2, estD * normFactor).toFixed(1)),
      },
      reason: `junction-graph-cuboid(V=${vertices.length},E=${edges.length})`,
    };
  }

  // ── Case 6: Triangular Prism (triangle + parallel oblique edges) ──
  const triangles = polygons.filter((p) => p.vertices.length === 3);
  if (triangles.length >= 1 && parallelObliqueCount >= 2) {
    return {
      kind: 'prism',
      confidence: 0.88,
      label: 'Prisma Segitiga 3D',
      strokeIds,
      bbox,
      params: { a: 4, b: 4, c: 4, h: 5 },
      reason: 'triangle-plus-parallel-oblique-edges',
    };
  }

  // ── Case 7: Pyramid (apex vertex with degree >= 3 converging to lower vertices) ──
  const apexCandidates = vertices.filter((v) => v.degree >= 3 && v.y <= bbox.y + bbox.h * 0.35);
  if (
    apexCandidates.length >= 1 &&
    vertices.length >= 4 &&
    vertices.length <= 7 &&
    edges.length >= 6 &&
    edges.length <= 10 &&
    vertEdges.length <= 1
  ) {
    return {
      kind: 'pyramid',
      confidence: 0.86,
      label: 'Limas 3D',
      strokeIds,
      bbox,
      params: { b: 4, h: 5 },
      reason: `junction-graph-pyramid(V=${vertices.length},E=${edges.length})`,
    };
  }

  // ── Stage 4: $P Multi-Stroke Point-Cloud Fallback ──
  if (strokes.length >= 3) {
    const dp = recognizeDollarP(strokes.map((s) => s.points));
    if (dp && dp.score >= 0.62) {
      const labelMap: Record<SolidSketchKind, string> = {
        cube: 'Kubus 3D',
        cuboid: 'Balok 3D',
        cylinder: 'Tabung 3D',
        cone: 'Kerucut 3D',
        pyramid: 'Limas 3D',
        prism: 'Prisma Segitiga 3D',
        sphere: 'Bola 3D',
        custom_prism: 'Prisma Kustom 3D',
      };
      const defaultParams: Record<SolidSketchKind, Record<string, number>> = {
        cube: { s: 4 },
        cuboid: { l: 5, w: 3, h: 3 },
        cylinder: { r: 2, h: 5 },
        cone: { r: 2.5, h: 5 },
        pyramid: { b: 4, h: 5 },
        prism: { a: 4, b: 4, c: 4, h: 5 },
        sphere: { r: 3 },
        custom_prism: { height: 3.5 },
      };
      return {
        kind: dp.name,
        confidence: parseFloat(dp.score.toFixed(2)),
        label: labelMap[dp.name],
        strokeIds,
        bbox,
        params: defaultParams[dp.name],
        reason: `dollarP-fallback(d=${dp.distance.toFixed(2)})`,
      };
    }
  }

  return null;
}
