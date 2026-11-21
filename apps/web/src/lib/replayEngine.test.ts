/**
 * replayEngine.test.ts — P07-T02
 * Unit tests for the pure-TS replay engine.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReplayEngine } from "./replayEngine";
import type { ReplayEvent } from "./replayEngine";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock snapshots API
vi.mock("@/lib/api/snapshots", () => ({
  getNearestSnapshot: vi.fn(),
}));

// Mock whiteboard-core
vi.mock("@ai-classroom/whiteboard-core", () => {
  const createInitialBoardState = (roomId: string) => ({
    roomId,
    objects: [],
    seq: 0,
  });

  // applyEvent returns [newState, inverseEvent]
  const applyEvent = (
    state: Record<string, unknown>,
    event: { event_type: string; payload: Record<string, unknown> },
  ): [Record<string, unknown>, unknown] => {
    // Accumulate seq from payload to simulate state change
    const nextSeq = ((state.seq as number) ?? 0) + 1;
    return [{ ...state, seq: nextSeq, lastEvent: event.event_type }, null];
  };

  return { createInitialBoardState, applyEvent };
});

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getNearestSnapshot } from "@/lib/api/snapshots";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(seq: number, type = "draw"): ReplayEvent {
  return {
    id: `evt-${seq}`,
    seq,
    event_type: type,
    payload: { x: seq },
    actor_id: "user-1",
    idempotency_key: `ikey-${seq}`,
    committed_at: new Date().toISOString(),
    ephemeral: false,
  };
}

function mockFetchEvents(events: ReplayEvent[]) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: events }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createReplayEngine", () => {
  const ROOM = "room-abc";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("seek() with no snapshot falls back to full replay from seq=0", async () => {
    (getNearestSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const events = [makeEvent(1), makeEvent(2), makeEvent(3)];
    mockFetchEvents(events);

    const engine = createReplayEngine(ROOM);
    const state = await engine.seek(3);

    // getNearestSnapshot called with targetSeq
    expect(getNearestSnapshot).toHaveBeenCalledWith(ROOM, 3);
    // fetch called with after=0 (snapshotSeq=0)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("after=0"),
      expect.any(Object),
    );
    // State should have seq advanced 3 times from initial
    expect(state).toMatchObject({ seq: 3 });
    expect(engine.getDuration()).toBe(3);
    expect(engine.getCursor()).toBe(2); // index 2 = 3rd event
  });

  it("seek() uses snapshot state as base and applies events after snapshot", async () => {
    const snapState = { roomId: ROOM, objects: ["obj-snap"], seq: 0 };
    (getNearestSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "snap-1",
      room_id: ROOM,
      seq_at: 10,
      state: snapState,
      created_at: new Date().toISOString(),
    });
    // Events after snapshot seq 10
    const events = [makeEvent(11), makeEvent(12), makeEvent(15)];
    mockFetchEvents(events);

    const engine = createReplayEngine(ROOM);
    const state = await engine.seek(12);

    // fetch called with after=10 (snapshotSeq)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("after=10"),
      expect.any(Object),
    );
    // cursor should be at index 1 (seq 12)
    expect(engine.getCursor()).toBe(1);
    // State seq advanced 2 times from snapshot base (which starts at seq:0)
    expect(state).toMatchObject({ seq: 2 });
    expect(engine.getDuration()).toBe(3);
  });

  it("step() advances cursor one event at a time", async () => {
    (getNearestSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const events = [makeEvent(1), makeEvent(2), makeEvent(3)];
    mockFetchEvents(events);

    const engine = createReplayEngine(ROOM);
    await engine.seek(1); // cursor at index 0

    const s2 = engine.step();
    expect(s2).not.toBeNull();
    expect(engine.getCursor()).toBe(1);

    const s3 = engine.step();
    expect(s3).not.toBeNull();
    expect(engine.getCursor()).toBe(2);
  });

  it("step() returns null when at end of events", async () => {
    (getNearestSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const events = [makeEvent(1), makeEvent(2)];
    mockFetchEvents(events);

    const engine = createReplayEngine(ROOM);
    await engine.seek(99); // seek beyond last event → cursor at last
    expect(engine.getCursor()).toBe(1);

    const result = engine.step();
    expect(result).toBeNull();
  });

  it("setSpeed() affects msPerStep", () => {
    const engine = createReplayEngine(ROOM);

    engine.setSpeed(1);
    expect(engine.msPerStep).toBe(100);

    engine.setSpeed(2);
    expect(engine.msPerStep).toBe(50);

    engine.setSpeed(4);
    expect(engine.msPerStep).toBe(25);
  });

  it("seek() beyond last event returns final state at last event", async () => {
    (getNearestSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const events = [makeEvent(5), makeEvent(10), makeEvent(20)];
    mockFetchEvents(events);

    const engine = createReplayEngine(ROOM);
    const state = await engine.seek(999); // beyond last event (seq 20)

    expect(engine.getCursor()).toBe(2); // at last event index
    expect(state).toMatchObject({ seq: 3 }); // 3 events applied
    expect(engine.step()).toBeNull(); // no more steps
  });

  it("ephemeral events are filtered out before replay", async () => {
    (getNearestSnapshot as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const events: ReplayEvent[] = [
      { ...makeEvent(1), ephemeral: false },
      { ...makeEvent(2), ephemeral: true }, // should be filtered
      { ...makeEvent(3), ephemeral: false },
    ];
    mockFetchEvents(events);

    const engine = createReplayEngine(ROOM);
    await engine.seek(99);

    // Only 2 non-ephemeral events
    expect(engine.getDuration()).toBe(2);
  });
});
