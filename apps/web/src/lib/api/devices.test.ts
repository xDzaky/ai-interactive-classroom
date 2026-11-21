/**
 * devices.test.ts — P05-T06
 * Tests for devices API client functions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initiateDevice, listDevices, revokeDevice } from "@/lib/api/devices";

const ROOM = "room-abc";

describe("devices API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("initiateDevice POSTs to correct URL and returns device with token", async () => {
    const payload = {
      id: "d-1",
      device_id: "uuid-d1",
      device_name: "Mobile Controller",
      token: "raw-tok-123",
      paired_at: null,
      revoked_at: null,
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: payload }),
    });

    const result = await initiateDevice(ROOM, "Mobile Controller");

    expect(fetch).toHaveBeenCalledWith(`/api/v1/rooms/${ROOM}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_name: "Mobile Controller" }),
    });
    expect(result.token).toBe("raw-tok-123");
  });

  it("listDevices GETs device list", async () => {
    const devices = [
      { id: "d-2", device_id: "u2", device_name: "iPad", paired_at: null, revoked_at: null },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: devices }),
    });

    const result = await listDevices(ROOM);
    expect(result).toHaveLength(1);
    expect(result[0].device_name).toBe("iPad");
  });

  it("revokeDevice DELETEs the device", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    await expect(revokeDevice(ROOM, "d-1")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(`/api/v1/rooms/${ROOM}/devices/d-1`, {
      method: "DELETE",
    });
  });

  it("throws when initiateDevice fails", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    await expect(initiateDevice(ROOM)).rejects.toThrow("Failed to initiate");
  });
});
