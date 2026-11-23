/**
 * @ai-classroom/whiteboard-core — reducer
 * Pure state reducer for whiteboard events + undo/redo history.
 * No side effects. No DOM. Fully unit-testable.
 */
import type {
  BoardState,
  BoardObject,
  BoardStroke,
  SceneState,
  WhiteboardEvent,
} from "./index.js";

// ---------------------------------------------------------------------------
// Inverse event system (for undo)
// ---------------------------------------------------------------------------

export type InverseEvent =
  | { type: "remove_stroke"; id: string }
  | { type: "restore_stroke"; stroke: BoardStroke }
  | { type: "remove_object"; id: string }
  | { type: "restore_object"; object: BoardObject }
  | { type: "restore_object_props"; id: string; props: Record<string, unknown> }
  | { type: "restore_transform"; id: string; x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  | { type: "restore_scene"; scene_id: string }
  | { type: "batch"; inverses: InverseEvent[] }
  | { type: "noop" };

// ---------------------------------------------------------------------------
// History state
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  event: WhiteboardEvent;
  inverse: InverseEvent;
}

export interface WhiteboardHistory {
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Max undo stack depth */
  maxDepth: number;
}

export function createHistory(maxDepth = 100): WhiteboardHistory {
  return { past: [], future: [], maxDepth };
}

// ---------------------------------------------------------------------------
// Apply a single event to board state → returns [newState, inverseEvent]
// ---------------------------------------------------------------------------

export function applyEvent(
  state: BoardState,
  event: WhiteboardEvent
): [BoardState, InverseEvent] {
  const scene = state.scenes[state.active_scene_id];

  switch (event.event_type) {
    case "stroke.committed": {
      const p = event.payload as {
        id: string;
        points: [number, number, number][];
        color: string;
        width: number;
        tool: string;
      };
      const stroke: BoardStroke = {
        id: p.id,
        points: p.points,
        color: p.color,
        width: p.width,
        tool: p.tool as BoardStroke["tool"],
      };
      const newScene: SceneState = {
        ...scene,
        strokes: { ...scene.strokes, [stroke.id]: stroke },
        order: [...scene.order, stroke.id],
      };
      return [
        replaceScene(state, newScene),
        { type: "remove_stroke", id: stroke.id },
      ];
    }

    case "object.created": {
      const p = event.payload as {
        id: string;
        object_type: string;
        props: Record<string, unknown>;
      };
      const now = Date.now();
      const obj: BoardObject = {
        id: p.id,
        object_type: p.object_type as BoardObject["object_type"],
        props: p.props,
        created_at: now,
        updated_at: now,
      };
      const newScene: SceneState = {
        ...scene,
        objects: { ...scene.objects, [obj.id]: obj },
        order: [...scene.order, obj.id],
      };
      return [
        replaceScene(state, newScene),
        { type: "remove_object", id: obj.id },
      ];
    }

    case "object.updated": {
      const p = event.payload as { id: string; props_patch: Record<string, unknown> };
      const existing = scene.objects[p.id];
      if (!existing) {
        // Also support updating selected freehand strokes (color or translated points)
        const existingStroke = scene.strokes[p.id];
        if (!existingStroke) return [state, { type: "noop" }];
        const nextStroke: BoardStroke = {
          ...existingStroke,
          ...(typeof p.props_patch.color === "string" ? { color: p.props_patch.color } : {}),
          ...(Array.isArray(p.props_patch.points)
            ? { points: p.props_patch.points as [number, number, number][] }
            : {}),
        };
        return [
          replaceScene(state, {
            ...scene,
            strokes: { ...scene.strokes, [nextStroke.id]: nextStroke },
          }),
          { type: "restore_stroke", stroke: existingStroke },
        ];
      }
      const oldProps = existing.props;

      // Cleanly merge props, with one-level merge for nested display settings (P11-T07)
      const mergedProps: Record<string, unknown> = { ...existing.props };
      for (const [key, val] of Object.entries(p.props_patch)) {
        if (
          key === "display" &&
          typeof val === "object" &&
          val !== null &&
          typeof mergedProps.display === "object" &&
          mergedProps.display !== null
        ) {
          mergedProps.display = { ...(mergedProps.display as Record<string, unknown>), ...(val as Record<string, unknown>) };
        } else {
          mergedProps[key] = val;
        }
      }

      const updated: BoardObject = {
        ...existing,
        props: mergedProps,
        updated_at: Date.now(),
      };
      const newScene: SceneState = {
        ...scene,
        objects: { ...scene.objects, [updated.id]: updated },
      };
      return [
        replaceScene(state, newScene),
        { type: "restore_object_props", id: p.id, props: oldProps },
      ];
    }

    case "object.deleted": {
      const p = event.payload as { id: string };
      const existingObj = scene.objects[p.id];
      if (existingObj) {
        const { [p.id]: _removed, ...restObjects } = scene.objects;
        return [
          replaceScene(state, {
            ...scene,
            objects: restObjects,
            order: scene.order.filter((id) => id !== p.id),
          }),
          { type: "restore_object", object: existingObj },
        ];
      }
      const existingStroke = scene.strokes[p.id];
      if (existingStroke) {
        const { [p.id]: _removed, ...restStrokes } = scene.strokes;
        return [
          replaceScene(state, {
            ...scene,
            strokes: restStrokes,
            order: scene.order.filter((id) => id !== p.id),
          }),
          { type: "restore_stroke", stroke: existingStroke },
        ];
      }
      return [state, { type: "noop" }];
    }

    case "object.transform": {
      const p = event.payload as {
        id: string; x: number; y: number;
        rotation: number; scaleX: number; scaleY: number;
      };
      const existing = scene.objects[p.id];
      if (!existing) return [state, { type: "noop" }];
      const oldProps = existing.props as {
        x?: number; y?: number; rotation?: number; scaleX?: number; scaleY?: number;
      };
      const updated: BoardObject = {
        ...existing,
        props: { ...existing.props, x: p.x, y: p.y, rotation: p.rotation, scaleX: p.scaleX, scaleY: p.scaleY },
        updated_at: Date.now(),
      };
      return [
        replaceScene(state, { ...scene, objects: { ...scene.objects, [updated.id]: updated } }),
        {
          type: "restore_transform",
          id: p.id,
          x: (oldProps.x ?? 0),
          y: (oldProps.y ?? 0),
          rotation: (oldProps.rotation ?? 0),
          scaleX: (oldProps.scaleX ?? 1),
          scaleY: (oldProps.scaleY ?? 1),
        },
      ];
    }

    case "scene.changed": {
      const p = event.payload as { scene_id: string };
      const prevSceneId = state.active_scene_id;
      if (!state.scenes[p.scene_id]) return [state, { type: "noop" }];
      return [
        { ...state, active_scene_id: p.scene_id },
        { type: "restore_scene", scene_id: prevSceneId },
      ];
    }

    // All viz/annotation events: treat as object.created/updated/deleted internally
    case "viz.solid.created":
    case "viz.graph.created":
    case "annotation.created": {
      const p = event.payload as { id: string; [k: string]: unknown };
      const now = Date.now();
      const obj: BoardObject = {
        id: p.id,
        object_type: event.event_type === "viz.solid.created"
          ? "viz_solid"
          : event.event_type === "viz.graph.created"
            ? "viz_graph"
            : "annotation",
        props: p,
        created_at: now,
        updated_at: now,
      };
      const newScene: SceneState = {
        ...scene,
        objects: { ...scene.objects, [obj.id]: obj },
        order: [...scene.order, obj.id],
      };
      return [
        replaceScene(state, newScene),
        { type: "remove_object", id: obj.id },
      ];
    }

    case "viz.solid.updated":
    case "viz.graph.updated": {
      const p = event.payload as { id: string; [k: string]: unknown };
      const existing = scene.objects[p.id];
      if (!existing) return [state, { type: "noop" }];
      const updated: BoardObject = {
        ...existing,
        props: { ...existing.props, ...p },
        updated_at: Date.now(),
      };
      return [
        replaceScene(state, { ...scene, objects: { ...scene.objects, [updated.id]: updated } }),
        { type: "restore_object_props", id: p.id, props: existing.props },
      ];
    }

    case "annotation.deleted": {
      const p = event.payload as { id: string };
      const existing = scene.objects[p.id];
      if (!existing) return [state, { type: "noop" }];
      const { [p.id]: _r, ...rest } = scene.objects;
      return [
        replaceScene(state, {
          ...scene,
          objects: rest,
          order: scene.order.filter((id) => id !== p.id),
        }),
        { type: "restore_object", object: existing },
      ];
    }

    case "batch": {
      const p = event.payload as { events?: WhiteboardEvent[] };
      const subEvents = Array.isArray(p.events) ? p.events : [];
      let current = state;
      const inverses: InverseEvent[] = [];
      for (const sub of subEvents) {
        const [next, inv] = applyEvent(current, sub);
        current = next;
        inverses.push(inv);
      }
      return [current, { type: "batch", inverses }];
    }

    // Ephemeral events — no state change
    case "device.pointer.moved":
    case "device.action":
      return [state, { type: "noop" }];

    default:
      return [state, { type: "noop" }];
  }
}

// ---------------------------------------------------------------------------
// Apply inverse event (undo a previous action)
// ---------------------------------------------------------------------------

export function applyInverse(state: BoardState, inv: InverseEvent): BoardState {
  const scene = state.scenes[state.active_scene_id];

  switch (inv.type) {
    case "remove_stroke": {
      const { [inv.id]: _removed, ...restStrokes } = scene.strokes;
      return replaceScene(state, {
        ...scene,
        strokes: restStrokes,
        order: scene.order.filter((id) => id !== inv.id),
      });
    }
    case "restore_stroke": {
      return replaceScene(state, {
        ...scene,
        strokes: { ...scene.strokes, [inv.stroke.id]: inv.stroke },
        order: scene.order.includes(inv.stroke.id)
          ? scene.order
          : [...scene.order, inv.stroke.id],
      });
    }
    case "batch": {
      let current = state;
      for (let i = inv.inverses.length - 1; i >= 0; i--) {
        current = applyInverse(current, inv.inverses[i]);
      }
      return current;
    }
    case "remove_object": {
      const { [inv.id]: _removed, ...restObjects } = scene.objects;
      return replaceScene(state, {
        ...scene,
        objects: restObjects,
        order: scene.order.filter((id) => id !== inv.id),
      });
    }
    case "restore_object": {
      return replaceScene(state, {
        ...scene,
        objects: { ...scene.objects, [inv.object.id]: inv.object },
        order: scene.order.includes(inv.object.id)
          ? scene.order
          : [...scene.order, inv.object.id],
      });
    }
    case "restore_object_props": {
      const existing = scene.objects[inv.id];
      if (!existing) return state;
      return replaceScene(state, {
        ...scene,
        objects: {
          ...scene.objects,
          [inv.id]: { ...existing, props: inv.props },
        },
      });
    }
    case "restore_transform": {
      const existing = scene.objects[inv.id];
      if (!existing) return state;
      return replaceScene(state, {
        ...scene,
        objects: {
          ...scene.objects,
          [inv.id]: {
            ...existing,
            props: {
              ...existing.props,
              x: inv.x, y: inv.y,
              rotation: inv.rotation,
              scaleX: inv.scaleX, scaleY: inv.scaleY,
            },
          },
        },
      });
    }
    case "restore_scene":
      return { ...state, active_scene_id: inv.scene_id };
    case "noop":
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Undo / Redo
// ---------------------------------------------------------------------------

export interface HistoryResult {
  state: BoardState;
  history: WhiteboardHistory;
}

/** Push an applied event onto the undo stack */
export function pushHistory(
  state: BoardState,
  history: WhiteboardHistory,
  event: WhiteboardEvent
): HistoryResult {
  const [newState, inverse] = applyEvent(state, event);
  const entry: HistoryEntry = { event, inverse };
  const past = [...history.past, entry].slice(-history.maxDepth);
  return {
    state: { ...newState, last_seq: newState.last_seq + 1 },
    history: { ...history, past, future: [] },
  };
}

/** Undo last action */
export function undo(state: BoardState, history: WhiteboardHistory): HistoryResult {
  if (history.past.length === 0) return { state, history };
  const past = [...history.past];
  const entry = past.pop()!;
  const newState = applyInverse(state, entry.inverse);
  return {
    state: newState,
    history: { ...history, past, future: [entry, ...history.future] },
  };
}

/** Redo last undone action */
export function redo(state: BoardState, history: WhiteboardHistory): HistoryResult {
  if (history.future.length === 0) return { state, history };
  const future = [...history.future];
  const entry = future.shift()!;
  const [newState] = applyEvent(state, entry.event);
  return {
    state: newState,
    history: { ...history, past: [...history.past, entry], future },
  };
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function replaceScene(state: BoardState, scene: SceneState): BoardState {
  return {
    ...state,
    scenes: { ...state.scenes, [scene.id]: scene },
  };
}
