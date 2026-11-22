/**
 * actionRegistry.test.ts
 * Tests for Whiteboard Action Registry.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  resolveActions,
  is2DConvertible,
  getPrimarySelected,
  type ActionContext,
} from './actionRegistry';
import type { SceneState, BoardState, BoardObject } from '@ai-classroom/whiteboard-core';

function mockContext(overrides: Partial<ActionContext> = {}): ActionContext {
  const scene: SceneState = {
    id: 'main',
    objects: {},
    strokes: {},
    order: [],
  };
  const boardState: BoardState = {
    room_id: 'test-room',
    scenes: { main: scene },
    active_scene_id: 'main',
    last_seq: 1,
  };

  return {
    selectedIds: [],
    scene,
    boardState,
    roomId: 'test-room',
    actorId: 'user-1',
    onEvent: vi.fn(),
    onOpenConvert3D: vi.fn(),
    onOpenAiExplain: vi.fn(),
    onClearSelection: vi.fn(),
    ...overrides,
  };
}

describe('actionRegistry', () => {
  it('returns empty actions when nothing is selected', () => {
    const ctx = mockContext();
    const actions = resolveActions(ctx);
    expect(actions).toHaveLength(0);
  });

  it('detects 2D convertible objects (rect, circle, triangle, ellipse)', () => {
    const rectObj: BoardObject = {
      id: 'rect-1',
      object_type: 'rect',
      props: { x: 0, y: 0, w: 100, h: 100 },
      created_at: 1,
      updated_at: 1,
    };
    const ctx = mockContext({
      selectedIds: ['rect-1'],
      scene: {
        id: 'main',
        objects: { 'rect-1': rectObj },
        strokes: {},
        order: ['rect-1'],
      },
    });

    expect(is2DConvertible(ctx)).toBe(true);
    const actions = resolveActions(ctx);
    const convertAction = actions.find((a) => a.id === 'convert_3d');
    expect(convertAction).toBeDefined();

    convertAction?.run(ctx);
    expect(ctx.onOpenConvert3D).toHaveBeenCalledWith({
      id: 'rect-1',
      object_type: 'rect',
      props: { x: 0, y: 0, w: 100, h: 100 },
    });
  });

  it('provides AI explain action for single selected object', () => {
    const solidObj: BoardObject = {
      id: 'cube-1',
      object_type: 'viz_solid',
      props: { solidType: 'cube' },
      created_at: 1,
      updated_at: 1,
    };
    const ctx = mockContext({
      selectedIds: ['cube-1'],
      scene: {
        id: 'main',
        objects: { 'cube-1': solidObj },
        strokes: {},
        order: ['cube-1'],
      },
    });

    const actions = resolveActions(ctx);
    const explainAction = actions.find((a) => a.id === 'explain_ai');
    expect(explainAction).toBeDefined();

    explainAction?.run(ctx);
    expect(ctx.onOpenAiExplain).toHaveBeenCalledWith(solidObj);
  });

  it('duplicates selected objects with offset', () => {
    const rectObj: BoardObject = {
      id: 'rect-1',
      object_type: 'rect',
      props: { x: 10, y: 20, w: 50, h: 50 },
      created_at: 1,
      updated_at: 1,
    };
    const ctx = mockContext({
      selectedIds: ['rect-1'],
      scene: {
        id: 'main',
        objects: { 'rect-1': rectObj },
        strokes: {},
        order: ['rect-1'],
      },
    });

    const actions = resolveActions(ctx);
    const dupAction = actions.find((a) => a.id === 'duplicate');
    expect(dupAction).toBeDefined();

    dupAction?.run(ctx);
    expect(ctx.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'object.created',
        payload: expect.objectContaining({
          object_type: 'rect',
          props: expect.objectContaining({ x: 35, y: 45 }),
        }),
      })
    );
  });

  it('deletes selected objects and clears selection', () => {
    const ctx = mockContext({
      selectedIds: ['obj-1'],
      scene: {
        id: 'main',
        objects: {
          'obj-1': { id: 'obj-1', object_type: 'rect', props: {}, created_at: 1, updated_at: 1 },
        },
        strokes: {},
        order: ['obj-1'],
      },
    });

    const actions = resolveActions(ctx);
    const delAction = actions.find((a) => a.id === 'delete');
    expect(delAction).toBeDefined();

    delAction?.run(ctx);
    expect(ctx.onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'object.deleted',
        payload: { id: 'obj-1' },
      })
    );
    expect(ctx.onClearSelection).toHaveBeenCalled();
  });
});
