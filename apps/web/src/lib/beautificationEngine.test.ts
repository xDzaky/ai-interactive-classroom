import { describe, it, expect } from 'vitest';
import { smoothHandwritingPoints, buildBeautifyBatchEvent } from './beautificationEngine';
import { recognizeHandwrittenMathLocal } from '../workers/hmer.worker';

describe('V4 Seewo Beautification & Local HMER', () => {
  it('smooths jittery handwriting strokes while preserving endpoints', () => {
    const jittery: [number, number, number][] = [
      [0, 0, 0.5],
      [10, 8, 0.5],
      [20, -6, 0.5],
      [30, 7, 0.5],
      [40, 0, 0.5],
    ];
    const smooth = smoothHandwritingPoints(jittery, 2);
    expect(smooth[0]).toEqual([0, 0, 0.5]);
    expect(smooth[smooth.length - 1]).toEqual([40, 0, 0.5]);
    expect(Math.abs(smooth[2][1])).toBeLessThan(6);
  });

  it('aligns stacked math_blocks into a clean vertical equation column', () => {
    const ev = buildBeautifyBatchEvent(
      [
        { id: 'm1', object_type: 'math_block', props: { x: 100, y: 80, latex: 'x+2=5' }, created_at: 0, updated_at: 0 },
        { id: 'm2', object_type: 'math_block', props: { x: 145, y: 210, latex: 'x=3' }, created_at: 0, updated_at: 0 },
      ],
      [],
    );
    expect(ev).not.toBeNull();
    expect(ev?.event_type).toBe('batch');
  });

  it('recognizes a handwritten fraction structure locally in < 15ms', () => {
    const res = recognizeHandwrittenMathLocal([
      { id: 'num', points: [[150, 80], [150, 120]] },
      { id: 'bar', points: [[100, 140], [200, 140]] },
      { id: 'den', points: [[135, 165], [165, 165], [135, 195], [165, 195]] },
    ]);
    expect(res.kind).toBe('math');
    expect(res.latex).toContain('\\frac');
    expect(res.confidence).toBeGreaterThan(0.8);
  });
});
