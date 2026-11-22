/**
 * Polyhedron model — @ai-classroom/geometry-core (P11-T02)
 * Pure mathematical representation of 3D polyhedra with labeled vertices, CCW outward faces, and edges.
 * Uses math coordinate system with Z up: (x right, y depth, z up).
 */

export type Vec3 = [number, number, number];
export type PolyKind = 'cube' | 'cuboid' | 'prism' | 'pyramid';

export interface Polyhedron {
  kind: PolyKind;
  labels: string[];
  vertices: Vec3[];
  faces: number[][];
  edges: [number, number][];
}

/** Vector subtract: a - b */
export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Vector add: a + b */
export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/** Cross product: a x b */
export function vecCross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/** Dot product: a . b */
export function vecDot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Vector length */
export function vecLength(a: Vec3): number {
  return Math.sqrt(vecDot(a, a));
}

/** Compute centroid of vertices */
export function computeCentroid(vertices: Vec3[]): Vec3 {
  const n = vertices.length;
  if (n === 0) return [0, 0, 0];
  const sum = vertices.reduce<Vec3>(
    (acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]],
    [0, 0, 0]
  );
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

/** Compute face normal via cross product of first two edges */
export function computeFaceNormal(faceIndices: number[], vertices: Vec3[]): Vec3 {
  if (faceIndices.length < 3) return [0, 0, 1];
  const v0 = vertices[faceIndices[0]];
  const v1 = vertices[faceIndices[1]];
  const v2 = vertices[faceIndices[2]];
  const e1 = vecSub(v1, v0);
  const e2 = vecSub(v2, v0);
  const cross = vecCross(e1, e2);
  const len = vecLength(cross);
  if (len < 1e-9) return [0, 0, 1];
  return [cross[0] / len, cross[1] / len, cross[2] / len];
}

/** Derive unique sorted edges [min, max] from faces */
export function extractUniqueEdges(faces: number[][]): [number, number][] {
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];

  for (const face of faces) {
    const k = face.length;
    for (let i = 0; i < k; i++) {
      const u = face[i];
      const v = face[(i + 1) % k];
      const min = Math.min(u, v);
      const max = Math.max(u, v);
      const key = `${min}-${max}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([min, max]);
      }
    }
  }

  // Sort edges deterministically
  edges.sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
  return edges;
}

/**
 * Builds a deterministic Polyhedron model according to P11-T02 specification.
 */
export function buildPolyhedron(kind: PolyKind, p: Record<string, number>): Polyhedron {
  switch (kind) {
    case 'cube':
    case 'cuboid': {
      const l = kind === 'cube' ? (p.side ?? p.s ?? 5) : (p.length ?? p.l ?? 3);
      const w = kind === 'cube' ? l : (p.width ?? p.w ?? 4);
      const h = kind === 'cube' ? l : (p.height ?? p.h ?? 5);

      // Labels: A B C D E F G H
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const vertices: Vec3[] = [
        [0, 0, 0], // A: 0
        [l, 0, 0], // B: 1
        [l, w, 0], // C: 2
        [0, w, 0], // D: 3
        [0, 0, h], // E: 4
        [l, 0, h], // F: 5
        [l, w, h], // G: 6
        [0, w, h], // H: 7
      ];

      // CCW from OUTSIDE:
      // bottom [A,D,C,B], top [E,F,G,H], front [A,B,F,E], right [B,C,G,F], back [C,D,H,G], left [D,A,E,H]
      const faces: number[][] = [
        [0, 3, 2, 1], // bottom (normal -z)
        [4, 5, 6, 7], // top (normal +z)
        [0, 1, 5, 4], // front (normal -y)
        [1, 2, 6, 5], // right (normal +x)
        [2, 3, 7, 6], // back (normal +y)
        [3, 0, 4, 7], // left (normal -x)
      ];

      const edges = extractUniqueEdges(faces);
      return { kind, labels, vertices, faces, edges };
    }

    case 'prism': {
      // Right triangular prism {a, b, height}, right angle at A
      const a = p.a ?? 3;
      const b = p.b ?? 4;
      const H = p.height ?? p.h ?? 10;

      // Labels: A B C D E F
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      const vertices: Vec3[] = [
        [0, 0, 0], // A: 0
        [a, 0, 0], // B: 1
        [0, b, 0], // C: 2
        [0, 0, H], // D: 3
        [a, 0, H], // E: 4
        [0, b, H], // F: 5
      ];

      // Faces: bottom [A,C,B], top [D,E,F], [A,B,E,D], [A,D,F,C], [B,C,F,E]
      const faces: number[][] = [
        [0, 2, 1],    // bottom (normal -z)
        [3, 4, 5],    // top (normal +z)
        [0, 1, 4, 3], // front (normal -y)
        [0, 3, 5, 2], // left (normal -x)
        [1, 2, 5, 4], // hypotenuse (normal outwards)
      ];

      const edges = extractUniqueEdges(faces);
      return { kind, labels, vertices, faces, edges };
    }

    case 'pyramid': {
      // Square base pyramid {base, height}
      const s = p.base ?? p.b ?? p.side ?? 6;
      const h = p.height ?? p.h ?? 4;

      // Labels: T A B C D
      const labels = ['T', 'A', 'B', 'C', 'D'];
      const vertices: Vec3[] = [
        [s / 2, s / 2, h], // T: 0 (apex)
        [0, 0, 0],         // A: 1
        [s, 0, 0],         // B: 2
        [s, s, 0],         // C: 3
        [0, s, 0],         // D: 4
      ];

      // Faces: base [A,D,C,B], sides [A,B,T], [B,C,T], [C,D,T], [D,A,T]
      const faces: number[][] = [
        [1, 4, 3, 2], // base (normal -z)
        [1, 2, 0],    // side ABT
        [2, 3, 0],    // side BCT
        [3, 4, 0],    // side CDT
        [4, 1, 0],    // side DAT
      ];

      const edges = extractUniqueEdges(faces);
      return { kind, labels, vertices, faces, edges };
    }
  }
}
