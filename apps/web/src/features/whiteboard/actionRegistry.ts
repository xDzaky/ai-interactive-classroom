/**
 * actionRegistry.ts — Whiteboard Action Registry (P11-T01, P12-T02)
 * Central registry of actions applicable to whiteboard objects and selections.
 * Powers Right-Click Context Menu, Floating Selection Toolbar, Radial Menu, and Shortcuts.
 */

import type { BoardObject, BoardStroke, WhiteboardEvent, SceneState, BoardState } from '@ai-classroom/whiteboard-core';
import type { Input2DShape } from '@/lib/shapeToSolid';
import {
  canMergeSelectionToShape,
  mergeSelectionTo2DShape,
  canUngroupSelection,
  ungroupSelectedObject,
  canSplitRegions,
  splitObjectIntoRegions,
} from '@/lib/mergeStrokesToShape';

export type ActionCategory = 'math' | 'ai' | 'edit' | 'arrange' | 'style';

export interface ActionItem {
  id: string;
  label: string;
  icon: string;
  category: ActionCategory;
  shortcut?: string;
  appliesTo: (ctx: ActionContext) => boolean;
  run: (ctx: ActionContext) => void;
}

export interface ActionContext {
  selectedIds: string[];
  scene: SceneState;
  boardState: BoardState;
  roomId: string;
  actorId: string;
  nextSeq?: () => number;
  onEvent: (event: WhiteboardEvent) => void;
  onOpenConvert3D?: (shape: Input2DShape) => void;
  onOpenAiExplain?: (target: BoardObject | BoardStroke) => void;
  onClearSelection?: () => void;
  onSelectIds?: (ids: string[]) => void;
}

/**
 * Returns the primary selected object or stroke, if any.
 */
export function getPrimarySelected(ctx: ActionContext): BoardObject | BoardStroke | null {
  if (ctx.selectedIds.length === 0) return null;
  const id = ctx.selectedIds[0];
  return ctx.scene.objects[id] || ctx.scene.strokes[id] || null;
}

/**
 * Checks if the selection is a 2D shape OR broken strokes/lines convertible to a 2D/3D shape.
 */
export function is2DConvertible(ctx: ActionContext): boolean {
  if (canMergeSelectionToShape(ctx.selectedIds, ctx.scene)) return true;
  if (ctx.selectedIds.length !== 1) return false;
  const id = ctx.selectedIds[0];
  const obj = ctx.scene.objects[id];
  if (!obj) return false;
  if (Array.isArray((obj.props as Record<string, unknown>).customPoints)) return true;
  return [
    'rect',
    'circle',
    'triangle',
    'ellipse',
    'rhombus',
    'trapezoid',
    'parallelogram',
    'kite',
    'pentagon',
    'hexagon',
    'polygon',
    'star',
  ].includes(obj.object_type);
}

export const WHITEBOARD_ACTIONS: ActionItem[] = [
  {
    id: 'merge_to_2d',
    label: 'Gabung Objek',
    icon: '🔗',
    category: 'math',
    shortcut: 'G',
    appliesTo: (ctx) => canMergeSelectionToShape(ctx.selectedIds, ctx.scene),
    run: (ctx) => {
      const merged = mergeSelectionTo2DShape(ctx.selectedIds, ctx.scene);
      if (!merged) return;
      const newId = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const events: WhiteboardEvent[] = [
        ...merged.sourceIds.map((sid) => ({
          event_type: 'object.deleted' as const,
          payload: { id: sid },
        })),
        {
          event_type: 'object.created' as const,
          payload: {
            id: newId,
            object_type: merged.objectType,
            props: merged.props,
          },
        },
      ];
      ctx.onEvent({ event_type: 'batch', payload: { events } });
      ctx.onSelectIds?.([newId]);
    },
  },
  {
    id: 'ungroup_2d',
    label: 'Pisah Grup',
    icon: '✂️',
    category: 'edit',
    shortcut: 'Shift+G',
    appliesTo: (ctx) => canUngroupSelection(ctx.selectedIds, ctx.scene),
    run: (ctx) => {
      const res = ungroupSelectedObject(ctx.selectedIds, ctx.scene);
      if (!res) return;
      ctx.onEvent({ event_type: 'batch', payload: { events: res.events } });
      ctx.onSelectIds?.(res.newIds);
    },
  },
  {
    id: 'split_regions',
    label: 'Pecah Potongan',
    icon: '🍰',
    category: 'edit',
    shortcut: 'P',
    appliesTo: (ctx) => canSplitRegions(ctx.selectedIds, ctx.scene),
    run: (ctx) => {
      const res = splitObjectIntoRegions(ctx.selectedIds, ctx.scene);
      if (!res) return;
      ctx.onEvent({ event_type: 'batch', payload: { events: res.events } });
      ctx.onSelectIds?.(res.newIds);
    },
  },
  {
    id: 'convert_3d',
    label: 'Ubah ke Bangun Ruang 3D',
    icon: '📦',
    category: 'math',
    shortcut: '3D',
    appliesTo: (ctx) => is2DConvertible(ctx),
    run: (ctx) => {
      if (canMergeSelectionToShape(ctx.selectedIds, ctx.scene)) {
        const merged = mergeSelectionTo2DShape(ctx.selectedIds, ctx.scene);
        if (!merged) return;
        const newId = `shape-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        const events: WhiteboardEvent[] = [
          ...merged.sourceIds.map((sid) => ({
            event_type: 'object.deleted' as const,
            payload: { id: sid },
          })),
          {
            event_type: 'object.created' as const,
            payload: {
              id: newId,
              object_type: merged.objectType,
              props: merged.props,
            },
          },
        ];
        ctx.onEvent({ event_type: 'batch', payload: { events } });
        ctx.onSelectIds?.([newId]);
        ctx.onOpenConvert3D?.({
          id: newId,
          object_type: merged.objectType,
          props: merged.props,
        });
        return;
      }
      const obj = ctx.scene.objects[ctx.selectedIds[0]];
      if (obj && ctx.onOpenConvert3D) {
        ctx.onOpenConvert3D({
          id: obj.id,
          object_type: obj.object_type,
          props: obj.props as Record<string, unknown>,
        });
      }
    },
  },
  {
    id: 'explain_ai',
    label: 'Jelaskan Objek dengan AI',
    icon: '🤖',
    category: 'ai',
    shortcut: 'AI',
    appliesTo: (ctx) => ctx.selectedIds.length === 1,
    run: (ctx) => {
      const item = getPrimarySelected(ctx);
      if (item && ctx.onOpenAiExplain) {
        ctx.onOpenAiExplain(item);
      }
    },
  },
  {
    id: 'duplicate',
    label: 'Duplikat',
    icon: '📋',
    category: 'edit',
    shortcut: 'Ctrl+D',
    appliesTo: (ctx) => ctx.selectedIds.length > 0,
    run: (ctx) => {
      const offset = 25;
      for (const id of ctx.selectedIds) {
        const obj = ctx.scene.objects[id];
        if (obj) {
          const newId = `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const props = { ...(obj.props as Record<string, unknown>) };
          if (Array.isArray(props.multiSegments)) {
            props.multiSegments = (props.multiSegments as number[][]).map((seg) =>
              seg.map((v) => v + offset),
            );
          }
          if (Array.isArray(props.customPoints)) {
            props.customPoints = (props.customPoints as number[]).map((v) => v + offset);
          }
          if (typeof props.x === 'number') props.x += offset;
          if (typeof props.y === 'number') props.y += offset;
          if (typeof props.cx === 'number') props.cx += offset;
          if (typeof props.cy === 'number') props.cy += offset;
          if (typeof props.x1 === 'number') {
            props.x1 += offset;
            props.y1 = (props.y1 as number) + offset;
            props.x2 = (props.x2 as number) + offset;
            props.y2 = (props.y2 as number) + offset;
          }

          ctx.onEvent({
            event_type: 'object.created',
            payload: {
              id: newId,
              object_type: obj.object_type,
              props,
            },
          } as unknown as WhiteboardEvent);
        }

        const stroke = ctx.scene.strokes[id];
        if (stroke) {
          const newId = `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const newPoints = stroke.points.map(([x, y, p]) => [x + offset, y + offset, p] as [number, number, number]);

          ctx.onEvent({
            event_type: 'stroke.committed',
            payload: {
              id: newId,
              points: newPoints,
              color: stroke.color,
              width: stroke.width,
              tool: stroke.tool,
            },
          } as unknown as WhiteboardEvent);
        }
      }
    },
  },
  {
    id: 'delete',
    label: 'Hapus Objek',
    icon: '🗑️',
    category: 'edit',
    shortcut: 'Del',
    appliesTo: (ctx) => ctx.selectedIds.length > 0,
    run: (ctx) => {
      for (const id of ctx.selectedIds) {
        if (ctx.scene.objects[id]) {
          ctx.onEvent({
            event_type: 'object.deleted',
            payload: { id },
          } as unknown as WhiteboardEvent);
        } else if (ctx.scene.strokes[id]) {
          // Soft delete or object delete
          ctx.onEvent({
            event_type: 'object.deleted',
            payload: { id },
          } as unknown as WhiteboardEvent);
        }
      }
      if (ctx.onClearSelection) ctx.onClearSelection();
    },
  },
  {
    id: 'toggle_lock',
    label: 'Kunci / Buka Kunci',
    icon: '🔒',
    category: 'arrange',
    appliesTo: (ctx) => ctx.selectedIds.length > 0,
    run: (ctx) => {
      for (const id of ctx.selectedIds) {
        const obj = ctx.scene.objects[id];
        if (obj) {
          const isLocked = !!(obj.props as Record<string, unknown>).locked;
          ctx.onEvent({
            event_type: 'object.updated',
            payload: {
              id,
              props_patch: { locked: !isLocked },
            },
          } as unknown as WhiteboardEvent);
        }
      }
    },
  },
  {
    id: 'bring_to_front',
    label: 'Bawa ke Depan',
    icon: '⬆️',
    category: 'arrange',
    appliesTo: (ctx) => ctx.selectedIds.length > 0,
    run: (ctx) => {
      for (const id of ctx.selectedIds) {
        ctx.onEvent({
          event_type: 'object.updated',
          payload: {
            id,
            props_patch: { zIndex: 'top' },
          },
        } as unknown as WhiteboardEvent);
      }
    },
  },
  {
    id: 'send_to_back',
    label: 'Kirim ke Belakang',
    icon: '⬇️',
    category: 'arrange',
    appliesTo: (ctx) => ctx.selectedIds.length > 0,
    run: (ctx) => {
      for (const id of ctx.selectedIds) {
        ctx.onEvent({
          event_type: 'object.updated',
          payload: {
            id,
            props_patch: { zIndex: 'bottom' },
          },
        } as unknown as WhiteboardEvent);
      }
    },
  },
];

/**
 * Returns all actions applicable to the given selection context.
 */
export function resolveActions(ctx: ActionContext): ActionItem[] {
  return WHITEBOARD_ACTIONS.filter((action) => action.appliesTo(ctx));
}
