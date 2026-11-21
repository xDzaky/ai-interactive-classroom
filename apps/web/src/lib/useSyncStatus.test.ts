/**
 * useSyncStatus.test.ts — P07-T05
 * Unit tests for the sync state machine and outbox flush logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { mockPending, mockEnqueue, mockGetPending, mockMarkCommitted, mockPrune } =
  vi.hoisted(() => {
    const mockPending: Record<string, unknown>[] = [];

    const mockEnqueue = vi.fn(async () => 1);
    const mockGetPending = vi.fn(async () => [...mockPending]);
    const mockMarkCommitted = vi.fn(async () => {});
    const mockPrune = vi.fn(async () => {});

    return { mockPending, mockEnqueue, mockGetPending, mockMarkCommitted, mockPrune };
  });

vi.mock("@/lib/offlineOutbox", () => ({
  enqueue: mockEnqueue,
  getPendingOutbox: mockGetPending,
  markCommitted: mockMarkCommitted,
  pruneCommitted: mockPrune,
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useSyncStatus } from "./useSyncStatus";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSyncStatus", () => {
  const ROOM = "room-sync";

  beforeEach(() => {
    mockPending.length = 0;
    mockEnqueue.mockClear();
    mockGetPending.mockClear();
    mockMarkCommitted.mockClear();
    mockPrune.mockClear();
    mockFetch.mockClear();
    // Default: empty outbox
    mockGetPending.mockResolvedValue([]);
  });

  it("starts 'synced' when outbox is empty", async () => {
    const { result } = renderHook(() =>
      useSyncStatus({ roomId: ROOM }),
    );

    await waitFor(() => {
      expect(result.current.syncState).toBe("synced");
    });
    expect(result.current.pendingCount).toBe(0);
  });

  it("transitions to 'saved_locally' after enqueueEvent()", async () => {
    const { result } = renderHook(() => useSyncStatus({ roomId: ROOM }));

    await act(async () => {
      await result.current.enqueueEvent("key-1", "draw", { x: 5 });
    });

    expect(result.current.syncState).toBe("saved_locally");
    expect(result.current.pendingCount).toBe(1);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: "key-1", event_type: "draw" }),
    );
  });

  it("drainOutbox() transitions to 'synced' on success", async () => {
    mockPending.push({
      id: 1,
      idempotency_key: "k1",
      room_id: ROOM,
      event_type: "draw",
      payload: {},
      committed: false,
      created_at: "",
    });
    mockGetPending.mockResolvedValue([...mockPending]);
    mockFetch.mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useSyncStatus({ roomId: ROOM }));

    await act(async () => {
      await result.current.drainOutbox();
    });

    expect(result.current.syncState).toBe("synced");
    expect(mockMarkCommitted).toHaveBeenCalledWith(1);
    expect(mockPrune).toHaveBeenCalledWith(ROOM);
  });

  it("drainOutbox() transitions to 'needs_attention' after maxRetries failures", async () => {
    mockPending.push({
      id: 2,
      idempotency_key: "k2",
      room_id: ROOM,
      event_type: "draw",
      payload: {},
      committed: false,
      created_at: "",
    });
    mockGetPending.mockResolvedValue([...mockPending]);
    // All fetch calls fail
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() =>
      useSyncStatus({ roomId: ROOM, maxRetries: 1 }),
    );

    await act(async () => {
      await result.current.drainOutbox();
    });

    expect(result.current.syncState).toBe("needs_attention");
  });

  it("drainOutbox() treats 409 as success (idempotent re-commit)", async () => {
    mockPending.push({
      id: 3,
      idempotency_key: "k3",
      room_id: ROOM,
      event_type: "erase",
      payload: {},
      committed: false,
      created_at: "",
    });
    mockGetPending.mockResolvedValue([...mockPending]);
    // 409 = already committed → still ok
    mockFetch.mockResolvedValue({ ok: false, status: 409 });

    const { result } = renderHook(() => useSyncStatus({ roomId: ROOM }));

    await act(async () => {
      await result.current.drainOutbox();
    });

    expect(result.current.syncState).toBe("synced");
  });

  it("starts 'saved_locally' on mount when outbox has pending items", async () => {
    mockGetPending.mockResolvedValue([
      { id: 4, idempotency_key: "k4", room_id: ROOM, event_type: "draw", payload: {}, committed: false, created_at: "" },
    ]);

    const { result } = renderHook(() => useSyncStatus({ roomId: ROOM }));

    await waitFor(() => {
      expect(result.current.syncState).toBe("saved_locally");
      expect(result.current.pendingCount).toBe(1);
    });
  });
});
