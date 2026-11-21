/**
 * presenterRequests.ts — P05-T03
 * API client for presenter-request endpoints.
 */

export type PRStatus = "requested" | "approved" | "active" | "revoked" | "expired";
export type PRScope = "draw_only" | "object_edit" | "full_board";

export interface PresenterRequest {
  id: string;
  room_id: string;
  participant_id: string;
  status: PRStatus;
  scope: PRScope;
  expires_at: string | null;
  created_at: string;
  participant?: { id: string; alias: string; role: string };
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Participant ${token}` } : {};
}

/** POST /rooms/{room}/presenter-requests — student raises hand */
export async function raiseHand(
  roomId: string,
  scope: PRScope = "draw_only",
  token?: string,
): Promise<PresenterRequest> {
  const res = await fetch(`/api/v1/rooms/${roomId}/presenter-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ scope }),
  });
  if (res.status === 409) {
    const body = await res.json() as { data: PresenterRequest };
    return body.data; // already has a pending request
  }
  if (!res.ok) throw new Error("Failed to raise hand");
  const body = await res.json() as { data: PresenterRequest };
  return body.data;
}

/** GET /rooms/{room}/presenter-requests — host: all; student: own */
export async function listPresenterRequests(
  roomId: string,
  token?: string,
): Promise<PresenterRequest[]> {
  const res = await fetch(`/api/v1/rooms/${roomId}/presenter-requests`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch presenter requests");
  const body = await res.json() as { data: PresenterRequest[] };
  return body.data;
}

/** PATCH /rooms/{room}/presenter-requests/{id} — host approve/reject */
export async function updatePresenterRequest(
  roomId: string,
  requestId: string,
  status: PRStatus,
  scope?: PRScope,
  token?: string,
): Promise<PresenterRequest> {
  const res = await fetch(
    `/api/v1/rooms/${roomId}/presenter-requests/${requestId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({ status, ...(scope ? { scope } : {}) }),
    },
  );
  if (!res.ok) throw new Error("Failed to update presenter request");
  const body = await res.json() as { data: PresenterRequest };
  return body.data;
}

/** DELETE /rooms/{room}/presenter-requests/{id} — revoke */
export async function deletePresenterRequest(
  roomId: string,
  requestId: string,
  token?: string,
): Promise<void> {
  const res = await fetch(
    `/api/v1/rooms/${roomId}/presenter-requests/${requestId}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    },
  );
  if (!res.ok && res.status !== 204) throw new Error("Failed to revoke request");
}
