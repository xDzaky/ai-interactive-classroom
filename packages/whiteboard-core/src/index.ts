/**
 * @ai-classroom/whiteboard-core
 * Board state types, Zod schemas, and whiteboard event definitions.
 * Pure functions — no DOM, no React, no network.
 * See CONTRACTS.md for event_type list.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Re-exports from shared-types (avoid duplication)
// ---------------------------------------------------------------------------
export type {
  RoomEvent,
  StrokeCommittedPayload,
  ObjectCreatedPayload,
} from "@ai-classroom/shared-types";

// ---------------------------------------------------------------------------
// Zod Schemas — board object types
// ---------------------------------------------------------------------------

export const BoardStrokeSchema = z.object({
  id: z.string(),
  /** Array of [x, y, pressure] tuples */
  points: z.array(z.tuple([z.number(), z.number(), z.number()])),
  color: z.string(),
  width: z.number().positive(),
  tool: z.enum(["pen", "highlighter", "eraser"]),
});
export type BoardStroke = z.infer<typeof BoardStrokeSchema>;

export const BoardObjectSchema = z.object({
  id: z.string(),
  object_type: z.enum([
    "rect",
    "circle",
    "triangle",
    "line",
    "arrow",
    "text",
    "image",
    "viz_solid",
    "viz_graph",
    "annotation",
  ]),
  props: z.record(z.unknown()),
  created_at: z.number(),
  updated_at: z.number(),
});
export type BoardObject = z.infer<typeof BoardObjectSchema>;

export const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  scaleX: z.number().default(1),
  scaleY: z.number().default(1),
});
export type Transform = z.infer<typeof TransformSchema>;

// ---------------------------------------------------------------------------
// Scene and Board state
// ---------------------------------------------------------------------------

export const SceneStateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  objects: z.record(BoardObjectSchema),
  strokes: z.record(BoardStrokeSchema),
  /** z-order list of all object/stroke ids */
  order: z.array(z.string()),
});
export type SceneState = z.infer<typeof SceneStateSchema>;

export const BoardStateSchema = z.object({
  room_id: z.string(),
  scenes: z.record(SceneStateSchema),
  active_scene_id: z.string(),
  last_seq: z.number().int().nonnegative(),
});
export type BoardState = z.infer<typeof BoardStateSchema>;

// ---------------------------------------------------------------------------
// Whiteboard event payloads (match CONTRACTS.md event_type list exactly)
// ---------------------------------------------------------------------------

export const StrokeCommittedPayloadSchema = z.object({
  id: z.string(),
  points: z.array(z.tuple([z.number(), z.number(), z.number()])),
  color: z.string(),
  width: z.number(),
  tool: z.string(),
});

export const ObjectCreatedPayloadSchema = z.object({
  id: z.string(),
  object_type: z.string(),
  props: z.record(z.unknown()),
});

export const ObjectUpdatedPayloadSchema = z.object({
  id: z.string(),
  props_patch: z.record(z.unknown()),
});

export const ObjectDeletedPayloadSchema = z.object({
  id: z.string(),
});

export const ObjectTransformPayloadSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
});

export const SceneChangedPayloadSchema = z.object({
  scene_id: z.string(),
});

export const VizSolidCreatedPayloadSchema = z.object({
  id: z.string(),
  solid_type: z.string(),
  params: z.record(z.unknown()),
});

export const VizSolidUpdatedPayloadSchema = z.object({
  id: z.string(),
  params_patch: z.record(z.unknown()),
});

export const VizGraphCreatedPayloadSchema = z.object({
  id: z.string(),
  expressions: z.array(z.string()),
});

export const VizGraphUpdatedPayloadSchema = z.object({
  id: z.string(),
  expressions_patch: z.array(z.string()),
});

export const AnnotationCreatedPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  props: z.record(z.unknown()),
});

export const AnnotationDeletedPayloadSchema = z.object({
  id: z.string(),
});

export const DevicePointerMovedPayloadSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const DeviceActionPayloadSchema = z.object({
  action_type: z.string(),
  params: z.record(z.unknown()).optional(),
});

/** All known whiteboard event types from CONTRACTS.md */
export type WhiteboardEventType =
  | "stroke.committed"
  | "object.created"
  | "object.updated"
  | "object.deleted"
  | "object.transform"
  | "scene.changed"
  | "viz.solid.created"
  | "viz.solid.updated"
  | "viz.graph.created"
  | "viz.graph.updated"
  | "annotation.created"
  | "annotation.deleted"
  | "device.pointer.moved"
  | "device.action";

/** A whiteboard event as sent to POST /api/v1/rooms/{roomId}/events */
export interface WhiteboardEvent {
  event_type: WhiteboardEventType;
  payload: Record<string, unknown>;
  idempotency_key?: string;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function createInitialBoardState(room_id: string): BoardState {
  const scene_id = "scene-1";
  return {
    room_id,
    scenes: {
      [scene_id]: {
        id: scene_id,
        name: "Scene 1",
        objects: {},
        strokes: {},
        order: [],
      },
    },
    active_scene_id: scene_id,
    last_seq: 0,
  };
}

export function getActiveScene(state: BoardState): SceneState {
  return state.scenes[state.active_scene_id];
}

export function createScene(id: string, name?: string): SceneState {
  return { id, name: name ?? `Scene`, objects: {}, strokes: {}, order: [] };
}

export * from "./reducer.js";
