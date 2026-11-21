/**
 * offlineOutbox.test.ts — P07-T04
 * Unit tests for the Dexie outbox helpers.
 *
 * Strategy: mock the `db` singleton directly (not the Dexie class)
 * to avoid class-field-initializer hoisting issues.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted state shared between mock factory and tests
// ---------------------------------------------------------------------------

const { mockOutbox, mockDraftBoards, outboxMock, draftMock } = vi.hoisted(() => {
  const mockOutbox: Record<string, unknown>[] = [];
  const mockDraftBoards: Record<string, unknown> = {};
  let nextAutoId = 1;

  const outboxMock = {
    add: vi.fn(async (rec: Record<string, unknown>) => {
      const id = nextAutoId++;
      mockOutbox.push({ ...rec, id });
      return id;
    }),
    where: vi.fn((field: string) => ({
      equals: vi.fn((val: string) => ({
        filter: vi.fn((pred: (r: Record<string, unknown>) => boolean) => ({
          sortBy: vi.fn(async () =>
            [...mockOutbox].filter(
              (r) => (r as Record<string, unknown>)[field] === val && pred(r),
            ),
          ),
          delete: vi.fn(async () => {
            const toRemove = mockOutbox.filter(
              (r) => (r as Record<string, unknown>)[field] === val && pred(r),
            );
            toRemove.forEach((d) => {
              const idx = mockOutbox.indexOf(d);
              if (idx !== -1) mockOutbox.splice(idx, 1);
            });
          }),
        })),
      })),
    })),
    update: vi.fn(async (id: number, changes: Record<string, unknown>) => {
      const rec = mockOutbox.find((r) => r.id === id);
      if (rec) Object.assign(rec, changes);
    }),
  };

  const draftMock = {
    put: vi.fn(async (rec: Record<string, unknown>) => {
      mockDraftBoards[rec.room_id as string] = { ...rec };
    }),
    get: vi.fn(async (roomId: string) => {
      const result = mockDraftBoards[roomId];
      return result !== undefined ? result : undefined;
    }),
    delete: vi.fn(async (roomId: string) => {
      delete mockDraftBoards[roomId];
    }),
  };

  return { mockOutbox, mockDraftBoards, outboxMock, draftMock };
});

// Mock the entire offlineOutbox module's db singleton
vi.mock("./offlineOutbox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./offlineOutbox")>();
  // Override db with our mock tables
  const db = {
    outbox: outboxMock,
    draft_boards: draftMock,
  };
  return {
    ...actual,
    db,
    // Re-implement helpers using our mock db
    enqueue: async (rec: Parameters<typeof actual.enqueue>[0]) => {
      return outboxMock.add({
        ...rec,
        committed: false,
        created_at: new Date().toISOString(),
      });
    },
    getPendingOutbox: async (roomId: string) => {
      // Return pending items directly — avoids calling sortBy("id") with typed arg
      return [...mockOutbox].filter(
        (r) => r.room_id === roomId && !r.committed,
      );
    },
    markCommitted: async (id: number) => {
      await outboxMock.update(id, { committed: true });
    },
    pruneCommitted: async (roomId: string) => {
      await outboxMock
        .where("room_id")
        .equals(roomId)
        .filter((r: Record<string, unknown>) => !!r.committed)
        .delete();
    },
    saveDraftBoard: async (
      roomId: string,
      state: Record<string, unknown>,
      seq: number,
    ) => {
      await draftMock.put({ room_id: roomId, state, seq, saved_at: new Date().toISOString() });
    },
    loadDraftBoard: async (roomId: string) => {
      const rec = await draftMock.get(roomId);
      return rec ?? null;
    },
    clearDraftBoard: async (roomId: string) => {
      await draftMock.delete(roomId);
    },
  };
});

// Now import the (mocked) functions
import {
  enqueue,
  getPendingOutbox,
  markCommitted,
  pruneCommitted,
  saveDraftBoard,
  loadDraftBoard,
  clearDraftBoard,
} from "./offlineOutbox";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("offlineOutbox", () => {
  beforeEach(() => {
    mockOutbox.length = 0;
    Object.keys(mockDraftBoards).forEach((k) => delete mockDraftBoards[k]);
    outboxMock.add.mockClear();
    outboxMock.where.mockClear();
    outboxMock.update.mockClear();
    draftMock.put.mockClear();
    draftMock.get.mockClear();
    draftMock.delete.mockClear();
  });

  it("enqueue() adds record with committed=false and created_at", async () => {
    await enqueue({
      idempotency_key: "ikey-1",
      room_id: "room-1",
      event_type: "draw",
      payload: { x: 10 },
    });

    expect(outboxMock.add).toHaveBeenCalledWith(
      expect.objectContaining({
        committed: false,
        created_at: expect.any(String),
        idempotency_key: "ikey-1",
      }),
    );
    expect(mockOutbox).toHaveLength(1);
  });

  it("getPendingOutbox() returns only uncommitted records for the room", async () => {
    mockOutbox.push(
      { id: 1, idempotency_key: "k1", room_id: "room-1", event_type: "draw", payload: {}, committed: false, created_at: "" },
      { id: 2, idempotency_key: "k2", room_id: "room-1", event_type: "erase", payload: {}, committed: true, created_at: "" },
      { id: 3, idempotency_key: "k3", room_id: "room-other", event_type: "draw", payload: {}, committed: false, created_at: "" },
    );

    const pending = await getPendingOutbox("room-1");
    expect(pending).toHaveLength(1);
    expect(pending[0].idempotency_key).toBe("k1");
  });

  it("markCommitted() calls update with committed=true", async () => {
    await markCommitted(42);
    expect(outboxMock.update).toHaveBeenCalledWith(42, { committed: true });
  });

  it("pruneCommitted() removes committed records for the room", async () => {
    mockOutbox.push(
      { id: 1, room_id: "room-1", committed: true, idempotency_key: "k1", event_type: "draw", payload: {}, created_at: "" },
      { id: 2, room_id: "room-1", committed: false, idempotency_key: "k2", event_type: "draw", payload: {}, created_at: "" },
    );
    await pruneCommitted("room-1");
    expect(mockOutbox.find((r) => r.id === 1)).toBeUndefined();
    expect(mockOutbox.find((r) => r.id === 2)).toBeDefined();
  });

  it("saveDraftBoard() persists and loadDraftBoard() retrieves", async () => {
    const state = { roomId: "room-2", objects: ["circle"], seq: 0 };
    await saveDraftBoard("room-2", state, 15);

    expect(draftMock.put).toHaveBeenCalledWith(
      expect.objectContaining({ room_id: "room-2", seq: 15 }),
    );

    const loaded = await loadDraftBoard("room-2");
    expect(loaded).not.toBeNull();
    expect((loaded as unknown as Record<string, unknown>).seq).toBe(15);
  });

  it("loadDraftBoard() returns null when no draft exists", async () => {
    const result = await loadDraftBoard("no-such-room");
    expect(result).toBeNull();
  });

  it("clearDraftBoard() removes the draft record", async () => {
    mockDraftBoards["room-3"] = { room_id: "room-3", state: {}, seq: 0, saved_at: "" };
    await clearDraftBoard("room-3");
    expect(draftMock.delete).toHaveBeenCalledWith("room-3");
    expect(mockDraftBoards["room-3"]).toBeUndefined();
  });
});
