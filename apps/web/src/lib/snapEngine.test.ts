import { describe, it, expect } from 'vitest';
import { computeMagneticSnap } from './snapEngine';

describe('snapEngine — Magnetic Edge & Center Snapping', () => {
  it('snaps a triangle roof flush onto the top edge of a square within 12px', () => {
    const square = { x: 200, y: 300, w: 100, h: 100 };
    // Triangle bottom is at y = 294 (6px above square top y = 300), centerX at 254 (4px right of 250)
    const triangle = { x: 204, y: 214, w: 100, h: 80 };
    const snap = computeMagneticSnap(triangle, [square], 12);
    expect(snap.dy).toBe(6);
    expect(snap.dx).toBe(-4);
    expect(snap.guides.length).toBe(2);
  });

  it('returns zero snap when shapes are far apart', () => {
    const res = computeMagneticSnap(
      { x: 0, y: 0, w: 50, h: 50 },
      [{ x: 300, y: 300, w: 50, h: 50 }],
      12,
    );
    expect(res.dx).toBe(0);
    expect(res.dy).toBe(0);
    expect(res.guides.length).toBe(0);
  });
});
