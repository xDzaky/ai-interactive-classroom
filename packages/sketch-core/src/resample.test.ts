import { describe, it, expect } from 'vitest';
import { pathLength, filterMinDistance, resample, ptDistance } from './resample.js';

describe('resample utilities', () => {
  it('calculates path length of a straight line', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(pathLength(pts)).toBe(100);
  });

  it('filters consecutive points closer than minDist', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 2, y: 0 },
      { x: 2.2, y: 0 },
      { x: 10, y: 0 },
    ];
    const filtered = filterMinDistance(pts, 1.0);
    expect(filtered.length).toBe(3);
    expect(filtered[0]).toEqual({ x: 0, y: 0 });
    expect(filtered[1]).toEqual({ x: 2, y: 0 });
    expect(filtered[2]).toEqual({ x: 10, y: 0 });
  });

  it('resamples a 100-length line into exactly 64 points spaced 100/63', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const res = resample(pts, 64);
    expect(res.length).toBe(64);
    expect(res[0].x).toBeCloseTo(0, 5);
    expect(res[63].x).toBeCloseTo(100, 5);

    const expectedSpacing = 100 / 63;
    for (let i = 1; i < res.length; i++) {
      const step = ptDistance(res[i - 1], res[i]);
      expect(step).toBeCloseTo(expectedSpacing, 4);
    }
  });

  it('handles small or single-point arrays safely', () => {
    const pts = [{ x: 5, y: 10 }];
    const res = resample(pts, 64);
    expect(res.length).toBe(64);
    expect(res[0]).toEqual({ x: 5, y: 10 });
    expect(res[63]).toEqual({ x: 5, y: 10 });
  });
});
