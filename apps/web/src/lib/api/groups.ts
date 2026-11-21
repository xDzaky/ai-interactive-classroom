/**
 * groupsApi.ts — P06-T04
 * API client for group workspace endpoints.
 */

export interface RoomGroup {
  id: string;
  room_id: string;
  name: string;
  whiteboard_id: string | null;
  members?: GroupMember[];
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  participant_id: string;
  is_leader: boolean;
}

export interface GroupSubmission {
  id: string;
  group_id: string;
  activity_id: string;
  content: Record<string, unknown>;
  submitted_by: string | null;
  submitted_at: string | null;
}

const BASE = "/api/v1";

/** List all groups in a room (requires Sanctum cookie auth) */
export async function listGroups(roomId: string): Promise<RoomGroup[]> {
  const res = await fetch(`${BASE}/rooms/${roomId}/groups`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to list groups");
  const json = await res.json();
  return json.data as RoomGroup[];
}

/** Create a new group */
export async function createGroup(
  roomId: string,
  name: string,
  whiteboardId?: string,
): Promise<RoomGroup> {
  const res = await fetch(`${BASE}/rooms/${roomId}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, whiteboard_id: whiteboardId }),
  });
  if (!res.ok) throw new Error("Failed to create group");
  const json = await res.json();
  return json.data as RoomGroup;
}

/** Delete a group */
export async function deleteGroup(roomId: string, groupId: string): Promise<void> {
  const res = await fetch(`${BASE}/rooms/${roomId}/groups/${groupId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete group");
}

/** Add or update a member in a group */
export async function addGroupMember(
  roomId: string,
  groupId: string,
  participantId: string,
  isLeader: boolean,
): Promise<GroupMember> {
  const res = await fetch(`${BASE}/rooms/${roomId}/groups/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ participant_id: participantId, is_leader: isLeader }),
  });
  if (!res.ok) throw new Error("Failed to add group member");
  const json = await res.json();
  return json.data as GroupMember;
}

/** Remove a member from a group */
export async function removeGroupMember(
  roomId: string,
  groupId: string,
  participantId: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/rooms/${roomId}/groups/${groupId}/members/${participantId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!res.ok) throw new Error("Failed to remove group member");
}

/** Submit group work (leader only — uses participant token) */
export async function submitGroupWork(
  roomId: string,
  groupId: string,
  activityId: string,
  content: Record<string, unknown>,
  participantToken?: string,
): Promise<GroupSubmission> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (participantToken) {
    headers["X-Participant-Token"] = participantToken;
  }
  const res = await fetch(`${BASE}/rooms/${roomId}/groups/${groupId}/submissions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ activity_id: activityId, content }),
  });
  if (!res.ok) throw new Error("Failed to submit group work");
  const json = await res.json();
  return json.data as GroupSubmission;
}

/** Get submissions for a group (host only) */
export async function getGroupSubmissions(
  roomId: string,
  groupId: string,
): Promise<GroupSubmission[]> {
  const res = await fetch(`${BASE}/rooms/${roomId}/groups/${groupId}/submissions`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to get submissions");
  const json = await res.json();
  return json.data as GroupSubmission[];
}
