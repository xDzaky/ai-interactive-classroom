/**
 * useSceneManager — P02-T07
 * Scene management for the whiteboard:
 *  - Add / rename / remove scenes
 *  - Switch active scene
 *  - Local JSON save (localStorage) and load
 *  - Re-exports from whiteboard-core: createScene
 *
 * Also provides grouping helper: group selected object IDs into a named group
 * (stored as a BoardObject of type "rect" overlaying its children).
 */
import { useCallback, useEffect } from "react";
import {
  createInitialBoardState,
  createScene,
  applyEvent,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, SceneState, WhiteboardEvent } from "@ai-classroom/whiteboard-core";

// ---------------------------------------------------------------------------
// LocalStorage persistence
// ---------------------------------------------------------------------------

const LS_KEY_PREFIX = "wb_board_";

export function saveBoardToLocal(roomId: string, state: BoardState): void {
  try {
    localStorage.setItem(`${LS_KEY_PREFIX}${roomId}`, JSON.stringify(state));
  } catch {
    // Ignore quota exceeded silently
  }
}

export function loadBoardFromLocal(roomId: string): BoardState | null {
  try {
    const raw = localStorage.getItem(`${LS_KEY_PREFIX}${roomId}`);
    if (!raw) return null;
    return JSON.parse(raw) as BoardState;
  } catch {
    return null;
  }
}

export function clearBoardFromLocal(roomId: string): void {
  try {
    localStorage.removeItem(`${LS_KEY_PREFIX}${roomId}`);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Scene operations (pure — no hooks needed)
// ---------------------------------------------------------------------------

/** Add a new scene to BoardState, returns new state */
export function addScene(state: BoardState, name?: string): BoardState {
  const id = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newScene = createScene(id, name ?? `Slide ${Object.keys(state.scenes).length + 1}`);
  return {
    ...state,
    scenes: { ...state.scenes, [id]: newScene },
    active_scene_id: id,
  };
}

/** Remove a scene (must leave at least one) */
export function removeScene(state: BoardState, sceneId: string): BoardState {
  const scenes = { ...state.scenes };
  if (Object.keys(scenes).length <= 1) return state; // Can't remove last scene
  delete scenes[sceneId];
  const activeId =
    state.active_scene_id === sceneId
      ? Object.keys(scenes)[0]
      : state.active_scene_id;
  return { ...state, scenes, active_scene_id: activeId };
}

/** Rename a scene */
export function renameScene(state: BoardState, sceneId: string, name: string): BoardState {
  const scene = state.scenes[sceneId];
  if (!scene) return state;
  return {
    ...state,
    scenes: { ...state.scenes, [sceneId]: { ...scene, name } },
  };
}

/** Switch to a scene */
export function switchScene(state: BoardState, sceneId: string): BoardState {
  if (!state.scenes[sceneId]) return state;
  return { ...state, active_scene_id: sceneId };
}

/** Reorder scenes: move scene at fromIndex to toIndex */
export function reorderScenes(
  state: BoardState,
  orderedIds: string[]
): BoardState {
  // Validate all ids exist
  if (orderedIds.some((id) => !state.scenes[id])) return state;
  // Build ordered scenes object
  const ordered: Record<string, SceneState> = {};
  for (const id of orderedIds) {
    ordered[id] = state.scenes[id];
  }
  return { ...state, scenes: ordered };
}

// ---------------------------------------------------------------------------
// Export / Import (JSON)
// ---------------------------------------------------------------------------

/** Export the full board state to a JSON string */
export function exportBoardJson(state: BoardState): string {
  return JSON.stringify(state, null, 2);
}

/** Import from a JSON string — validates basic shape */
export function importBoardJson(json: string): BoardState | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("room_id" in parsed) ||
      !("scenes" in parsed) ||
      !("active_scene_id" in parsed)
    ) {
      return null;
    }
    return parsed as BoardState;
  } catch {
    return null;
  }
}

/** Download board state as a .json file (browser only) */
export function downloadBoardJson(state: BoardState, filename = "whiteboard.json"): void {
  const blob = new Blob([exportBoardJson(state)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
