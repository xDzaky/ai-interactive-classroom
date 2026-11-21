/**
 * sceneManager.test.ts — P02-T07
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addScene,
  removeScene,
  renameScene,
  switchScene,
  reorderScenes,
  exportBoardJson,
  importBoardJson,
  saveBoardToLocal,
  loadBoardFromLocal,
  clearBoardFromLocal,
} from "./sceneManager";
import { createInitialBoardState } from "@ai-classroom/whiteboard-core";

const makeState = () => createInitialBoardState("room-1");

// ---------------------------------------------------------------------------
// addScene
// ---------------------------------------------------------------------------
describe("addScene", () => {
  it("adds a new scene and switches to it", () => {
    const s = makeState();
    const next = addScene(s, "Slide 2");
    const ids = Object.keys(next.scenes);
    expect(ids).toHaveLength(2);
    expect(next.scenes[next.active_scene_id].name).toBe("Slide 2");
  });

  it("auto-generates name if not given", () => {
    const s = makeState();
    const next = addScene(s);
    expect(next.scenes[next.active_scene_id].name).toMatch(/Slide/);
  });
});

// ---------------------------------------------------------------------------
// removeScene
// ---------------------------------------------------------------------------
describe("removeScene", () => {
  it("removes a non-active scene", () => {
    let s = makeState();
    s = addScene(s, "Slide 2");
    const idToRemove = Object.keys(s.scenes)[0]; // original scene-1
    const next = removeScene(s, idToRemove);
    expect(Object.keys(next.scenes)).toHaveLength(1);
    expect(next.scenes[idToRemove]).toBeUndefined();
  });

  it("switches active scene when removing the active one", () => {
    let s = makeState();
    s = addScene(s, "Slide 2");
    const activeId = s.active_scene_id;
    const next = removeScene(s, activeId);
    expect(next.active_scene_id).not.toBe(activeId);
  });

  it("refuses to remove last scene", () => {
    const s = makeState();
    const next = removeScene(s, s.active_scene_id);
    expect(Object.keys(next.scenes)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// renameScene
// ---------------------------------------------------------------------------
describe("renameScene", () => {
  it("renames a scene", () => {
    const s = makeState();
    const id = s.active_scene_id;
    const next = renameScene(s, id, "Pembuka");
    expect(next.scenes[id].name).toBe("Pembuka");
  });

  it("returns same state if scene not found", () => {
    const s = makeState();
    const next = renameScene(s, "nonexistent", "X");
    expect(next).toBe(s);
  });
});

// ---------------------------------------------------------------------------
// switchScene
// ---------------------------------------------------------------------------
describe("switchScene", () => {
  it("switches active scene", () => {
    let s = makeState();
    s = addScene(s, "S2");
    const ids = Object.keys(s.scenes);
    const other = ids.find((id) => id !== s.active_scene_id)!;
    const next = switchScene(s, other);
    expect(next.active_scene_id).toBe(other);
  });

  it("returns same state if scene not found", () => {
    const s = makeState();
    const next = switchScene(s, "nope");
    expect(next).toBe(s);
  });
});

// ---------------------------------------------------------------------------
// reorderScenes
// ---------------------------------------------------------------------------
describe("reorderScenes", () => {
  it("reorders scenes", () => {
    let s = makeState();
    s = addScene(s, "S2");
    const ids = Object.keys(s.scenes);
    const reversed = [...ids].reverse();
    const next = reorderScenes(s, reversed);
    expect(Object.keys(next.scenes)).toEqual(reversed);
  });

  it("ignores invalid ids", () => {
    const s = makeState();
    const next = reorderScenes(s, ["invalid-id"]);
    expect(next).toBe(s);
  });
});

// ---------------------------------------------------------------------------
// JSON export / import
// ---------------------------------------------------------------------------
describe("exportBoardJson / importBoardJson", () => {
  it("round-trips board state through JSON", () => {
    const s = makeState();
    const json = exportBoardJson(s);
    const parsed = importBoardJson(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.room_id).toBe("room-1");
    expect(parsed!.active_scene_id).toBe(s.active_scene_id);
  });

  it("importBoardJson returns null for invalid JSON", () => {
    expect(importBoardJson("not json")).toBeNull();
    expect(importBoardJson("{}"   )).toBeNull();
  });

  it("importBoardJson returns null for missing fields", () => {
    expect(importBoardJson('{"room_id":"x"}')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------
describe("saveBoardToLocal / loadBoardFromLocal / clearBoardFromLocal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads board state", () => {
    const s = makeState();
    saveBoardToLocal("room-1", s);
    const loaded = loadBoardFromLocal("room-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.room_id).toBe("room-1");
  });

  it("returns null for missing room", () => {
    expect(loadBoardFromLocal("room-999")).toBeNull();
  });

  it("clearBoardFromLocal removes the entry", () => {
    const s = makeState();
    saveBoardToLocal("room-1", s);
    clearBoardFromLocal("room-1");
    expect(loadBoardFromLocal("room-1")).toBeNull();
  });
});
