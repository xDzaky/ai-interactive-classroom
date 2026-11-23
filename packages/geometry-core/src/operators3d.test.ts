import { describe, it, expect } from 'vitest';
import { createRegularPolygonProfile, normalizeProfile2D } from './profile2d.js';
import {
  extrudeProfile,
  taperProfile,
  buildTetrahedron,
  buildOctahedron,
  buildIcosahedron,
  buildDodecahedron,
  triangulatePolygon2D,
  triangulateFace3D,
  verifyEulerCharacteristic,
} from './operators3d.js';
import { intersectPolyhedronPlaneMulti } from './section.js';
import { detectFoldableNet2D } from './folding2d.js';

describe('Universal 3D Operators & Euler Invariant', () => {
  it('satisfies Euler V - E + F = 2 for n-sided prisms (n=3..8) with exact volume', () => {
    for (const n of [3, 4, 5, 6, 8]) {
      const profile = createRegularPolygonProfile(n, 2);
      const { polyhedron, volume } = extrudeProfile(profile, 5);
      const euler = verifyEulerCharacteristic(polyhedron);
      expect(euler.valid).toBe(true);
      expect(euler.chi).toBe(2);
      expect(volume).toBeCloseTo(profile.area * 5, 4);
    }
  });

  it('satisfies Euler V - E + F = 2 for n-pyramids and frustums with exact volume', () => {
    const sq = normalizeProfile2D([0, 0, 4, 0, 4, 4, 0, 4]);
    const pyr = taperProfile(sq, 6, 0);
    expect(verifyEulerCharacteristic(pyr.polyhedron).valid).toBe(true);
    expect(pyr.volume).toBeCloseTo((16 * 6) / 3, 4);

    const frustum = taperProfile(sq, 6, 0.5);
    expect(verifyEulerCharacteristic(frustum.polyhedron).valid).toBe(true);
    // V = (h/3)*(A1 + A2 + sqrt(A1*A2)) = 2 * (16 + 4 + 8) = 56
    expect(frustum.volume).toBeCloseTo(56, 4);
  });

  it('satisfies Euler V - E + F = 2 for all Platonic solids including Dodecahedron', () => {
    expect(verifyEulerCharacteristic(buildTetrahedron(3))).toMatchObject({ V: 4, E: 6, F: 4, valid: true });
    expect(verifyEulerCharacteristic(buildOctahedron(3))).toMatchObject({ V: 6, E: 12, F: 8, valid: true });
    expect(verifyEulerCharacteristic(buildIcosahedron(2.5))).toMatchObject({ V: 12, E: 30, F: 20, valid: true });
    expect(verifyEulerCharacteristic(buildDodecahedron(2.4))).toMatchObject({ V: 20, E: 30, F: 12, valid: true });
  });

  it('ear-clips concave crown polygon with exact area conservation (zero bleeding cap)', () => {
    // 7-vertex crown polygon (concave notches)
    const crown: [number, number][] = [
      [-2, -1],
      [2, -1],
      [2.2, 1.2],
      [1, 0.2],
      [0, 1.5],
      [-1, 0.2],
      [-2.2, 1.2],
    ];
    const profile = normalizeProfile2D(crown, false);
    const tris = triangulatePolygon2D(profile.points);
    expect(tris.length).toBe(profile.points.length - 2);
    // Sum of triangle areas must equal exact concave polygon area!
    let triAreaSum = 0;
    for (const [a, b, c] of tris) {
      const p0 = profile.points[a];
      const p1 = profile.points[b];
      const p2 = profile.points[c];
      triAreaSum += Math.abs((p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0])) * 0.5;
    }
    expect(triAreaSum).toBeCloseTo(profile.area, 4);

    const extruded = extrudeProfile(profile, 3);
    const topFace = extruded.polyhedron.faces[1];
    const tris3D = triangulateFace3D(extruded.polyhedron.vertices, topFace);
    expect(tris3D.length).toBe(profile.points.length - 2);
  });

  it('handles multi-polygon cross-section when slicing concave crown prongs', () => {
    // U-shaped concave prism sliced horizontally across the two upper arms (y = 0.8)
    const uShape: [number, number][] = [
      [-2, -1], [2, -1], [2, 1.5], [1, 1.5], [1, 0], [-1, 0], [-1, 1.5], [-2, 1.5],
    ];
    const profile = normalizeProfile2D(uShape, false);
    const { polyhedron } = extrudeProfile(profile, 4);
    const sections = intersectPolyhedronPlaneMulti(polyhedron, { n: [0, 1, 0], d: 0.8 });
    expect(sections.length).toBe(2);
    expect(sections[0].area).toBeGreaterThan(0);
    expect(sections[1].area).toBeGreaterThan(0);
  });

  it('detects a 6-square cross net for 2D Intelligent Folding', () => {
    const sq = (x: number, y: number, s = 50) => [x, y, x + s, y, x + s, y + s, x, y + s];
    const net = detectFoldableNet2D([
      { id: 'center', vertices: sq(100, 100) },
      { id: 'top', vertices: sq(100, 50) },
      { id: 'bottom', vertices: sq(100, 150) },
      { id: 'bottom2', vertices: sq(100, 200) },
      { id: 'left', vertices: sq(50, 100) },
      { id: 'right', vertices: sq(150, 100) },
    ]);
    expect(net).not.toBeNull();
    expect(net!.recognizedSolid).toBe('cube');
    expect(net!.rootId).toBe('center');
    expect(net!.hinges.length).toBe(5);
  });
});
