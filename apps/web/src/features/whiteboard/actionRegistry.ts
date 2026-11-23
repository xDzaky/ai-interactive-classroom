/**
 * actionRegistry.ts — Whiteboard Action Registry (P11-T01, P12-T02)
 * Central registry of actions applicable to whiteboard objects and selections.
 * Powers Right-Click Context Menu, Floating Selection Toolbar, Radial Menu, and Shortcuts.
 */

import type { BoardObject, BoardStroke, WhiteboardEvent, SceneState, BoardState } from '@ai-classroom/whiteboard-core';
import type { Input2DShape } from '@/lib/shapeToSolid';

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
 * Checks if the primary selected object is a 2D shape convertible to 3D.
 */
export function is2DConvertible(ctx: ActionContext): boolean {
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
    id: 'convert_3d',
    label: 'Ubah ke Bangun Ruang 3D',
    icon: '📦',
    category: 'math',
    shortcut: '3D',
    appliesTo: (ctx) => is2DConvertible(ctx),
    run: (ctx) => {
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
