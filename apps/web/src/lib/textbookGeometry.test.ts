import { describe, it, expect } from 'vitest';
import {
  perpSnapPoint,
  buildRightAngleSquare,
  computeEdgeLabelPlacement,
} from './textbookGeometry';

describe('V5 Textbook Geometry Primitives & Perpendicular Snap', () => {
  it('snaps altitude from B(50, 0) onto horizontal segment A(0, 100)-D(100, 100) within ±4°', () => {
    const res = perpSnapPoint(
      { x: 50, y: 0 },
      { x: 52, y: 98 }, // ~1.1° off perpendicular
      { x: 0, y: 100 },
      { x: 100, y: 100 },
      4,
    );
    expect(res.snapped).toBe(true);
    expect(Math.abs(res.foot.x - 50)).toBeLessThan(1e-6);
    expect(Math.abs(res.foot.y - 100)).toBeLessThan(1e-6);

    const sq = buildRightAngleSquare(res.foot, res.uDir, res.vDir, 14);
    expect(sq.length).toBe(4);
    expect(sq[1].x).toBeCloseTo(64, 5);
    expect(sq[2].y).toBeCloseTo(86, 5);
  });

  it('keeps edge labels upright even when segment runs right-to-left', () => {
    const place = computeEdgeLabelPlacement({ x: 200, y: 100 }, { x: 100, y: 120 }, 0.5, -14, true);
    expect(place.rotationDeg).toBeGreaterThanOrEqual(-90);
    expect(place.rotationDeg).toBeLessThanOrEqual(90);
  });
});
