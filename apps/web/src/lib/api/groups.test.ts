/**
 * groups.test.ts — P06-T04
 * Tests for groups API client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listGroups,
  createGroup,
  deleteGroup,
  submitGroupWork,
  getGroupSubmissions,
} from "@/lib/api/groups";

describe("groups API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listGroups returns data array", async () => {
    const mockData = [
      { id: "g-1", room_id: "r1", name: "Alpha", whiteboard_id: null, created_at: "", updated_at: "" },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockData }),
    }));

    const result = await listGroups("r1");
    expect(result).toEqual(mockData);
  });

  it("createGroup posts to /rooms/{roomId}/groups", async () => {
    const mockGroup = { id: "g-2", room_id: "r1", name: "Beta", whiteboard_id: null, created_at: "", updated_at: "" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockGroup }),
    }));

    const result = await createGroup("r1", "Beta");
    expect(result.name).toBe("Beta");
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain("/rooms/r1/groups");
    expect(fetchCall[1].method).toBe("POST");
  });

  it("deleteGroup sends DELETE request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    await deleteGroup("r1", "g-1");
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[1].method).toBe("DELETE");
  });

  it("submitGroupWork sends participant token header", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "sub-1", group_id: "g-1", activity_id: "act-1", content: {}, submitted_by: null, submitted_at: null } }),
    }));

    await submitGroupWork("r1", "g-1", "act-1", { text: "answer" }, "tok-123");
    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[1].headers["X-Participant-Token"]).toBe("tok-123");
  });

  it("getGroupSubmissions returns submissions array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "s-1", group_id: "g-1", activity_id: "act-1", content: {}, submitted_by: null, submitted_at: null }] }),
    }));

    const result = await getGroupSubmissions("r1", "g-1");
    expect(result).toHaveLength(1);
  });
});
