import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRoom,
  fetchRoom,
  openLobby,
  startRoom,
  endRoom,
  regenerateCode,
  joinRoom,
} from "@/lib/api/rooms";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import api from "@/lib/api";

const MOCK_ROOM = {
  id: "room-1",
  code: "ABCDEF",
  status: "lobby",
  mode: "projector",
};

describe("rooms API client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createRoom posts to /api/v1/rooms", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: MOCK_ROOM,
    });
    const result = await createRoom({ classroom_id: "cls-1" });
    expect(api.post).toHaveBeenCalledWith("/api/v1/rooms", {
      classroom_id: "cls-1",
    });
    expect(result.code).toBe("ABCDEF");
  });

  it("fetchRoom gets /api/v1/rooms/:id", async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: MOCK_ROOM,
    });
    const result = await fetchRoom("room-1");
    expect(api.get).toHaveBeenCalledWith("/api/v1/rooms/room-1");
    expect(result.id).toBe("room-1");
  });

  it("openLobby patches status to lobby", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...MOCK_ROOM, status: "lobby" },
    });
    await openLobby("room-1");
    expect(api.patch).toHaveBeenCalledWith("/api/v1/rooms/room-1", {
      status: "lobby",
    });
  });

  it("startRoom patches status to live", async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...MOCK_ROOM, status: "live" },
    });
    await startRoom("room-1");
    expect(api.patch).toHaveBeenCalledWith("/api/v1/rooms/room-1", {
      status: "live",
    });
  });

  it("endRoom posts to /rooms/:id/end", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...MOCK_ROOM, status: "ended" },
    });
    await endRoom("room-1");
    expect(api.post).toHaveBeenCalledWith("/api/v1/rooms/room-1/end");
  });

  it("regenerateCode posts to /rooms/:id/regenerate-code", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ...MOCK_ROOM, code: "NEWCOD" },
    });
    const result = await regenerateCode("room-1");
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/rooms/room-1/regenerate-code",
    );
    expect(result.code).toBe("NEWCOD");
  });

  it("joinRoom posts to /rooms/join with code and alias", async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        participant_token: "tok.hmac",
        participant: { id: "p-1", alias: "Budi", role: "guest_student" },
      },
    });
    const result = await joinRoom("ABCDEF", "Budi");
    expect(api.post).toHaveBeenCalledWith(
      "/api/v1/rooms/join",
      { code: "ABCDEF", alias: "Budi" },
      { headers: {} },
    );
    expect(result.participant_token).toBe("tok.hmac");
  });
});
