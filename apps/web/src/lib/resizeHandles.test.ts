import { describe, it, expect } from 'vitest';
import {
  getResizeHandles,
  getShapeHandles,
  findHitResizeHandle,
  computeResizedProps,
  insertVertexAtPoint,
} from './resizeHandles';
import type { BoardObject } from '@ai-classroom/whiteboard-core';

describe('resizeHandles (Shape-Matched Handles, Vertex Drag & Double-Click Insert)', () => {
  const bbox = { x: 100, y: 100, w: 200, h: 100 };

  it('returns 8 handle points for rect and detects corner hits', () => {
    const handles = getResizeHandles(bbox);
    expect(handles).toHaveLength(8);
    expect(findHitResizeHandle({ x: 300, y: 200 }, bbox, 1)).toBe('se');
    expect(findHitResizeHandle({ x: 100, y: 100 }, bbox, 1)).toBe('nw');
    expect(findHitResizeHandle({ x: 200, y: 150 }, bbox, 1)).toBeNull();
  });

  it('returns 3 vertex handles for a triangle and drags individual vertex', () => {
    const tri: BoardObject = {
      id: 't1',
      object_type: 'triangle',
      props: { x1: 150, y1: 100, x2: 100, y2: 200, x3: 200, y3: 200 },
      created_at: 0,
      updated_at: 0,
    };
    const handles = getShapeHandles(tri, { x: 100, y: 100, w: 100, h: 100 });
    expect(handles).toHaveLength(3);
    expect(handles[0]).toEqual({ kind: 'v:0', x: 150, y: 100 });

    const next = computeResizedProps(tri, 'v:0', { x: 100, y: 100, w: 100, h: 100 }, tri.props, { x: 160, y: 60 });
    expect(next.x1).toBe(160);
    expect(next.y1).toBe(60);
  });

  it('inserts a new draggable vertex when double-clicking a corner/edge', () => {
    const tri: BoardObject = {
      id: 't1',
      object_type: 'triangle',
      props: { x1: 150, y1: 100, x2: 100, y2: 200, x3: 200, y3: 200 },
      created_at: 0,
      updated_at: 0,
    };
    const patched = insertVertexAtPoint(tri, { x: 150, y: 200 });
    expect(patched).not.toBeNull();
    expect((patched!.customPoints as number[]).length).toBe(8); // 4 vertices now!
  });

  it('returns 4 cardinal handles for a circle and resizes radius smoothly', () => {
    const circleObj: BoardObject = {
      id: 'c1',
      object_type: 'circle',
      props: { x: 200, y: 150, r: 50 },
      created_at: 0,
      updated_at: 0,
    };
    const cBbox = { x: 150, y: 100, w: 100, h: 100 };
    expect(getShapeHandles(circleObj, cBbox)).toHaveLength(4);
    const next = computeResizedProps(circleObj, 'e', cBbox, circleObj.props, { x: 310, y: 150 });
    expect(next.r).toBe(80);
  });
});
