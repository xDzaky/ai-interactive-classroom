/**
 * activities.test.ts — P06-T03
 * Tests for activities API client.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  listActivities,
  createActivity,
  updateActivity,
  submitAnswer,
  getActivityResults,
} from "@/lib/api/activities";

const ROOM = "r-abc";
const ACT  = "act-1";

describe("activities API client", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("listActivities GETs activity list", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: ACT, title: "T" }] }),
    });
    const result = await listActivities(ROOM);
    expect(result[0].title).toBe("T");
  });

  it("createActivity POSTs payload", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: ACT, type: "poll", title: "P" } }),
    });
    const result = await createActivity(ROOM, { type: "poll", title: "P" });
    expect(fetch).toHaveBeenCalledWith(`/api/v1/rooms/${ROOM}/activities`, expect.objectContaining({ method: "POST" }));
    expect(result.id).toBe(ACT);
  });

  it("updateActivity PATCHes status", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: ACT, status: "active" } }),
    });
    const result = await updateActivity(ROOM, ACT, { status: "active" });
    expect(fetch).toHaveBeenCalledWith(
      `/api/v1/rooms/${ROOM}/activities/${ACT}`,
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(result.status).toBe("active");
  });

  it("submitAnswer POSTs answer with token header", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "ans-1", response: ["A"] } }),
    });
    await submitAnswer(ROOM, ACT, "q-1", ["A"], "participant-tok");
    expect(fetch).toHaveBeenCalledWith(
      `/api/v1/rooms/${ROOM}/activities/${ACT}/answers`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Participant participant-tok" }),
      }),
    );
  });

  it("getActivityResults GETs results", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { activity: { id: ACT }, questions: [] } }),
    });
    const result = await getActivityResults(ROOM, ACT);
    expect(result.activity.id).toBe(ACT);
  });
});
