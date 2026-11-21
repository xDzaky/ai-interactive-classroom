/**
 * snapshots.test.ts — P07-T01
 * Tests for snapshots API client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listSnapshots, createSnapshot, getNearestSnapshot } from "@/lib/api/snapshots";

describe("snapshots API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listSnapshots returns data array", async () => {
    const mockData = [
      { id: "s-1", room_id: "r1", seq_at: 10, created_at: "" },
      { id: "s-2", room_id: "r1", seq_at: 50, created_at: "" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockData }),
    }));

    const result = await listSnapshots("r1");
    expect(result).toHaveLength(2);
    expect(result[0].seq_at).toBe(10);
  });

  it("createSnapshot posts seq_at and state", async () => {
    const mockSnap = { id: "s-3", room_id: "r1", seq_at: 42, created_at: "" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockSnap }),
    }));

    const result = await createSnapshot("r1", 42, { objects: [] });
    expect(result.seq_at).toBe(42);

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain("/rooms/r1/snapshots");
    expect(fetchCall[1].method).toBe("POST");

    const body = JSON.parse(fetchCall[1].body);
    expect(body.seq_at).toBe(42);
    expect(body.state).toEqual({ objects: [] });
  });

  it("getNearestSnapshot returns snapshot data", async () => {
    const mockSnap = { id: "s-1", room_id: "r1", seq_at: 30, state: { v: 1 }, created_at: "" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockSnap }),
    }));

    const result = await getNearestSnapshot("r1", 45);
    expect(result?.seq_at).toBe(30);

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain("nearest?seq=45");
  });

  it("getNearestSnapshot returns null when no snapshot found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    }));

    const result = await getNearestSnapshot("r1", 5);
    expect(result).toBeNull();
  });
});
