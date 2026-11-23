import { describe, it, expect } from 'vitest';
import {
  worldToLocal,
  localToWorld,
  isPointInOBB,
  resizeWithPinnedAnchor,
  computeRotationAngle,
  getOBBCorners,
  recenterPolygonPoints,
  type CanonicalTransform,
} from './transform.js';

describe('CanonicalTransform & OBB Math', () => {
  const anglesDeg = [0, 30, 45, 90, 180];

  for (const deg of anglesDeg) {
    it(`round-trips worldToLocal <-> localToWorld accurately at ${deg}°`, () => {
      const tf: CanonicalTransform = {
        cx: 250,
        cy: 180,
        width: 120,
        height: 80,
        rotation: (deg * Math.PI) / 180,
      };
      const worldPt = { x: 310, y: 215 };
      const local = worldToLocal(worldPt, tf);
      const back = localToWorld(local, tf);
      expect(back.x).toBeCloseTo(worldPt.x, 6);
      expect(back.y).toBeCloseTo(worldPt.y, 6);
    });

    it(`pins opposite corner (nw) when resizing via se handle at ${deg}°`, () => {
      const tf: CanonicalTransform = {
        cx: 200,
        cy: 200,
        width: 100,
        height: 60,
        rotation: (deg * Math.PI) / 180,
      };
      const origNW = getOBBCorners(tf)[0];
      // Drag se outward by (+40, +20) in local space
      const targetSE = localToWorld({ x: 90, y: 50 }, tf);
      const resized = resizeWithPinnedAnchor(tf, 'se', targetSE);
      const newNW = getOBBCorners(resized)[0];

      expect(resized.width).toBeCloseTo(140, 5);
      expect(resized.height).toBeCloseTo(80, 5);
      expect(newNW.x).toBeCloseTo(origNW.x, 5);
      expect(newNW.y).toBeCloseTo(origNW.y, 5);
    });
  }

  it('accurately hit-tests rotated OBB (45°)', () => {
    const tf: CanonicalTransform = {
      cx: 100,
      cy: 100,
      width: 200,
      height: 20,
      rotation: Math.PI / 4,
    };
    // Point along the rotated diagonal inside the thin bar
    const inside = localToWorld({ x: 80, y: 0 }, tf);
    expect(isPointInOBB(inside, tf, 2)).toBe(true);

    // Point inside the AABB corner but outside the rotated thin bar
    const outside = { x: 180, y: 20 };
    expect(isPointInOBB(outside, tf, 2)).toBe(false);
  });

  it('snaps rotation to 15° increments when shift is held', () => {
    const center = { x: 100, y: 100 };
    // Point roughly 43° clockwise from top (0, -100)
    const rawRad = (43 * Math.PI) / 180;
    const ptr = {
      x: center.x + Math.sin(rawRad) * 100,
      y: center.y - Math.cos(rawRad) * 100,
    };
    const snapped = computeRotationAngle(center, ptr, true);
    expect((snapped * 180) / Math.PI).toBeCloseTo(45, 5);
  });

  it('recenters polygon points cleanly', () => {
    const res = recenterPolygonPoints([100, 100, 200, 100, 200, 160, 100, 160]);
    expect(res.cx).toBe(150);
    expect(res.cy).toBe(130);
    expect(res.width).toBe(100);
    expect(res.height).toBe(60);
    expect(res.localPoints).toEqual([-50, -30, 50, -30, 50, 30, -50, 30]);
  });
});
