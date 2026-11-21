/**
 * syncEngine.test.ts — P04-T08
 * Tests for SyncEngine: ordering, gap fill, deduplication, optimistic apply.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SyncEngine, type BroadcastPayload } from "@/lib/syncEngine";

// ── Mock whiteboard-core ──────────────────────────────────────────────────

vi.mock("@ai-classroom/whiteboard-core", () => {
  let callCount = 0;
  return {
    createInitialBoardState: (roomId: string) => ({ room_id: roomId, scenes: {}, active_scene_id: "s1" }),
    applyEvent: (state: unknown, event: { idempotency_key?: string }) => {
      callCount++;
      return [state, {}];
    },
  };
});

// ── Mock api ──────────────────────────────────────────────────────────────

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────

function makePayload(seq: number, key?: string): BroadcastPayload {
  return {
    seq,
    event_type: "stroke.committed",
    payload: { id: `s${seq}` },
    actor_id: "u1",
    idempotency_key: key ?? `key-${seq}`,
    committed_at: new Date().toISOString(),
  };
}

function makeEngine() {
  const stateChanges: number[] = [];
  const seqChanges: number[] = [];
  const engine = new SyncEngine({
    roomId: "room-1",
    onStateChange: (_s) => stateChanges.push(stateChanges.length + 1),
    onSeqAdvance: (s) => seqChanges.push(s),
  });
  return { engine, stateChanges, seqChanges };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("SyncEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies in-order events sequentially", () => {
    const { engine } = makeEngine();
    engine.receive(makePayload(1, "k1"));
    engine.receive(makePayload(2, "k2"));
    engine.receive(makePayload(3, "k3"));
    expect(engine.getSeq()).toBe(3);
  });

  it("ignores duplicate idempotency_key", () => {
    const { engine } = makeEngine();
    engine.receive(makePayload(1, "same-key"));
    engine.receive(makePayload(2, "same-key")); // dup key — should NOT advance
    expect(engine.getSeq()).toBe(1);
  });

  it("ignores payloads with seq <= current seq", () => {
    const { engine } = makeEngine();
    engine.receive(makePayload(1, "k1"));
    engine.receive(makePayload(1, "k1b")); // stale seq
    expect(engine.getSeq()).toBe(1);
  });

  it("buffers out-of-order event and applies after backfill", async () => {
    const { engine } = makeEngine();

    // Simulate gap: receive seq 3 before 1 or 2
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [makePayload(1, "k1"), makePayload(2, "k2")],
    });

    // seq 3 arrives first → triggers backfill of 1 and 2
    engine.receive(makePayload(3, "k3"));

    // Wait for backfill to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(engine.getSeq()).toBe(3);
    expect(api.get).toHaveBeenCalledWith(
      "/api/v1/rooms/room-1/events",
      { params: { after: 0 } },
    );
  });

  it("handles server returning { data: [...] } envelope", async () => {
    const { engine } = makeEngine();

    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: [makePayload(1, "k1"), makePayload(2, "k2")] },
    });

    engine.receive(makePayload(3, "k3"));
    await new Promise((r) => setTimeout(r, 50));
    expect(engine.getSeq()).toBe(3);
  });

  it("drains pending queue after backfill fills gap", async () => {
    const { engine } = makeEngine();

    // Queue both seq 2 and seq 3 (gap before 1)
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [makePayload(1, "k1")],
    });

    engine.receive(makePayload(3, "k3")); // out of order
    engine.receive(makePayload(2, "k2")); // also out of order

    await new Promise((r) => setTimeout(r, 50));
    expect(engine.getSeq()).toBe(3);
  });

  it("seed() resets state and seq", () => {
    const { engine } = makeEngine();
    engine.receive(makePayload(1, "k1"));

    const fakeState = { room_id: "room-1", scenes: {}, active_scene_id: "s1" } as never;
    engine.seed(fakeState, 10);

    expect(engine.getSeq()).toBe(10);
    expect(engine.getState()).toBe(fakeState);
  });

  it("survives backfill network error and retries on next receive", async () => {
    const { engine } = makeEngine();

    vi.mocked(api.get).mockRejectedValueOnce(new Error("network error"));

    engine.receive(makePayload(2, "k2")); // gap at 1
    await new Promise((r) => setTimeout(r, 50));

    // After error, engine stays at seq 0 (gap unfilled)
    expect(engine.getSeq()).toBe(0);

    // Now backfill succeeds
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [makePayload(1, "k1")],
    });

    engine.receive(makePayload(3, "k3"));
    await new Promise((r) => setTimeout(r, 50));

    expect(engine.getSeq()).toBe(3);
  });
});
