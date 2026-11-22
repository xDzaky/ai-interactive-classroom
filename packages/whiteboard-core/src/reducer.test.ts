/**
 * whiteboard-core reducer tests (P02-T02)
 * Tests: applyEvent, applyInverse, pushHistory, undo, redo
 */
import { describe, it, expect } from "vitest";
import {
  createHistory,
  applyEvent,
  applyInverse,
  pushHistory,
  undo,
  redo,
} from "./reducer.js";
import { createInitialBoardState } from "./index.js";
import type { WhiteboardEvent, BoardState } from "./index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeState(): BoardState {
  return createInitialBoardState("room-1");
}

function strokeEvent(id = "s1"): WhiteboardEvent {
  return {
    event_type: "stroke.committed",
    payload: {
      id,
      points: [[0, 0, 0.5], [10, 10, 0.8]],
      color: "#000000",
      width: 2,
      tool: "pen",
    },
  };
}

function objectCreatedEvent(id = "o1"): WhiteboardEvent {
  return {
    event_type: "object.created",
    payload: { id, object_type: "rect", props: { x: 10, y: 20, w: 100, h: 50 } },
  };
}

function objectUpdatedEvent(id = "o1"): WhiteboardEvent {
  return {
    event_type: "object.updated",
    payload: { id, props_patch: { w: 200 } },
  };
}

function objectDeletedEvent(id = "o1"): WhiteboardEvent {
  return {
    event_type: "object.deleted",
    payload: { id },
  };
}

function objectTransformEvent(id = "o1"): WhiteboardEvent {
  return {
    event_type: "object.transform",
    payload: { id, x: 50, y: 60, rotation: 45, scaleX: 2, scaleY: 2 },
  };
}

function sceneChangedEvent(to = "scene-2"): WhiteboardEvent {
  return {
    event_type: "scene.changed",
    payload: { scene_id: to },
  };
}

// ---------------------------------------------------------------------------
// applyEvent tests
// ---------------------------------------------------------------------------

describe("applyEvent — stroke.committed", () => {
  it("adds stroke to active scene", () => {
    const s = makeState();
    const [next, inv] = applyEvent(s, strokeEvent("s1"));
    const scene = next.scenes["scene-1"];
    expect(scene.strokes["s1"]).toBeDefined();
    expect(scene.strokes["s1"].color).toBe("#000000");
    expect(scene.order).toContain("s1");
    expect(inv).toEqual({ type: "remove_stroke", id: "s1" });
  });
});

describe("applyEvent — object.created", () => {
  it("adds object to active scene", () => {
    const s = makeState();
    const [next, inv] = applyEvent(s, objectCreatedEvent("o1"));
    const scene = next.scenes["scene-1"];
    expect(scene.objects["o1"]).toBeDefined();
    expect(scene.objects["o1"].object_type).toBe("rect");
    expect(scene.order).toContain("o1");
    expect(inv).toEqual({ type: "remove_object", id: "o1" });
  });
});

describe("applyEvent — object.updated", () => {
  it("patches object props", () => {
    let s = makeState();
    [s] = applyEvent(s, objectCreatedEvent("o1")) as [BoardState, unknown] as [BoardState, never];
    const [next, inv] = applyEvent(s, objectUpdatedEvent("o1"));
    const scene = next.scenes["scene-1"];
    expect((scene.objects["o1"].props as Record<string, unknown>).w).toBe(200);
    expect(inv.type).toBe("restore_object_props");
  });

  it("returns noop if object doesn't exist", () => {
    const s = makeState();
    const [next, inv] = applyEvent(s, objectUpdatedEvent("nonexistent"));
    expect(next).toBe(s);
    expect(inv.type).toBe("noop");
  });
});

describe("applyEvent — object.deleted", () => {
  it("removes object from scene", () => {
    let s = makeState();
    [s] = applyEvent(s, objectCreatedEvent("o1")) as [BoardState, unknown] as [BoardState, never];
    const [next, inv] = applyEvent(s, objectDeletedEvent("o1"));
    const scene = next.scenes["scene-1"];
    expect(scene.objects["o1"]).toBeUndefined();
    expect(scene.order).not.toContain("o1");
    expect(inv.type).toBe("restore_object");
  });
});

describe("applyEvent — object.transform", () => {
  it("updates transform props on object", () => {
    let s = makeState();
    [s] = applyEvent(s, objectCreatedEvent("o1")) as [BoardState, unknown] as [BoardState, never];
    const [next, inv] = applyEvent(s, objectTransformEvent("o1"));
    const props = next.scenes["scene-1"].objects["o1"].props as Record<string, unknown>;
    expect(props.x).toBe(50);
    expect(props.rotation).toBe(45);
    expect(inv.type).toBe("restore_transform");
  });
});

describe("applyEvent — scene.changed", () => {
  it("changes active scene", () => {
    // Add a second scene first
    const s: BoardState = {
      room_id: "room-1",
      active_scene_id: "scene-1",
      last_seq: 0,
      scenes: {
        "scene-1": { id: "scene-1", objects: {}, strokes: {}, order: [] },
        "scene-2": { id: "scene-2", objects: {}, strokes: {}, order: [] },
      },
    };
    const [next, inv] = applyEvent(s, sceneChangedEvent("scene-2"));
    expect(next.active_scene_id).toBe("scene-2");
    expect(inv).toEqual({ type: "restore_scene", scene_id: "scene-1" });
  });

  it("returns noop if scene doesn't exist", () => {
    const s = makeState();
    const [next, inv] = applyEvent(s, sceneChangedEvent("scene-999"));
    expect(next.active_scene_id).toBe("scene-1");
    expect(inv.type).toBe("noop");
  });
});

describe("applyEvent — viz.solid.created", () => {
  it("adds viz_solid object", () => {
    const s = makeState();
    const event: WhiteboardEvent = {
      event_type: "viz.solid.created",
      payload: { id: "v1", solid_type: "sphere", params: { r: 5 } },
    };
    const [next, inv] = applyEvent(s, event);
    const obj = next.scenes["scene-1"].objects["v1"];
    expect(obj).toBeDefined();
    expect(obj.object_type).toBe("viz_solid");
    expect(inv).toEqual({ type: "remove_object", id: "v1" });
  });
});

describe("applyEvent — annotation.created", () => {
  it("adds annotation object", () => {
    const s = makeState();
    const event: WhiteboardEvent = {
      event_type: "annotation.created",
      payload: { id: "a1", text: "hello", x: 0, y: 0 },
    };
    const [next, inv] = applyEvent(s, event);
    const obj = next.scenes["scene-1"].objects["a1"];
    expect(obj).toBeDefined();
    expect(obj.object_type).toBe("annotation");
    expect(inv.type).toBe("remove_object");
  });
});

describe("applyEvent — ephemeral events", () => {
  it("device.pointer.moved returns same state + noop", () => {
    const s = makeState();
    const event: WhiteboardEvent = {
      event_type: "device.pointer.moved",
      payload: { x: 100, y: 200, pressure: 0.5 },
    };
    const [next, inv] = applyEvent(s, event);
    expect(next).toBe(s);
    expect(inv.type).toBe("noop");
  });
});

// ---------------------------------------------------------------------------
// applyInverse tests
// ---------------------------------------------------------------------------

describe("applyInverse — round-trip", () => {
  it("stroke.committed → remove_stroke restores original state", () => {
    const s = makeState();
    const [next, inv] = applyEvent(s, strokeEvent("s1"));
    const restored = applyInverse(next, inv);
    expect(restored.scenes["scene-1"].strokes["s1"]).toBeUndefined();
    expect(restored.scenes["scene-1"].order).not.toContain("s1");
  });

  it("object.created → remove_object restores original state", () => {
    const s = makeState();
    const [next, inv] = applyEvent(s, objectCreatedEvent("o1"));
    const restored = applyInverse(next, inv);
    expect(restored.scenes["scene-1"].objects["o1"]).toBeUndefined();
  });

  it("object.deleted → restore_object puts it back", () => {
    let s = makeState();
    [s] = applyEvent(s, objectCreatedEvent("o1")) as [BoardState, unknown] as [BoardState, never];
    const [next, inv] = applyEvent(s, objectDeletedEvent("o1"));
    const restored = applyInverse(next, inv);
    expect(restored.scenes["scene-1"].objects["o1"]).toBeDefined();
  });

  it("object.updated → restore_object_props reverts props", () => {
    let s = makeState();
    [s] = applyEvent(s, objectCreatedEvent("o1")) as [BoardState, unknown] as [BoardState, never];
    const originalW = (s.scenes["scene-1"].objects["o1"].props as Record<string, unknown>).w;
    const [next, inv] = applyEvent(s, objectUpdatedEvent("o1"));
    const restored = applyInverse(next, inv);
    const props = restored.scenes["scene-1"].objects["o1"].props as Record<string, unknown>;
    expect(props.w).toBe(originalW);
  });
});

// ---------------------------------------------------------------------------
// pushHistory / undo / redo tests
// ---------------------------------------------------------------------------

describe("pushHistory + undo + redo", () => {
  it("pushHistory applies event and tracks past", () => {
    const s = makeState();
    const h = createHistory();
    const { state: next, history: h2 } = pushHistory(s, h, strokeEvent("s1"));
    expect(next.scenes["scene-1"].strokes["s1"]).toBeDefined();
    expect(h2.past).toHaveLength(1);
    expect(h2.future).toHaveLength(0);
    expect(next.last_seq).toBe(1);
  });

  it("undo reverses last event", () => {
    const s = makeState();
    const h = createHistory();
    const { state: s1, history: h1 } = pushHistory(s, h, strokeEvent("s1"));
    const { state: s2, history: h2 } = undo(s1, h1);
    expect(s2.scenes["scene-1"].strokes["s1"]).toBeUndefined();
    expect(h2.past).toHaveLength(0);
    expect(h2.future).toHaveLength(1);
  });

  it("redo re-applies undone event", () => {
    const s = makeState();
    const h = createHistory();
    const { state: s1, history: h1 } = pushHistory(s, h, strokeEvent("s1"));
    const { state: s2, history: h2 } = undo(s1, h1);
    const { state: s3, history: h3 } = redo(s2, h2);
    expect(s3.scenes["scene-1"].strokes["s1"]).toBeDefined();
    expect(h3.past).toHaveLength(1);
    expect(h3.future).toHaveLength(0);
  });

  it("undo on empty history returns same state", () => {
    const s = makeState();
    const h = createHistory();
    const { state: s2, history: h2 } = undo(s, h);
    expect(s2).toBe(s);
    expect(h2).toBe(h);
  });

  it("redo on empty future returns same state", () => {
    const s = makeState();
    const h = createHistory();
    const { state: s2, history: h2 } = redo(s, h);
    expect(s2).toBe(s);
    expect(h2).toBe(h);
  });

  it("multi-step undo→redo round-trip is idempotent", () => {
    let s = makeState();
    let h = createHistory();
    ({ state: s, history: h } = pushHistory(s, h, strokeEvent("s1")));
    ({ state: s, history: h } = pushHistory(s, h, objectCreatedEvent("o1")));
    // snapshot after two events
    const snap = JSON.stringify(s);
    // undo twice, redo twice
    ({ state: s, history: h } = undo(s, h));
    ({ state: s, history: h } = undo(s, h));
    ({ state: s, history: h } = redo(s, h));
    ({ state: s, history: h } = redo(s, h));
    expect(JSON.stringify(s)).toBe(snap);
  });

  it("history maxDepth is respected", () => {
    let s = makeState();
    let h = createHistory(3);
    for (let i = 0; i < 5; i++) {
      ({ state: s, history: h } = pushHistory(s, h, strokeEvent(`s${i}`)));
    }
    expect(h.past.length).toBeLessThanOrEqual(3);
  });

  it("P11-T07: patches viz_solid display fields with one-level merge and supports undo", () => {
    let s = makeState();
    let h = createHistory();

    // 1. Create a viz_solid object with initial display settings
    const createEv: WhiteboardEvent = {
      event_type: "object.created",
      payload: {
        id: "solid-1",
        object_type: "viz_solid",
        props: {
          solid_type: "cube",
          params: { type: "cube", s: 5 },
          display: { labels: true, hiddenEdges: true, faces: true, faceOpacity: 0.18 },
        },
      },
    };
    ({ state: s, history: h } = pushHistory(s, h, createEv));

    // 2. Patch display with partial update { faceOpacity: 0.5 }
    const patchEv: WhiteboardEvent = {
      event_type: "object.updated",
      payload: {
        id: "solid-1",
        props_patch: {
          display: { faceOpacity: 0.5 },
          unfoldT: 0.25,
        },
      },
    };
    ({ state: s, history: h } = pushHistory(s, h, patchEv));

    // Verify one-level merge: faceOpacity updated, labels and hiddenEdges preserved
    const scene = s.scenes[s.active_scene_id];
    const solidObj = scene.objects["solid-1"];
    expect(solidObj).toBeDefined();
    const props = solidObj.props as any;
    expect(props.display.faceOpacity).toBe(0.5);
    expect(props.display.labels).toBe(true);
    expect(props.display.hiddenEdges).toBe(true);
    expect(props.unfoldT).toBe(0.25);

    // 3. Undo: restores previous props
    ({ state: s, history: h } = undo(s, h));
    const restoredObj = s.scenes[s.active_scene_id].objects["solid-1"];
    const restoredProps = restoredObj.props as any;
    expect(restoredProps.display.faceOpacity).toBe(0.18);
    expect(restoredProps.unfoldT).toBeUndefined();
  });
});
