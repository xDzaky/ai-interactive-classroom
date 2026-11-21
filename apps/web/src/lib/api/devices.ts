/**
 * devices.ts — P05-T06
 * API client for mobile-controller device-pairing endpoints.
 * Auth: Sanctum cookie (teacher) for initiate/list/revoke.
 */

export interface RoomDevice {
  id: string;
  device_id: string;
  device_name: string;
  paired_at: string | null;
  revoked_at: string | null;
}

export interface InitiatedDevice extends RoomDevice {
  /** Raw token returned once; shown as QR. Never stored after display. */
  token: string;
}

/** POST /api/v1/rooms/{roomId}/devices — teacher initiates a new pairing */
export async function initiateDevice(
  roomId: string,
  deviceName = "Mobile Controller",
): Promise<InitiatedDevice> {
  const res = await fetch(`/api/v1/rooms/${roomId}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_name: deviceName }),
  });
  if (!res.ok) throw new Error("Failed to initiate device pairing");
  const body = (await res.json()) as { data: InitiatedDevice };
  return body.data;
}

/** GET /api/v1/rooms/{roomId}/devices — list active paired devices */
export async function listDevices(roomId: string): Promise<RoomDevice[]> {
  const res = await fetch(`/api/v1/rooms/${roomId}/devices`);
  if (!res.ok) throw new Error("Failed to list devices");
  const body = (await res.json()) as { data: RoomDevice[] };
  return body.data;
}

/** DELETE /api/v1/rooms/{roomId}/devices/{deviceId} — teacher revokes a device */
export async function revokeDevice(
  roomId: string,
  deviceId: string,
): Promise<void> {
  const res = await fetch(`/api/v1/rooms/${roomId}/devices/${deviceId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to revoke device");
}
