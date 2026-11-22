/**
 * selectionHitTest.test.ts
 * Tests for hit testing and marquee selection logic.
 */

import { describe, it, expect } from 'vitest';
import {
  getStrokeBBox,
  getItemBBox,
  isPointInBBox,
  doBBoxesIntersect,
  findHitItem,
  findItemsInMarquee,
} from './selectionHitTest';
import type { SceneState, BoardObject, BoardStroke } from '@ai-classroom/whiteboard-core';

describe('selectionHitTest', () => {
  const rectObj: BoardObject = {
    id: 'rect-1',
    object_type: 'rect',
    props: { x: 50, y: 50, w: 100, h: 80 },
    created_at: 1,
    updated_at: 1,
  };

  const strokeItem: BoardStroke = {
    id: 'stroke-1',
    points: [
      [200, 200, 0.5],
      [250, 250, 0.5],
      [300, 200, 0.5],
    ],
    color: '#000',
    width: 4,
    tool: 'pen',
  };

  const scene: SceneState = {
    id: 'main',
    objects: { 'rect-1': rectObj },
    strokes: { 'stroke-1': strokeItem },
    order: ['rect-1', 'stroke-1'],
  };

  it('computes stroke bounding box with padding', () => {
    const bbox = getStrokeBBox(strokeItem);
    expect(bbox.x).toBeLessThan(200);
    expect(bbox.y).toBeLessThan(200);
    expect(bbox.w).toBeGreaterThan(100);
    expect(bbox.h).toBeGreaterThan(50);
  });

  it('determines whether point is inside bbox', () => {
    const bbox = { x: 50, y: 50, w: 100, h: 80 };
    expect(isPointInBBox({ x: 60, y: 60 }, bbox)).toBe(true);
    expect(isPointInBBox({ x: 10, y: 10 }, bbox)).toBe(false);
  });

  it('detects intersection between two bounding boxes', () => {
    const b1 = { x: 0, y: 0, w: 100, h: 100 };
    const b2 = { x: 50, y: 50, w: 100, h: 100 };
    const b3 = { x: 200, y: 200, w: 50, h: 50 };

    expect(doBBoxesIntersect(b1, b2)).toBe(true);
    expect(doBBoxesIntersect(b1, b3)).toBe(false);
  });

  it('finds hit item accurately at coordinate', () => {
    // Hit rect-1
    expect(findHitItem({ x: 80, y: 80 }, scene)).toBe('rect-1');
    // Hit stroke-1
    expect(findHitItem({ x: 250, y: 240 }, scene)).toBe('stroke-1');
    // Empty space
    expect(findHitItem({ x: 500, y: 500 }, scene)).toBeNull();
  });

  it('finds items intersecting marquee selection box', () => {
    // Marquee enclosing rect-1
    const marquee1 = { x: 40, y: 40, w: 120, h: 100 };
    expect(findItemsInMarquee(marquee1, scene)).toEqual(['rect-1']);

    // Large marquee enclosing both
    const marqueeAll = { x: 0, y: 0, w: 400, h: 400 };
    expect(findItemsInMarquee(marqueeAll, scene)).toEqual(['rect-1', 'stroke-1']);

    // Marquee outside
    const marqueeEmpty = { x: 600, y: 600, w: 100, h: 100 };
    expect(findItemsInMarquee(marqueeEmpty, scene)).toEqual([]);
  });
});
