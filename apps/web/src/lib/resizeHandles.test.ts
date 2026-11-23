import { describe, it, expect } from 'vitest';
import { getResizeHandles, findHitResizeHandle, computeResizedProps } from './resizeHandles';
import type { BoardObject } from '@ai-classroom/whiteboard-core';

describe('resizeHandles (Direct Corner/Edge Resizing)', () => {
  const bbox = { x: 100, y: 100, w: 200, h: 100 };

  it('returns 8 handle points and detects hits on corners', () => {
    const handles = getResizeHandles(bbox);
    expect(handles).toHaveLength(8);
    expect(findHitResizeHandle({ x: 300, y: 200 }, bbox, 1)).toBe('se');
    expect(findHitResizeHandle({ x: 100, y: 100 }, bbox, 1)).toBe('nw');
    expect(findHitResizeHandle({ x: 200, y: 150 }, bbox, 1)).toBeNull();
  });

  it('resizes a rect when dragging SE corner', () => {
    const rectObj: BoardObject = {
      id: 'r1',
      object_type: 'rect',
      props: { x: 100, y: 100, w: 200, h: 100 },
      created_at: 0,
      updated_at: 0,
    };
    const next = computeResizedProps(rectObj, 'se', bbox, rectObj.props, { x: 360, y: 250 });
    expect(next.w).toBe(260);
    expect(next.h).toBe(150);
    expect(next.x).toBe(100);
    expect(next.y).toBe(100);
  });

  it('resizes a circle when dragging E edge', () => {
    const circleObj: BoardObject = {
      id: 'c1',
      object_type: 'circle',
      props: { x: 200, y: 150, r: 50 },
      created_at: 0,
      updated_at: 0,
    };
    const cBbox = { x: 150, y: 100, w: 100, h: 100 };
    const next = computeResizedProps(circleObj, 'e', cBbox, circleObj.props, { x: 310, y: 150 });
    expect(next.r).toBe(80);
  });
});
