import { describe, it, expect } from 'vitest';
import { createRegularPolygonProfile, normalizeProfile2D } from './profile2d.js';
import {
  extrudeProfile,
  taperProfile,
  buildTetrahedron,
  buildOctahedron,
  buildIcosahedron,
  verifyEulerCharacteristic,
} from './operators3d.js';
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

  it('satisfies Euler V - E + F = 2 for Platonic solids', () => {
    expect(verifyEulerCharacteristic(buildTetrahedron(3))).toMatchObject({ V: 4, E: 6, F: 4, valid: true });
    expect(verifyEulerCharacteristic(buildOctahedron(3))).toMatchObject({ V: 6, E: 12, F: 8, valid: true });
    expect(verifyEulerCharacteristic(buildIcosahedron(2.5))).toMatchObject({ V: 12, E: 30, F: 20, valid: true });
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
