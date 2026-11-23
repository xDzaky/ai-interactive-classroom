import { describe, it, expect } from 'vitest';
import {
  recognizeMultiStroke3D,
  clusterRecentStrokes,
  type TimedStroke,
} from './multistroke3d.js';
import { recognizeDollarP } from './dollarP.js';
import type { Pt } from './types.js';

function linePts(x1: number, y1: number, x2: number, y2: number, steps = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return out;
}

function ellipsePts(cx: number, cy: number, rx: number, ry: number, steps = 28): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
  }
  return out;
}

describe('Multi-Stroke 3D Sketch Recognizer', () => {
  it('detects a multi-stroke hand-drawn 3D cube (front square + oblique edges + back closing edges)', () => {
    const now = 1000;
    const strokes: TimedStroke[] = [
      // Front square
      {
        id: 's1',
        timestamp: now,
        points: [
          ...linePts(100, 140, 200, 140),
          ...linePts(200, 140, 200, 240),
          ...linePts(200, 240, 100, 240),
          ...linePts(100, 240, 100, 140),
        ],
      },
      // Top-left oblique edge
      { id: 's2', timestamp: now + 300, points: linePts(100, 140, 145, 100) },
      // Top-right oblique edge
      { id: 's3', timestamp: now + 600, points: linePts(200, 140, 245, 100) },
      // Bottom-right oblique edge
      { id: 's4', timestamp: now + 900, points: linePts(200, 240, 245, 200) },
      // Back top horizontal edge
      { id: 's5', timestamp: now + 1200, points: linePts(145, 100, 245, 100) },
      // Back right vertical edge
      { id: 's6', timestamp: now + 1500, points: linePts(245, 100, 245, 200) },
    ];

    const res = recognizeMultiStroke3D(strokes);
    expect(res).not.toBeNull();
    expect(['cube', 'cuboid']).toContain(res?.kind);
    expect(res!.confidence).toBeGreaterThan(0.8);
  });

  it('detects a multi-stroke 3D cylinder (2 ellipses + 2 vertical lines)', () => {
    const strokes: TimedStroke[] = [
      { id: 'c1', timestamp: 1000, points: ellipsePts(150, 80, 50, 18) },
      { id: 'c2', timestamp: 1400, points: linePts(100, 80, 100, 210) },
      { id: 'c3', timestamp: 1700, points: linePts(200, 80, 200, 210) },
      { id: 'c4', timestamp: 2000, points: ellipsePts(150, 210, 50, 18) },
    ];
    const res = recognizeMultiStroke3D(strokes);
    expect(res).not.toBeNull();
    expect(res?.kind).toBe('cylinder');
  });

  it('detects a multi-stroke 3D cone (ellipse base + 2 converging lines)', () => {
    const strokes: TimedStroke[] = [
      { id: 'k1', timestamp: 1000, points: ellipsePts(150, 220, 50, 16) },
      { id: 'k2', timestamp: 1300, points: linePts(100, 220, 150, 80) },
      { id: 'k3', timestamp: 1600, points: linePts(200, 220, 150, 80) },
    ];
    const res = recognizeMultiStroke3D(strokes);
    expect(res).not.toBeNull();
    expect(res?.kind).toBe('cone');
  });

  it('detects a multi-stroke 3D sphere (outer circle + inner equator ellipse)', () => {
    const strokes: TimedStroke[] = [
      { id: 'b1', timestamp: 1000, points: ellipsePts(150, 150, 70, 70, 36) },
      { id: 'b2', timestamp: 1400, points: ellipsePts(150, 150, 68, 20, 28) },
    ];
    const res = recognizeMultiStroke3D(strokes);
    expect(res).not.toBeNull();
    expect(res?.kind).toBe('sphere');
  });

  it('detects a concave crown polygon as custom_prism with profilePoints', () => {
    // Crown shape (concave notches along the top!)
    const crown: Pt[] = [
      ...linePts(80, 200, 240, 200),
      ...linePts(240, 200, 250, 100),
      ...linePts(250, 100, 200, 145),
      ...linePts(200, 145, 160, 85),
      ...linePts(160, 85, 120, 145),
      ...linePts(120, 145, 70, 100),
      ...linePts(70, 100, 80, 200),
    ];
    const res = recognizeMultiStroke3D([{ id: 'crown1', timestamp: 1000, points: crown }]);
    expect(res).not.toBeNull();
    expect(res?.kind).toBe('custom_prism');
    expect(res?.profilePoints?.length).toBeGreaterThanOrEqual(6);
  });

  it('clusters temporally and spatially close strokes while excluding old distant strokes', () => {
    const strokes: TimedStroke[] = [
      { id: 'old', timestamp: 100, points: linePts(0, 0, 50, 0) },
      { id: 'a', timestamp: 5000, points: linePts(300, 300, 400, 300) },
      { id: 'b', timestamp: 5500, points: linePts(400, 300, 400, 400) },
    ];
    const cluster = clusterRecentStrokes(strokes, 2500);
    expect(cluster.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('$P fallback recognizes a cube point-cloud', () => {
    const cubeStrokes: Pt[][] = [
      [
        { x: 0, y: 30 }, { x: 70, y: 30 }, { x: 70, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 30 },
      ],
      [{ x: 0, y: 30 }, { x: 30, y: 0 }, { x: 100, y: 0 }, { x: 70, y: 30 }],
      [{ x: 100, y: 0 }, { x: 100, y: 70 }, { x: 70, y: 100 }],
    ];
    const res = recognizeDollarP(cubeStrokes);
    expect(res).not.toBeNull();
    expect(res?.name).toBe('cube');
  });
});
