/**
 * @ai-classroom/shared-types
 * Shared Zod schemas and TypeScript types for the AI Interactive Classroom platform.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum([
  "platform_admin",
  "school_admin",
  "teacher",
  "student",
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ParticipantRoleSchema = z.enum([
  "teacher_host",
  "presenter",
  "student",
  "guest_student",
  "group_leader",
]);
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

export const RoomStatusSchema = z.enum([
  "draft",
  "scheduled",
  "lobby",
  "live",
  "ended",
  "archived",
]);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const RoomModeSchema = z.enum([
  "projector",
  "smart_display",
  "mobile_host",
  "group",
]);
export type RoomMode = z.infer<typeof RoomModeSchema>;

export const PresenterRequestStatusSchema = z.enum([
  "requested",
  "approved",
  "active",
  "revoked",
  "expired",
]);
export type PresenterRequestStatus = z.infer<typeof PresenterRequestStatusSchema>;

export const PresenterScopeSchema = z.enum([
  "draw_only",
  "object_edit",
  "full_board",
]);
export type PresenterScope = z.infer<typeof PresenterScopeSchema>;

export const ActivityTypeSchema = z.enum(["poll", "quiz", "group_task"]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const ActivityStatusSchema = z.enum(["draft", "active", "closed"]);
export type ActivityStatus = z.infer<typeof ActivityStatusSchema>;

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  school_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const SchoolSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  settings: z.record(z.unknown()),
  created_at: z.string().datetime(),
});
export type School = z.infer<typeof SchoolSchema>;

export const ClassroomSchema = z.object({
  id: z.string().uuid(),
  school_id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  name: z.string(),
  subject: z.string(),
  grade_level: z.string().optional(),
  created_at: z.string().datetime(),
});
export type Classroom = z.infer<typeof ClassroomSchema>;

export const RoomSchema = z.object({
  id: z.string().uuid(),
  classroom_id: z.string().uuid().nullable(),
  host_id: z.string().uuid(),
  code: z.string(),
  status: RoomStatusSchema,
  mode: RoomModeSchema,
  settings: z.record(z.unknown()),
  starts_at: z.string().datetime().nullable(),
  ends_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type Room = z.infer<typeof RoomSchema>;

export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  alias: z.string(),
  role: ParticipantRoleSchema,
  joined_at: z.string().datetime(),
  left_at: z.string().datetime().nullable(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

// ---------------------------------------------------------------------------
// Whiteboard events
// ---------------------------------------------------------------------------

export const WhiteboardEventTypeSchema = z.enum([
  "stroke.committed",
  "object.created",
  "object.updated",
  "object.deleted",
  "object.transform",
  "scene.changed",
  "viz.solid.created",
  "viz.solid.updated",
  "viz.graph.created",
  "viz.graph.updated",
  "annotation.created",
  "annotation.deleted",
  "device.pointer.moved",
  "device.action",
]);
export type WhiteboardEventType = z.infer<typeof WhiteboardEventTypeSchema>;

export const StrokeCommittedPayloadSchema = z.object({
  id: z.string().uuid(),
  points: z.array(z.tuple([z.number(), z.number(), z.number()])), // [x, y, pressure]
  color: z.string(),
  width: z.number(),
  tool: z.string(),
});
export type StrokeCommittedPayload = z.infer<typeof StrokeCommittedPayloadSchema>;

export const ObjectCreatedPayloadSchema = z.object({
  id: z.string().uuid(),
  object_type: z.string(),
  props: z.record(z.unknown()),
});
export type ObjectCreatedPayload = z.infer<typeof ObjectCreatedPayloadSchema>;

export const RoomEventSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  seq: z.number().int(),
  event_type: WhiteboardEventTypeSchema,
  payload: z.record(z.unknown()),
  actor_id: z.string().uuid(),
  committed_at: z.string().datetime(),
});
export type RoomEvent = z.infer<typeof RoomEventSchema>;

// ---------------------------------------------------------------------------
// Presenter + Devices
// ---------------------------------------------------------------------------

export const PresenterRequestSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  status: PresenterRequestStatusSchema,
  scope: PresenterScopeSchema.nullable(),
  expires_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});
export type PresenterRequest = z.infer<typeof PresenterRequestSchema>;

export const RoomDeviceSchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  device_id: z.string().uuid(),
  device_name: z.string(),
  paired_at: z.string().datetime(),
  revoked_at: z.string().datetime().nullable(),
});
export type RoomDevice = z.infer<typeof RoomDeviceSchema>;

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export const ActivitySchema = z.object({
  id: z.string().uuid(),
  room_id: z.string().uuid(),
  type: ActivityTypeSchema,
  title: z.string(),
  config: z.record(z.unknown()),
  status: ActivityStatusSchema,
  created_at: z.string().datetime(),
});
export type Activity = z.infer<typeof ActivitySchema>;

export const ActivityQuestionSchema = z.object({
  id: z.string().uuid(),
  activity_id: z.string().uuid(),
  body: z.string(),
  options: z.array(z.unknown()),
});
export type ActivityQuestion = z.infer<typeof ActivityQuestionSchema>;

export const ActivityAnswerSchema = z.object({
  id: z.string().uuid(),
  activity_id: z.string().uuid(),
  question_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  response: z.record(z.unknown()),
  submitted_at: z.string().datetime(),
});
export type ActivityAnswer = z.infer<typeof ActivityAnswerSchema>;

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

export const ApiErrorSchema = z.object({
  message: z.string(),
  errors: z.record(z.array(z.string())).optional(),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    meta: z.object({
      current_page: z.number().int(),
      last_page: z.number().int(),
      per_page: z.number().int(),
      total: z.number().int(),
    }),
  });
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};
