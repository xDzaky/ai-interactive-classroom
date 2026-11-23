/**
 * @ai-classroom/geometry-core — Universal 3D Operators & Platonic/Frustum Builders
 * Watertight 2-manifold Polyhedron generators from Profile2D:
 * - extrudeProfile (Right & Oblique n-Prisms, Custom Polygon Prisms)
 * - taperProfile (Right & Oblique n-Pyramids & Frustums)
 * - Platonic Solids (Tetrahedron, Octahedron, Dodecahedron, Icosahedron)
 * - Euler Characteristic verification (V - E + F = 2)
 */

import type { Polyhedron, Vec3 } from './polyhedron.js';
import type { Profile2D } from './profile2d.js';

export interface EulerCheck {
  V: number;
  E: number;
  F: number;
  chi: number;
  valid: boolean;
}

export function verifyEulerCharacteristic(poly: Polyhedron): EulerCheck {
  const V = poly.vertices.length;
  const E = poly.edges.length;
  const F = poly.faces.length;
  const chi = V - E + F;
  return { V, E, F, chi, valid: chi === 2 };
}

function extractUniqueEdges(faces: number[][]): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const key = `${lo}:${hi}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([lo, hi]);
      }
    }
  }
  return edges;
}

function makeLabels(count: number): string[] {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(i < 26 ? alpha[i] : `V${i + 1}`);
  }
  return out;
}

/**
 * Extrudes any CCW Profile2D along the Z-axis (geometry-core Z-up convention)
 * with optional oblique shear (obliqueX, obliqueY).
 * Guarantees watertight 2-manifold topology (V = 2n, E = 3n, F = n + 2, V - E + F = 2).
 */
export function extrudeProfile(
  profile: Profile2D,
  height: number,
  obliqueX = 0,
  obliqueY = 0,
): { polyhedron: Polyhedron; volume: number; surfaceArea: number } {
  const pts = profile.points;
  const n = pts.length;
  const vertices: Vec3[] = [];

  // Bottom ring (z = 0)
  for (let i = 0; i < n; i++) {
    vertices.push([pts[i][0], pts[i][1], 0]);
  }
  // Top ring (z = height, shifted by oblique offset)
  for (let i = 0; i < n; i++) {
    vertices.push([pts[i][0] + obliqueX, pts[i][1] + obliqueY, height]);
  }

  const faces: number[][] = [];
  // Bottom face (CW when viewed from +Z so outward normal points -Z)
  faces.push(Array.from({ length: n }, (_, i) => n - 1 - i));
  // Top face (CCW when viewed from +Z so outward normal points +Z)
  faces.push(Array.from({ length: n }, (_, i) => n + i));
  // Side quads
  let lateralArea = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    faces.push([i, next, n + next, n + i]);
    const edgeLen = Math.hypot(pts[next][0] - pts[i][0], pts[next][1] - pts[i][1]);
    const slantH = Math.hypot(height, obliqueX, obliqueY);
    lateralArea += edgeLen * slantH;
  }

  const edges = extractUniqueEdges(faces);
  const volume = profile.area * height;
  const surfaceArea = 2 * profile.area + lateralArea;

  return {
    polyhedron: { kind: 'prism', vertices, edges, faces, labels: makeLabels(vertices.length) },
    volume: parseFloat(volume.toFixed(6)),
    surfaceArea: parseFloat(surfaceArea.toFixed(6)),
  };
}

/**
 * Tapers any CCW Profile2D into a Pyramid (`topScale = 0`) or Frustum (`0 < topScale < 1`).
 */
export function taperProfile(
  profile: Profile2D,
  height: number,
  topScale = 0,
  obliqueX = 0,
  obliqueY = 0,
): { polyhedron: Polyhedron; volume: number; surfaceArea: number } {
  const pts = profile.points;
  const n = pts.length;
  const scale = Math.max(0, Math.min(0.99, topScale));
  const vertices: Vec3[] = [];

  for (let i = 0; i < n; i++) {
    vertices.push([pts[i][0], pts[i][1], 0]);
  }

  const faces: number[][] = [];
  // Bottom face
  faces.push(Array.from({ length: n }, (_, i) => n - 1 - i));

  let lateralArea = 0;

  if (scale <= 1e-4) {
    // True Pyramid: single apex vertex at index n
    const apex: Vec3 = [obliqueX, obliqueY, height];
    vertices.push(apex);
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      faces.push([i, next, n]);
      // Triangle area via cross product
      const v0 = vertices[i];
      const v1 = vertices[next];
      const e1: Vec3 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
      const e2: Vec3 = [apex[0] - v0[0], apex[1] - v0[1], apex[2] - v0[2]];
      const cx = e1[1] * e2[2] - e1[2] * e2[1];
      const cy = e1[2] * e2[0] - e1[0] * e2[2];
      const cz = e1[0] * e2[1] - e1[1] * e2[0];
      lateralArea += 0.5 * Math.hypot(cx, cy, cz);
    }
    const edges = extractUniqueEdges(faces);
    const volume = (profile.area * height) / 3;
    const surfaceArea = profile.area + lateralArea;
    return {
      polyhedron: { kind: 'pyramid', vertices, edges, faces, labels: [...makeLabels(n), 'T'] },
      volume: parseFloat(volume.toFixed(6)),
      surfaceArea: parseFloat(surfaceArea.toFixed(6)),
    };
  }

  // Frustum: scaled top ring
  for (let i = 0; i < n; i++) {
    vertices.push([pts[i][0] * scale + obliqueX, pts[i][1] * scale + obliqueY, height]);
  }
  // Top face
  faces.push(Array.from({ length: n }, (_, i) => n + i));
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    faces.push([i, next, n + next, n + i]);
    const b1 = Math.hypot(pts[next][0] - pts[i][0], pts[next][1] - pts[i][1]);
    const b2 = b1 * scale;
    const midX = (pts[i][0] + pts[next][0]) * 0.5;
    const midY = (pts[i][1] + pts[next][1]) * 0.5;
    const topMidX = midX * scale + obliqueX;
    const topMidY = midY * scale + obliqueY;
    const slantH = Math.hypot(topMidX - midX, topMidY - midY, height);
    lateralArea += 0.5 * (b1 + b2) * slantH;
  }

  const edges = extractUniqueEdges(faces);
  const A1 = profile.area;
  const A2 = profile.area * scale * scale;
  const volume = (height / 3) * (A1 + A2 + Math.sqrt(A1 * A2));
  const surfaceArea = A1 + A2 + lateralArea;

  return {
    polyhedron: { kind: 'prism', vertices, edges, faces, labels: makeLabels(vertices.length) },
    volume: parseFloat(volume.toFixed(6)),
    surfaceArea: parseFloat(surfaceArea.toFixed(6)),
  };
}

/**
 * Platonic Solids (all satisfy V - E + F = 2)
 */
export function buildTetrahedron(edgeLen = 3): Polyhedron {
  const s = edgeLen / Math.sqrt(8);
  const vertices: Vec3[] = [
    [s, s, s],
    [s, -s, -s],
    [-s, s, -s],
    [-s, -s, s],
  ];
  const faces = [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2],
  ];
  return { kind: 'pyramid', vertices, edges: extractUniqueEdges(faces), faces, labels: ['A', 'B', 'C', 'D'] };
}

export function buildOctahedron(edgeLen = 3): Polyhedron {
  const r = edgeLen / Math.SQRT2;
  const vertices: Vec3[] = [
    [r, 0, 0],
    [-r, 0, 0],
    [0, r, 0],
    [0, -r, 0],
    [0, 0, r],
    [0, 0, -r],
  ];
  const faces = [
    [0, 2, 4],
    [2, 1, 4],
    [1, 3, 4],
    [3, 0, 4],
    [2, 0, 5],
    [1, 2, 5],
    [3, 1, 5],
    [0, 3, 5],
  ];
  return { kind: 'pyramid', vertices, edges: extractUniqueEdges(faces), faces, labels: makeLabels(6) };
}

export function buildIcosahedron(radius = 2.5): Polyhedron {
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw: Vec3[] = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ];
  const scale = radius / Math.hypot(1, phi);
  const vertices: Vec3[] = raw.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return { kind: 'prism', vertices, edges: extractUniqueEdges(faces), faces, labels: makeLabels(12) };
}

/**
 * Regular Dodecahedron (5th Platonic Solid: V=20, E=30, F=12, V-E+F = 2)
 */
export function buildDodecahedron(radius = 2.4): Polyhedron {
  const phi = (1 + Math.sqrt(5)) / 2;
  const inv = 1 / phi;
  const raw: Vec3[] = [
    // (±1, ±1, ±1) — 0..7
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    // (0, ±inv, ±phi) — 8..11
    [0, inv, phi], [0, inv, -phi], [0, -inv, phi], [0, -inv, -phi],
    // (±inv, ±phi, 0) — 12..15
    [inv, phi, 0], [inv, -phi, 0], [-inv, phi, 0], [-inv, -phi, 0],
    // (±phi, 0, ±inv) — 16..19
    [phi, 0, inv], [phi, 0, -inv], [-phi, 0, inv], [-phi, 0, -inv],
  ];
  const scale = radius / Math.sqrt(3);
  const vertices: Vec3[] = raw.map(([x, y, z]) => [x * scale, y * scale, z * scale]);
  const faces = [
    [0, 8, 10, 2, 16],
    [0, 16, 17, 1, 12],
    [0, 12, 14, 4, 8],
    [1, 17, 3, 11, 9],
    [1, 9, 5, 14, 12],
    [2, 10, 6, 15, 13],
    [2, 13, 3, 17, 16],
    [3, 13, 15, 7, 11],
    [4, 14, 5, 19, 18],
    [4, 18, 6, 10, 8],
    [5, 9, 11, 7, 19],
    [6, 18, 19, 7, 15],
  ];
  return { kind: 'prism', vertices, edges: extractUniqueEdges(faces), faces, labels: makeLabels(20) };
}

// ---------------------------------------------------------------------------
// Ear-Clipping Triangulation for Simple Concave & Convex Polygons
// ---------------------------------------------------------------------------

function cross2D(a: [number, number], b: [number, number], c: [number, number]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function pointInTri2D(
  p: [number, number],
  a: [number, number],
  b: [number, number],
  c: [number, number],
): boolean {
  const c1 = cross2D(a, b, p);
  const c2 = cross2D(b, c, p);
  const c3 = cross2D(c, a, p);
  return c1 >= -1e-9 && c2 >= -1e-9 && c3 >= -1e-9;
}

/**
 * Triangulates any simple 2D polygon (including concave polygons like crowns, stars, L-shapes)
 * using Ear-Clipping. Returns triangle index triples referencing `pts`.
 */
export function triangulatePolygon2D(pts: [number, number][]): [number, number, number][] {
  const n = pts.length;
  if (n < 3) return [];
  if (n === 3) return [[0, 1, 2]];

  // Compute signed area to know winding (ensure working list is CCW)
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    signedArea += a[0] * b[1] - b[0] * a[1];
  }
  const indices = Array.from({ length: n }, (_, i) => (signedArea >= 0 ? i : n - 1 - i));
  const triangles: [number, number, number][] = [];

  let guard = n * n + 10;
  while (indices.length > 3 && guard-- > 0) {
    let earFound = false;
    const m = indices.length;
    for (let i = 0; i < m; i++) {
      const prevIdx = indices[(i - 1 + m) % m];
      const currIdx = indices[i];
      const nextIdx = indices[(i + 1) % m];
      const a = pts[prevIdx];
      const b = pts[currIdx];
      const c = pts[nextIdx];

      // Must be a convex vertex (CCW turn)
      if (cross2D(a, b, c) <= 1e-9) continue;

      // Must not contain any other polygon vertex inside triangle (a, b, c)
      let hasInside = false;
      for (let j = 0; j < m; j++) {
        const testIdx = indices[j];
        if (testIdx === prevIdx || testIdx === currIdx || testIdx === nextIdx) continue;
        if (pointInTri2D(pts[testIdx], a, b, c)) {
          hasInside = true;
          break;
        }
      }
      if (!hasInside) {
        triangles.push(
          signedArea >= 0 ? [prevIdx, currIdx, nextIdx] : [prevIdx, nextIdx, currIdx],
        );
        indices.splice(i, 1);
        earFound = true;
        break;
      }
    }
    if (!earFound) break;
  }

  if (indices.length === 3) {
    triangles.push(
      signedArea >= 0
        ? [indices[0], indices[1], indices[2]]
        : [indices[0], indices[2], indices[1]],
    );
  }
  return triangles;
}

/**
 * Projects a planar 3D polygon face (possibly concave!) onto its local 2D basis
 * and triangulates via Ear-Clipping. Returns triples of vertex indices into `vertices`.
 */
export function triangulateFace3D(
  vertices: Vec3[],
  faceIndices: number[],
): [number, number, number][] {
  const k = faceIndices.length;
  if (k < 3) return [];
  if (k === 3) return [[faceIndices[0], faceIndices[1], faceIndices[2]]];

  // Newell's method for robust face normal (works on concave faces!)
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < k; i++) {
    const a = vertices[faceIndices[i]];
    const b = vertices[faceIndices[(i + 1) % k]];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const nLen = Math.hypot(nx, ny, nz) || 1;
  const n: Vec3 = [nx / nLen, ny / nLen, nz / nLen];

  // Build orthonormal basis (u, v) on face plane
  const ref: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const ux = ref[1] * n[2] - ref[2] * n[1];
  const uy = ref[2] * n[0] - ref[0] * n[2];
  const uz = ref[0] * n[1] - ref[1] * n[0];
  const uLen = Math.hypot(ux, uy, uz) || 1;
  const u: Vec3 = [ux / uLen, uy / uLen, uz / uLen];
  const v: Vec3 = [
    n[1] * u[2] - n[2] * u[1],
    n[2] * u[0] - n[0] * u[2],
    n[0] * u[1] - n[1] * u[0],
  ];

  const origin = vertices[faceIndices[0]];
  const pts2D: [number, number][] = faceIndices.map((vi) => {
    const p = vertices[vi];
    const dx = p[0] - origin[0];
    const dy = p[1] - origin[1];
    const dz = p[2] - origin[2];
    return [dx * u[0] + dy * u[1] + dz * u[2], dx * v[0] + dy * v[1] + dz * v[2]];
  });

  const localTris = triangulatePolygon2D(pts2D);
  return localTris.map(([a, b, c]) => [faceIndices[a], faceIndices[b], faceIndices[c]]);
}
