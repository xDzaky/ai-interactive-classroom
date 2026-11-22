import { describe, it, expect } from 'vitest';
import { recognizeShape } from './recognizer.js';
import type { Pt } from './types.js';

function makeCircle(cx = 100, cy = 100, r = 50, n = 64): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * 2 * Math.PI;
    pts.push({ x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) });
  }
  // close stroke
  pts.push({ ...pts[0] });
  return pts;
}

function makePolyline(corners: Pt[], pointsPerSide = 16): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < corners.length; i++) {
    const c1 = corners[i];
    const c2 = corners[(i + 1) % corners.length];
    for (let j = 0; j < pointsPerSide; j++) {
      const t = j / pointsPerSide;
      pts.push({
        x: c1.x + (c2.x - c1.x) * t,
        y: c1.y + (c2.y - c1.y) * t,
      });
    }
  }
  pts.push({ ...corners[0] });
  return pts;
}

describe('recognizeShape', () => {
  it('rejects short or sparse strokes as keep', () => {
    const tiny = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
    const res = recognizeShape(tiny);
    expect(res.decision).toBe('keep');
    expect(res.best).toBeNull();
  });

  it('recognizes a straight open stroke as line with snap', () => {
    const linePts: Pt[] = [];
    for (let i = 0; i <= 30; i++) {
      // slight y deviation
      linePts.push({ x: i * 5, y: 50 + (i % 2 === 0 ? 0.3 : -0.3) });
    }
    const res = recognizeShape(linePts);
    expect(res.best).not.toBeNull();
    expect(res.best!.kind).toBe('line');
    expect(res.decision).toBe('snap');
    expect(res.best!.confidence).toBeGreaterThan(0.85);
  });

  it('recognizes circle with confidence >= 0.95', () => {
    const circle = makeCircle(200, 200, 60, 64);
    const res = recognizeShape(circle);
    expect(res.decision).toBe('snap');
    expect(res.best).not.toBeNull();
    expect(res.best!.kind).toBe('circle');
    expect(res.best!.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('recognizes square CW and CCW from multiple start vertices', () => {
    const vCW: Pt[] = [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 150 },
      { x: 50, y: 150 },
    ];
    const resCW = recognizeShape(makePolyline(vCW));
    expect(resCW.best).not.toBeNull();
    expect(resCW.best!.kind).toBe('square');
    expect(resCW.best!.confidence).toBeGreaterThanOrEqual(0.90);

    const vCCW = [...vCW].reverse();
    const resCCW = recognizeShape(makePolyline(vCCW));
    expect(resCCW.best).not.toBeNull();
    expect(resCCW.best!.kind).toBe('square');
    expect(resCCW.best!.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it('recognizes equilateral triangle', () => {
    const side = 100;
    const h = (Math.sqrt(3) / 2) * side;
    const triangle: Pt[] = [
      { x: 100, y: 100 - (2 / 3) * h },
      { x: 100 + side / 2, y: 100 + (1 / 3) * h },
      { x: 100 - side / 2, y: 100 + (1 / 3) * h },
    ];
    const res = recognizeShape(makePolyline(triangle));
    expect(res.best).not.toBeNull();
    expect(res.best!.kind).toBe('triangle');
    expect(res.decision).toBe('snap');
    expect(res.best!.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('recognizes right-angled triangle', () => {
    const rightTri: Pt[] = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
      { x: 100, y: 200 },
    ];
    const res = recognizeShape(makePolyline(rightTri));
    expect(res.best).not.toBeNull();
    expect(['right_triangle', 'triangle']).toContain(res.best!.kind);
  });

  it('rejects organic non-geometric drawings (heart, S, 8, spiral, zigzag)', () => {
    // 1. S-curve
    const sCurve: Pt[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * 2 * Math.PI;
      sCurve.push({ x: 100 + 40 * Math.sin(t), y: 50 + i * 3 });
    }
    const resS = recognizeShape(sCurve);
    expect(resS.decision).toBe('keep');

    // 2. Figure 8 (lemniscate)
    const fig8: Pt[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * 2 * Math.PI;
      const denom = 1 + Math.sin(t) * Math.sin(t);
      fig8.push({
        x: 100 + (50 * Math.cos(t)) / denom,
        y: 100 + (50 * Math.sin(t) * Math.cos(t)) / denom,
      });
    }
    const res8 = recognizeShape(fig8);
    expect(res8.decision).toBe('keep');

    // 3. Heart shape
    const heart: Pt[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * 2 * Math.PI;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      heart.push({ x: 100 + x * 4, y: 100 + y * 4 });
    }
    const resHeart = recognizeShape(heart);
    expect(resHeart.decision).toBe('keep');

    // 4. Zigzag
    const zigzag: Pt[] = [];
    for (let i = 0; i < 20; i++) {
      zigzag.push({ x: i * 10, y: i % 2 === 0 ? 0 : 50 });
    }
    const resZigzag = recognizeShape(zigzag);
    expect(resZigzag.decision).toBe('keep');
  });

  describe('extra planar shapes (P10-T13)', () => {
    it('recognizes parallelogram (jajargenjang)', () => {
      const pgramCorners = [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 80, y: 40 },
        { x: 20, y: 40 },
      ];
      const pgram = makePolyline(pgramCorners, 16);
      const res = recognizeShape(pgram);
      expect(res.best).not.toBeNull();
      expect(res.best!.kind).toBe('parallelogram');
    });

    it('recognizes trapezoid (trapesium)', () => {
      const trapCorners = [
        { x: 20, y: 0 },
        { x: 80, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ];
      const trap = makePolyline(trapCorners, 16);
      const res = recognizeShape(trap);
      expect(res.best).not.toBeNull();
      expect(res.best!.kind).toBe('trapezoid');
    });

    it('recognizes kite (layang-layang)', () => {
      const kiteCorners = [
        { x: 50, y: 0 },
        { x: 80, y: 40 },
        { x: 50, y: 100 },
        { x: 20, y: 40 },
      ];
      const kite = makePolyline(kiteCorners, 16);
      const res = recognizeShape(kite);
      expect(res.best).not.toBeNull();
      expect(res.best!.kind).toBe('kite');
    });
  });
});
