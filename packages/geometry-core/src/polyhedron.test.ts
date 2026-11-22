import { describe, it, expect } from 'vitest';
import {
  buildPolyhedron,
  computeCentroid,
  computeFaceNormal,
  vecDot,
  vecSub,
  vecCross,
  vecLength,
  type Polyhedron,
  type Vec3,
} from './polyhedron.js';

/** Compute face area using fan triangulation */
function computeFaceArea(face: number[], vertices: Vec3[]): number {
  let area = 0;
  const v0 = vertices[face[0]];
  for (let i = 1; i < face.length - 1; i++) {
    const v1 = vertices[face[i]];
    const v2 = vertices[face[i + 1]];
    const e1 = vecSub(v1, v0);
    const e2 = vecSub(v2, v0);
    const cross = vecCross(e1, e2);
    area += 0.5 * vecLength(cross);
  }
  return area;
}

/** Compute polyhedron volume via divergence theorem */
function computePolyhedronVolume(poly: Polyhedron): number {
  let volume = 0;
  const { vertices, faces } = poly;
  for (const face of faces) {
    const v0 = vertices[face[0]];
    for (let i = 1; i < face.length - 1; i++) {
      const v1 = vertices[face[i]];
      const v2 = vertices[face[i + 1]];
      // Signed volume of tetrahedron formed with origin
      const cross = vecCross(v1, v2);
      volume += vecDot(v0, cross) / 6;
    }
  }
  return Math.abs(volume);
}

describe('Polyhedron Models (P11-T02)', () => {
  const cube = buildPolyhedron('cube', { side: 5 });
  const cuboid = buildPolyhedron('cuboid', { length: 3, width: 4, height: 5 });
  const prism = buildPolyhedron('prism', { a: 3, b: 4, height: 10 });
  const pyramid = buildPolyhedron('pyramid', { base: 6, height: 4 });

  const allPolys = [cube, cuboid, prism, pyramid];

  it('satisfies Euler characteristic V - E + F = 2 for all models', () => {
    expect(cube.vertices.length - cube.edges.length + cube.faces.length).toBe(2);
    expect(cuboid.vertices.length - cuboid.edges.length + cuboid.faces.length).toBe(2);
    expect(prism.vertices.length - prism.edges.length + prism.faces.length).toBe(2);
    expect(pyramid.vertices.length - pyramid.edges.length + pyramid.faces.length).toBe(2);
  });

  it('ensures every edge belongs to exactly two faces', () => {
    for (const poly of allPolys) {
      const edgeUsage = new Map<string, number>();
      for (const face of poly.faces) {
        const k = face.length;
        for (let i = 0; i < k; i++) {
          const u = Math.min(face[i], face[(i + 1) % k]);
          const v = Math.max(face[i], face[(i + 1) % k]);
          const key = `${u}-${v}`;
          edgeUsage.set(key, (edgeUsage.get(key) ?? 0) + 1);
        }
      }

      for (const [edgeKey, count] of edgeUsage.entries()) {
        expect(count, `Edge ${edgeKey} in ${poly.kind} should belong to exactly 2 faces`).toBe(2);
      }
    }
  });

  it('ensures all face normals point away from the centroid (outward facing CCW)', () => {
    for (const poly of allPolys) {
      const polyCentroid = computeCentroid(poly.vertices);
      for (const face of poly.faces) {
        const faceVertices = face.map((idx) => poly.vertices[idx]);
        const faceCentroid = computeCentroid(faceVertices);
        const normal = computeFaceNormal(face, poly.vertices);
        const outwardVec = vecSub(faceCentroid, polyCentroid);
        const dot = vecDot(normal, outwardVec);
        expect(dot, `Face in ${poly.kind} should point outward`).toBeGreaterThan(0);
      }
    }
  });

  it('matches surface area mathematical vectors', () => {
    // Cube side 5 -> 6 * 25 = 150
    const cubeSA = cube.faces.reduce((sum, f) => sum + computeFaceArea(f, cube.vertices), 0);
    expect(cubeSA).toBeCloseTo(150, 4);

    // Cuboid 3x4x5 -> 2*(12 + 15 + 20) = 94
    const cuboidSA = cuboid.faces.reduce((sum, f) => sum + computeFaceArea(f, cuboid.vertices), 0);
    expect(cuboidSA).toBeCloseTo(94, 4);

    // Prism a=3, b=4, hypot=5, H=10 -> 2*6 + (3+4+5)*10 = 12 + 120 = 132
    const prismSA = prism.faces.reduce((sum, f) => sum + computeFaceArea(f, prism.vertices), 0);
    expect(prismSA).toBeCloseTo(132, 4);

    // Pyramid base 6, height 4: slant height = sqrt(3^2 + 4^2) = 5
    // base area = 36, 4 triangles area = 4 * (1/2 * 6 * 5) = 60 -> total = 96
    const pyramidSA = pyramid.faces.reduce((sum, f) => sum + computeFaceArea(f, pyramid.vertices), 0);
    expect(pyramidSA).toBeCloseTo(96, 4);
  });

  it('matches exact volume mathematical vectors via divergence theorem', () => {
    // Cube side 5 -> 125
    expect(computePolyhedronVolume(cube)).toBeCloseTo(125, 4);

    // Cuboid 3x4x5 -> 60
    expect(computePolyhedronVolume(cuboid)).toBeCloseTo(60, 4);

    // Prism 3x4 base (area 6) x 10 height -> 60
    expect(computePolyhedronVolume(prism)).toBeCloseTo(60, 4);

    // Pyramid base 6 (area 36) x 4 height / 3 -> 48
    expect(computePolyhedronVolume(pyramid)).toBeCloseTo(48, 4);
  });
});
