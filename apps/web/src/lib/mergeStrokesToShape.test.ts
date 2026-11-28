import { describe, expect, it } from 'vitest';
import type { SceneState } from '@ai-classroom/whiteboard-core';
import {
  canMergeSelectionToShape,
  mergeSelectionTo2DShape,
  canUngroupSelection,
  ungroupSelectedObject,
} from './mergeStrokesToShape';

describe('mergeStrokesToShape — Broken Multi-Stroke Sketch Merger', () => {
  it('merges 2 broken L-shaped pen strokes into a crisp Rectangle', () => {
    const scene: SceneState = {
      id: 's1',
      name: 'Scene 1',
      order: ['st1', 'st2'],
      objects: {},
      strokes: {
        // Top + Right L-stroke
        st1: {
          id: 'st1',
          points: [
            [100, 100, 0.5],
            [250, 102, 0.5],
            [400, 100, 0.5],
            [402, 180, 0.5],
            [400, 260, 0.5],
          ],
          color: '#0f172a',
          width: 3,
          tool: 'pen',
        },
        // Left + Bottom L-stroke
        st2: {
          id: 'st2',
          points: [
            [102, 104, 0.5],
            [100, 185, 0.5],
            [102, 260, 0.5],
            [250, 262, 0.5],
            [398, 258, 0.5],
          ],
          color: '#0f172a',
          width: 3,
          tool: 'pen',
        },
      },
    };

    expect(canMergeSelectionToShape(['st1', 'st2'], scene)).toBe(true);
    const merged = mergeSelectionTo2DShape(['st1', 'st2'], scene);
    expect(merged).not.toBeNull();
    expect(merged!.objectType).toBe('rect');
    expect(merged!.props.x).toBe(100);
    expect(merged!.props.y).toBe(100);
    expect(merged!.props.w).toBeGreaterThanOrEqual(298);
    expect(merged!.props.h).toBeGreaterThanOrEqual(158);
    expect(merged!.sourceIds).toEqual(['st1', 'st2']);
  });

  it('merges 3 separate line objects into a Triangle', () => {
    const scene: SceneState = {
      id: 's1',
      name: 'Scene 1',
      order: ['l1', 'l2', 'l3'],
      strokes: {},
      objects: {
        l1: { id: 'l1', object_type: 'line', props: { x1: 200, y1: 100, x2: 320, y2: 260, stroke: '#2563eb' }, created_at: 0, updated_at: 0 },
        l2: { id: 'l2', object_type: 'line', props: { x1: 320, y1: 260, x2: 80, y2: 260, stroke: '#2563eb' }, created_at: 0, updated_at: 0 },
        l3: { id: 'l3', object_type: 'line', props: { x1: 80, y1: 260, x2: 200, y2: 100, stroke: '#2563eb' }, created_at: 0, updated_at: 0 },
      },
    };

    expect(canMergeSelectionToShape(['l1', 'l2', 'l3'], scene)).toBe(true);
    const merged = mergeSelectionTo2DShape(['l1', 'l2', 'l3'], scene);
    expect(merged?.objectType).toBe('triangle');
  });

  it('merges 2 open lines (T-junction inside a shape) into multiSegments line — NOT a rectangle', () => {
    const scene: SceneState = {
      id: 's1',
      name: 'Scene 1',
      order: ['l1', 'l2'],
      strokes: {},
      objects: {
        l1: { id: 'l1', object_type: 'line', props: { x1: 200, y1: 100, x2: 200, y2: 260, stroke: '#0f172a', strokeWidth: 3 }, created_at: 0, updated_at: 0 },
        l2: { id: 'l2', object_type: 'line', props: { x1: 200, y1: 180, x2: 280, y2: 180, stroke: '#0f172a', strokeWidth: 3 }, created_at: 0, updated_at: 0 },
      },
    };

    expect(canMergeSelectionToShape(['l1', 'l2'], scene)).toBe(true);
    const merged = mergeSelectionTo2DShape(['l1', 'l2'], scene);
    expect(merged).not.toBeNull();
    expect(merged!.objectType).toBe('polygon');
    expect(Array.isArray(merged!.props.multiSegments)).toBe(true);
    expect((merged!.props.multiSegments as number[][]).length).toBe(2);
    expect(merged!.sourceIds).toEqual(['l1', 'l2']);
  });

  it('merges mixed 2D shapes + lines (rhombus + right-angle rect + 2 diagonals) into ONE unified object', () => {
    const scene: SceneState = {
      id: 's1',
      name: 'Scene 1',
      order: ['r1', 'sq1', 'd1', 'd2'],
      strokes: {},
      objects: {
        r1: { id: 'r1', object_type: 'rhombus', props: { cx: 300, cy: 300, rx: 110, ry: 110, stroke: '#0f172a', strokeWidth: 3 }, created_at: 0, updated_at: 0 },
        sq1: { id: 'sq1', object_type: 'rect', props: { x: 300, y: 280, w: 20, h: 20, stroke: '#0f172a', strokeWidth: 2 }, created_at: 0, updated_at: 0 },
        d1: { id: 'd1', object_type: 'line', props: { x1: 300, y1: 190, x2: 300, y2: 410, stroke: '#0f172a', strokeWidth: 2 }, created_at: 0, updated_at: 0 },
        d2: { id: 'd2', object_type: 'line', props: { x1: 190, y1: 300, x2: 410, y2: 300, stroke: '#0f172a', strokeWidth: 2 }, created_at: 0, updated_at: 0 },
      },
    };

    expect(canMergeSelectionToShape(['r1', 'sq1', 'd1', 'd2'], scene)).toBe(true);
    const merged = mergeSelectionTo2DShape(['r1', 'sq1', 'd1', 'd2'], scene);
    expect(merged).not.toBeNull();
    expect(merged!.objectType).toBe('polygon');
    expect(merged!.sourceIds).toEqual(['r1', 'sq1', 'd1', 'd2']);
    expect(Array.isArray(merged!.props.multiSegments)).toBe(true);
    expect((merged!.props.multiSegments as number[][]).length).toBe(4);
  });

  it('ungroups a moved composite object back into its 4 original shapes at the new coordinates', () => {
    const scene: SceneState = {
      id: 's1',
      name: 'Scene 1',
      order: ['r1', 'sq1', 'd1', 'd2'],
      strokes: {},
      objects: {
        r1: { id: 'r1', object_type: 'rhombus', props: { cx: 300, cy: 300, rx: 110, ry: 110, stroke: '#0f172a', strokeWidth: 3 }, created_at: 0, updated_at: 0 },
        sq1: { id: 'sq1', object_type: 'rect', props: { x: 300, y: 280, w: 20, h: 20, stroke: '#0f172a', strokeWidth: 2 }, created_at: 0, updated_at: 0 },
        d1: { id: 'd1', object_type: 'line', props: { x1: 300, y1: 190, x2: 300, y2: 410, stroke: '#0f172a', strokeWidth: 2 }, created_at: 0, updated_at: 0 },
        d2: { id: 'd2', object_type: 'line', props: { x1: 190, y1: 300, x2: 410, y2: 300, stroke: '#0f172a', strokeWidth: 2 }, created_at: 0, updated_at: 0 },
      },
    };

    const merged = mergeSelectionTo2DShape(['r1', 'sq1', 'd1', 'd2'], scene)!;
    // Simulate moving the grouped object by (+100, +50)
    const movedProps = {
      ...merged.props,
      x: Number(merged.props.x) + 100,
      y: Number(merged.props.y) + 50,
    };
    const groupedScene: SceneState = {
      id: 's1',
      name: 'Scene 1',
      order: ['grp1'],
      strokes: {},
      objects: {
        grp1: { id: 'grp1', object_type: merged.objectType, props: movedProps, created_at: 0, updated_at: 0 },
      },
    };

    expect(canUngroupSelection(['grp1'], groupedScene)).toBe(true);
    const ungrouped = ungroupSelectedObject(['grp1'], groupedScene);
    expect(ungrouped).not.toBeNull();
    expect(ungrouped!.newIds.length).toBe(4);
    expect(ungrouped!.events[0]).toEqual({ event_type: 'object.deleted', payload: { id: 'grp1' } });
    // First restored item is the rhombus moved by (+100, +50) -> cx: 400, cy: 350
    const createdRhombus = ungrouped!.events[1] as unknown as { payload: { object_type: string; props: { cx: number; cy: number } } };
    expect(createdRhombus.payload.object_type).toBe('rhombus');
    expect(createdRhombus.payload.props.cx).toBe(400);
    expect(createdRhombus.payload.props.cy).toBe(350);
  });

  it('preserves existing regionFills when merging an already-colored object with a new divider line', () => {
    // Rectangle split vertically: region 0 (left) = transparent, region 1 (right) = #93c5fd (blue)
    const scene: SceneState = {
      id: 's1',
      name: 'Scene 1',
      order: ['grp1', 'hLine'],
      strokes: {},
      objects: {
        grp1: {
          id: 'grp1',
          object_type: 'polygon',
          props: {
            multiSegments: [
              [100, 100, 300, 100, 300, 300, 100, 300, 100, 100],
              [200, 100, 200, 300],
            ],
            regionFills: { '1': '#93c5fd' },
            stroke: '#0f172a',
            strokeWidth: 2,
          },
          created_at: 0,
          updated_at: 0,
        },
        hLine: {
          id: 'hLine',
          object_type: 'line',
          props: { x1: 100, y1: 250, x2: 300, y2: 250, stroke: '#0f172a', strokeWidth: 2 },
          created_at: 0,
          updated_at: 0,
        },
      },
    };

    const merged = mergeSelectionTo2DShape(['grp1', 'hLine'], scene);
    expect(merged).not.toBeNull();
    const fills = merged!.props.regionFills as Record<string, string>;
    // 4 sub-regions: top-left(0), top-right(1), bottom-left(2), bottom-right(3)
    // Both right-hand regions (1 and 3) MUST preserve #93c5fd!
    expect(fills['0']).toBeUndefined();
    expect(fills['1']).toBe('#93c5fd');
    expect(fills['2']).toBeUndefined();
    expect(fills['3']).toBe('#93c5fd');
  });
});
