import { describe, it, expect } from 'vitest';
import {
  computeBBox,
  perpDistToLine,
  interiorAngleDeg,
  ramerDouglasPeucker,
  fitEllipsePCA,
} from './geometry.js';
import type { Pt } from './types.js';

describe('geometry utilities', () => {
  it('computes accurate bbox for points', () => {
    const pts: Pt[] = [
      { x: -10, y: 5 },
      { x: 30, y: 35 },
      { x: 10, y: 10 },
    ];
    const box = computeBBox(pts);
    expect(box.minX).toBe(-10);
    expect(box.maxX).toBe(30);
    expect(box.minY).toBe(5);
    expect(box.maxY).toBe(35);
    expect(box.width).toBe(40);
    expect(box.height).toBe(30);
    expect(box.diagonal).toBe(50);
    expect(box.centerX).toBe(10);
    expect(box.centerY).toBe(20);
  });

  it('calculates perpendicular distance from point to line', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 0 };
    const p = { x: 50, y: 25 };
    expect(perpDistToLine(p, a, b)).toBeCloseTo(25, 4);
  });

  it('calculates interior angle between segments', () => {
    const a = { x: 0, y: 50 };
    const b = { x: 0, y: 0 };
    const c = { x: 50, y: 0 };
    expect(interiorAngleDeg(a, b, c)).toBeCloseTo(90, 4);

    const flatC = { x: 0, y: -50 };
    expect(interiorAngleDeg(a, b, flatC)).toBeCloseTo(180, 4);
  });

  it('RDP on noisy straight line collapses to 2 endpoints', () => {
    const line: Pt[] = [];
    for (let i = 0; i <= 50; i++) {
      const x = i * 2;
      // Slight noise < 0.2
      const noise = (Math.sin(i) * 0.15);
      line.push({ x, y: noise });
    }
    const simplified = ramerDouglasPeucker(line, 0.5);
    expect(simplified.length).toBe(2);
    expect(simplified[0].x).toBe(0);
    expect(simplified[1].x).toBe(100);
  });

  it('fits circle with high confidence and circle kind', () => {
    const circlePts: Pt[] = [];
    const r = 50;
    const cx = 100;
    const cy = 100;
    for (let i = 0; i < 64; i++) {
      const theta = (i / 64) * 2 * Math.PI;
      circlePts.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta),
      });
    }

    const fit = fitEllipsePCA(circlePts);
    expect(fit).not.toBeNull();
    expect(fit!.candidate.kind).toBe('circle');
    expect(fit!.candidate.confidence).toBeGreaterThan(0.95);
    expect(fit!.axisRatio).toBeGreaterThan(0.95);
  });

  it('fits ellipse with lower axisRatio and ellipse kind', () => {
    const ellipsePts: Pt[] = [];
    const rx = 80;
    const ry = 30;
    for (let i = 0; i < 64; i++) {
      const theta = (i / 64) * 2 * Math.PI;
      ellipsePts.push({
        x: rx * Math.cos(theta),
        y: ry * Math.sin(theta),
      });
    }

    const fit = fitEllipsePCA(ellipsePts);
    expect(fit).not.toBeNull();
    expect(fit!.candidate.kind).toBe('ellipse');
    expect(fit!.candidate.confidence).toBeGreaterThan(0.90);
    expect(fit!.axisRatio).toBeLessThan(0.85);
  });
});
