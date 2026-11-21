/**
 * @ai-classroom/whiteboard-core
 * Board state types, event reducer, and undo/redo history.
 * Pure functions — no DOM, no React, no network.
 */
export type { WhiteboardEventType, RoomEvent, StrokeCommittedPayload, ObjectCreatedPayload } from "@ai-classroom/shared-types";

// Board state types
export interface BoardObject {
  id: string;
  object_type: string;
  props: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface BoardStroke {
  id: string;
  points: [number, number, number][];
  color: string;
  width: number;
  tool: string;
}

export interface SceneState {
  id: string;
  objects: Record<string, BoardObject>;
  strokes: Record<string, BoardStroke>;
  order: string[]; // object/stroke ids in z-order
}

export interface BoardState {
  room_id: string;
  scenes: Record<string, SceneState>;
  active_scene_id: string;
  last_seq: number;
}

export function createInitialBoardState(room_id: string): BoardState {
  const scene_id = "scene-1";
  return {
    room_id,
    scenes: {
      [scene_id]: { id: scene_id, objects: {}, strokes: {}, order: [] },
    },
    active_scene_id: scene_id,
    last_seq: 0,
  };
}
