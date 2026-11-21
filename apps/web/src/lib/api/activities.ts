/**
 * activities.ts — P06-T03
 * API client for poll/quiz/group_task activity endpoints.
 */

export type ActivityType = "poll" | "quiz" | "group_task";
export type ActivityStatus = "draft" | "active" | "closed";

export interface ActivityQuestion {
  id: string;
  activity_id: string;
  body: string;
  options: string[] | null;
  sort_order: number;
  /** Only present on results endpoint (host-only). */
  answer_key?: string[] | null;
}

export interface Activity {
  id: string;
  room_id: string;
  lesson_session_id: string | null;
  type: ActivityType;
  title: string;
  config: Record<string, unknown> | null;
  status: ActivityStatus;
  questions: ActivityQuestion[];
  created_at: string;
  updated_at: string;
}

export interface ActivityAnswer {
  id: string;
  activity_id: string;
  question_id: string;
  participant_id: string;
  response: string[];
  submitted_at: string | null;
}

export interface ActivityResult {
  activity: Pick<Activity, "id" | "type" | "title" | "status">;
  questions: Array<ActivityQuestion & { answers: ActivityAnswer[] }>;
}

export interface CreateActivityPayload {
  type: ActivityType;
  title: string;
  config?: Record<string, unknown>;
  questions?: Array<{
    body: string;
    options?: string[];
    answer_key?: string[];
    sort_order?: number;
  }>;
}

// ── API helpers ────────────────────────────────────────────────────────────

/** GET /api/v1/rooms/{roomId}/activities */
export async function listActivities(roomId: string): Promise<Activity[]> {
  const res = await fetch(`/api/v1/rooms/${roomId}/activities`);
  if (!res.ok) throw new Error("Failed to list activities");
  const body = (await res.json()) as { data: Activity[] };
  return body.data;
}

/** POST /api/v1/rooms/{roomId}/activities */
export async function createActivity(
  roomId: string,
  payload: CreateActivityPayload,
): Promise<Activity> {
  const res = await fetch(`/api/v1/rooms/${roomId}/activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create activity");
  const body = (await res.json()) as { data: Activity };
  return body.data;
}

/** PATCH /api/v1/rooms/{roomId}/activities/{activityId} */
export async function updateActivity(
  roomId: string,
  activityId: string,
  patch: Partial<Pick<Activity, "status" | "title" | "config">>,
): Promise<Activity> {
  const res = await fetch(`/api/v1/rooms/${roomId}/activities/${activityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update activity");
  const body = (await res.json()) as { data: Activity };
  return body.data;
}

/** POST /api/v1/rooms/{roomId}/activities/{activityId}/answers — student submits */
export async function submitAnswer(
  roomId: string,
  activityId: string,
  questionId: string,
  response: string[],
  token?: string,
): Promise<ActivityAnswer> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Participant ${token}`;
  const res = await fetch(
    `/api/v1/rooms/${roomId}/activities/${activityId}/answers`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ question_id: questionId, response }),
    },
  );
  if (!res.ok) throw new Error("Failed to submit answer");
  const body = (await res.json()) as { data: ActivityAnswer };
  return body.data;
}

/** GET /api/v1/rooms/{roomId}/activities/{activityId}/results — host only */
export async function getActivityResults(
  roomId: string,
  activityId: string,
): Promise<ActivityResult> {
  const res = await fetch(
    `/api/v1/rooms/${roomId}/activities/${activityId}/results`,
  );
  if (!res.ok) throw new Error("Failed to get results");
  const body = (await res.json()) as { data: ActivityResult };
  return body.data;
}
