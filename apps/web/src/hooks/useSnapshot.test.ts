/**
 * useSnapshot.test.ts — P07-T01
 * Tests for useSnapshot hook (auto-snapshot logic).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSnapshot } from "@/hooks/useSnapshot";

vi.mock("@/lib/api/snapshots", () => ({
  createSnapshot: vi.fn().mockResolvedValue({ id: "s-1", room_id: "r1", seq_at: 50, created_at: "" }),
  getNearestSnapshot: vi.fn().mockResolvedValue({ id: "s-1", room_id: "r1", seq_at: 30, state: { v: 1 }, created_at: "" }),
}));

import * as snapshotsApi from "@/lib/api/snapshots";
const mockCreate = snapshotsApi.createSnapshot as ReturnType<typeof vi.fn>;
const mockGetNearest = snapshotsApi.getNearestSnapshot as ReturnType<typeof vi.fn>;

const MOCK_STATE = { room_id: "r1", objects: {}, viewport: { x: 0, y: 0, zoom: 1 } };

describe("useSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non-host does not push snapshots on onEventApplied", () => {
    const { result } = renderHook(() =>
      useSnapshot({ roomId: "r1", isHost: false }),
    );
    act(() => {
      result.current.onEventApplied(50, MOCK_STATE as never);
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("host pushes snapshot on first event (seq_at starts at -1)", async () => {
    const { result } = renderHook(() =>
      useSnapshot({ roomId: "r1", isHost: true }),
    );
    await act(async () => {
      result.current.onEventApplied(1, MOCK_STATE as never);
      // Wait for async snapshot push
      await Promise.resolve();
    });
    expect(mockCreate).toHaveBeenCalledWith("r1", 1, MOCK_STATE);
  });

  it("host does not push again until SNAPSHOT_INTERVAL events later", async () => {
    const { result } = renderHook(() =>
      useSnapshot({ roomId: "r1", isHost: true }),
    );
    // First push at seq=1
    await act(async () => {
      result.current.onEventApplied(1, MOCK_STATE as never);
      await Promise.resolve();
    });
    // seq=10 is only 9 events later (< 50 interval) — no push
    act(() => {
      result.current.onEventApplied(10, MOCK_STATE as never);
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("fetchNearestSnapshot calls API and returns state", async () => {
    const { result } = renderHook(() =>
      useSnapshot({ roomId: "r1", isHost: true }),
    );
    const snap = await result.current.fetchNearestSnapshot(45);
    expect(snap?.seq_at).toBe(30);
    expect(mockGetNearest).toHaveBeenCalledWith("r1", 45);
  });

  it("fetchNearestSnapshot returns null when API returns null", async () => {
    mockGetNearest.mockResolvedValueOnce(null);
    const { result } = renderHook(() =>
      useSnapshot({ roomId: "r1", isHost: false }),
    );
    const snap = await result.current.fetchNearestSnapshot(5);
    expect(snap).toBeNull();
  });
});
