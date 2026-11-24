import { describe, it, expect } from 'vitest';
import {
  mergeProfiles2DUnion,
  extractBaseProfile2D,
  computeCompoundStats,
  type CompoundSolidPart,
} from './composite.js';
import { normalizeProfile2D } from './profile2d.js';

describe('composite.ts — Round-Trip 3D<->2D, 2D Boolean Union, & Compound 3D', () => {
  it('merges a Square + Triangle touching at the top edge into a clean 5-vertex House pentagon', () => {
    // Square: x in [-2, 2], y in [0, 4] (area = 16)
    const square: [number, number][] = [
      [-2, 0],
      [2, 0],
      [2, 4],
      [-2, 4],
    ];
    // Roof triangle sitting flush on y = 4 with apex at (0, 7) (area = 0.5 * 4 * 3 = 6)
    const roof: [number, number][] = [
      [-2, 4],
      [2, 4],
      [0, 7],
    ];

    const merged = mergeProfiles2DUnion([square, roof]);
    const prof = normalizeProfile2D(merged, false);

    expect(prof.points.length).toBe(5);
    expect(prof.area).toBeCloseTo(22, 2); // 16 + 6 = 22
  });

  it('extracts a clean 2D base profile from standard 3D solids for Edit 2D round-trip', () => {
    const cubeBase = extractBaseProfile2D({ type: 'cube', s: 4 });
    expect(cubeBase.objectType).toBe('rect');
    expect(cubeBase.verticesCm.length).toBe(4);
    expect(cubeBase.depthCm).toBe(4);

    const cylBase = extractBaseProfile2D({ type: 'cylinder', r: 2, h: 5 });
    expect(cylBase.objectType).toBe('circle');
    expect(cylBase.depthCm).toBe(5);
  });

  it('computes combined volume & surface area for a Compound House (Cube + Pyramid)', () => {
    const parts: CompoundSolidPart[] = [
      {
        id: 'body',
        label: 'Badan Rumah',
        solidType: 'cube',
        params: { type: 'cube', s: 4 },
        offsetCm: [0, 0, 0],
      },
      {
        id: 'roof',
        label: 'Atap Limas',
        solidType: 'pyramid',
        params: { type: 'pyramid', b: 4, h: 3 },
        offsetCm: [0, 3.5, 0],
      },
    ];
    const stats = computeCompoundStats(parts);
    // Cube V = 64, Pyramid V = (16 * 3)/3 = 16 -> Total = 80
    expect(stats.partCount).toBe(2);
    expect(stats.totalVolume).toBeCloseTo(80, 2);
  });
});
