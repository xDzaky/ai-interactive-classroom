/**
 * Rooms API client — wraps POST/GET /api/v1/rooms/* endpoints.
 * Uses the shared axios instance from lib/api.ts for auth + CSRF.
 */
import api from "@/lib/api";

// ── Types (mirror CONTRACTS.md) ───────────────────────────────────────────────

export type RoomStatus =
  | "draft"
  | "scheduled"
  | "lobby"
  | "live"
  | "ended"
  | "archived";

export type RoomMode = "projector" | "smart_display" | "mobile_host" | "group";

export type ParticipantRole =
  | "teacher_host"
  | "presenter"
  | "student"
  | "guest_student"
  | "group_leader";

export interface Room {
  id: string;
  classroom_id: string;
  host_id: string;
  code: string;
  status: RoomStatus;
  mode: RoomMode;
  settings: Record<string, unknown> | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string | null;
  alias: string;
  role: ParticipantRole;
  joined_at: string;
  left_at: string | null;
}

export interface JoinResult {
  participant_token: string;
  participant: Participant;
}

export interface CreateRoomPayload {
  classroom_id: string;
  mode?: RoomMode;
  starts_at?: string;
  ends_at?: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

/** Create a new room (teacher, authenticated). */
export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const { data } = await api.post<Room>("/api/v1/rooms", payload);
  return data;
}

/** Fetch a single room by id. */
export async function fetchRoom(roomId: string): Promise<Room> {
  const { data } = await api.get<Room>(`/api/v1/rooms/${roomId}`);
  return data;
}

/** Transition room to lobby (status: lobby). */
export async function openLobby(roomId: string): Promise<Room> {
  const { data } = await api.patch<Room>(`/api/v1/rooms/${roomId}`, {
    status: "lobby",
  });
  return data;
}

/** Transition room to live (status: live). */
export async function startRoom(roomId: string): Promise<Room> {
  const { data } = await api.patch<Room>(`/api/v1/rooms/${roomId}`, {
    status: "live",
  });
  return data;
}

/** End an active room. */
export async function endRoom(roomId: string): Promise<Room> {
  const { data } = await api.post<Room>(`/api/v1/rooms/${roomId}/end`);
  return data;
}

/** Regenerate join code (host only). */
export async function regenerateCode(roomId: string): Promise<Room> {
  const { data } = await api.post<Room>(
    `/api/v1/rooms/${roomId}/regenerate-code`,
  );
  return data;
}

/** Join a room by code (guest or authenticated user). */
export async function joinRoom(
  code: string,
  alias: string,
  participantToken?: string,
): Promise<JoinResult> {
  const headers: Record<string, string> = {};
  if (participantToken) {
    headers["Authorization"] = `Participant ${participantToken}`;
  }
  const { data } = await api.post<JoinResult>(
    "/api/v1/rooms/join",
    { code, alias },
    { headers },
  );
  return data;
}
