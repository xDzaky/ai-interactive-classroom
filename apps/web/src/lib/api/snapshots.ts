/**
 * snapshots.ts — P07-T01
 * API client for snapshot endpoints.
 */

export interface RoomSnapshot {
  id: string;
  room_id: string;
  seq_at: number;
  state?: Record<string, unknown>;
  created_at: string;
}

const BASE = "/api/v1";

/** List all snapshots for a room (ordered by seq_at ascending) */
export async function listSnapshots(roomId: string): Promise<RoomSnapshot[]> {
  const res = await fetch(`${BASE}/rooms/${roomId}/snapshots`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to list snapshots");
  const json = await res.json();
  return json.data as RoomSnapshot[];
}

/** Create (or upsert) a snapshot at a given seq_at */
export async function createSnapshot(
  roomId: string,
  seqAt: number,
  state: Record<string, unknown>,
): Promise<RoomSnapshot> {
  const res = await fetch(`${BASE}/rooms/${roomId}/snapshots`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ seq_at: seqAt, state }),
  });
  if (!res.ok) throw new Error("Failed to create snapshot");
  const json = await res.json();
  return json.data as RoomSnapshot;
}

/** Get the nearest snapshot at or before a given seq */
export async function getNearestSnapshot(
  roomId: string,
  seq: number,
): Promise<RoomSnapshot | null> {
  const res = await fetch(
    `${BASE}/rooms/${roomId}/snapshots/nearest?seq=${seq}`,
    { credentials: "include", headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error("Failed to get nearest snapshot");
  const json = await res.json();
  return json.data as RoomSnapshot | null;
}
