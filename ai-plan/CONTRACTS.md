# CONTRACTS.md — API paths, event names, table/column names, JSON keys

Never invent names; use exactly what is here. If something is missing, add a PROPOSED entry in DECISIONS.md, mark your task [!], STOP.

---

## HTTP API (Laravel — base URL /api/v1)

### Auth
| Method | Path | Body / Response keys | Notes |
|---|---|---|---|
| GET | /sanctum/csrf-cookie | — | Must call before POST login |
| POST | /auth/login | email, password → token (cookie), user | Sanctum SPA |
| POST | /auth/logout | — | Sanctum |
| GET | /auth/me | → user object | |

### Users / Schools
| Method | Path | Notes |
|---|---|---|
| GET | /schools | List user's schools |
| POST | /schools | Create school |
| GET | /schools/{schoolId} | |
| PATCH | /schools/{schoolId} | |
| GET | /schools/{schoolId}/classrooms | |
| POST | /schools/{schoolId}/classrooms | |
| GET | /classrooms/{classroomId} | |
| PATCH | /classrooms/{classroomId} | |

### Rooms
| Method | Path | Notes |
|---|---|---|
| POST | /rooms | Create room |
| GET | /rooms/{roomId} | |
| PATCH | /rooms/{roomId} | lifecycle/settings |
| POST | /rooms/{roomId}/end | End room |
| POST | /rooms/{roomId}/regenerate-code | |
| GET | /rooms/{roomId}/participants | |
| POST | /rooms/join | {code, alias?} → participant token |
| POST | /rooms/{roomId}/events | Ingest whiteboard events |
| GET | /rooms/{roomId}/events | Sync events (seq after offset) |
| GET | /rooms/{roomId}/snapshots | |
| POST | /rooms/{roomId}/snapshots | |

### Presenter
| Method | Path | Notes |
|---|---|---|
| POST | /rooms/{roomId}/presenter-requests | Student raises hand |
| GET | /rooms/{roomId}/presenter-requests | Host sees queue |
| PATCH | /rooms/{roomId}/presenter-requests/{id} | Approve/reject |
| DELETE | /rooms/{roomId}/presenter-requests/{id} | Revoke |

### Devices (Mobile Controller)
| Method | Path | Notes |
|---|---|---|
| POST | /rooms/{roomId}/devices | Initiate pairing |
| POST | /rooms/{roomId}/devices/{deviceId}/confirm | Confirm pair via QR |
| DELETE | /rooms/{roomId}/devices/{deviceId} | Revoke |
| GET | /rooms/{roomId}/devices | List paired devices |

### Activities (Poll/Quiz/Group)
| Method | Path | Notes |
|---|---|---|
| GET | /rooms/{roomId}/activities | |
| POST | /rooms/{roomId}/activities | Create activity |
| GET | /rooms/{roomId}/activities/{activityId} | |
| PATCH | /rooms/{roomId}/activities/{activityId} | start/stop |
| POST | /rooms/{roomId}/activities/{activityId}/answers | Student submits |
| GET | /rooms/{roomId}/activities/{activityId}/results | Host sees results |

### AI
| Method | Path | Notes |
|---|---|---|
| POST | /ai/jobs | Submit AI job → 202 {job_id} |
| GET | /ai/jobs/{jobId} | Poll status + result |

### Documents
| Method | Path | Body / Response keys | Notes |
|---|---|---|---|
| POST | /schools/{schoolId}/documents | multipart `file` (PDF/text, ≤10 MB), optional `title` → 202 {document_id, status:"queued"} | Teacher or school_admin only |
| GET | /schools/{schoolId}/documents/{documentId} | → {id, title, status, ingested_at} | Teacher or school_admin only; status: queued, processing, ready, failed |

### Error format
```json
{ "message": "Human readable", "errors": { "field": ["msg"] }, "code": "ERROR_CODE" }
```

---

## WebSocket (Reverb / Laravel Echo)

### Channels
| Channel | Type | Who |
|---|---|---|
| room.{roomId} | private | Participant (host+student) |
| room.{roomId}.host | private | Host only |
| presence-room.{roomId} | presence | All in room |

### Events (broadcast FROM server)
| Event name | Channel | Payload keys |
|---|---|---|
| whiteboard.event.applied | room.{roomId} | seq, event_type, payload, actor_id, committed_at |
| room.participant.joined | presence-room.{roomId} | participant_id, alias, role |
| room.participant.left | presence-room.{roomId} | participant_id |
| room.state.changed | room.{roomId} | status, changed_by |
| presenter.request.created | room.{roomId}.host | request_id, participant_id, alias |
| presenter.request.updated | room.{roomId} | request_id, status, scope |
| activity.state.changed | room.{roomId} | activity_id, status |
| device.paired | room.{roomId}.host | device_id |

### Client-to-server event (echo.private().whisper or POST /events)
Whiteboard events go via POST /api/v1/rooms/{roomId}/events (HTTP, not whisper).
Mobile Controller commands go via POST /api/v1/rooms/{roomId}/events with event_type prefixed `device.`.

---

## Database tables

### Core identity
| Table | Key columns |
|---|---|
| users | id (uuid), name, email, password, role (enum: platform_admin, school_admin, teacher, student), school_id (nullable fk) |
| schools | id (uuid), name, slug, settings (json) |
| school_memberships | id (uuid), school_id, user_id, role (enum: admin, teacher, student) |
| classrooms | id (uuid), school_id, teacher_id, name, subject, grade_level |
| subjects | id (uuid), name, slug |
| curricula | id (uuid), subject_id, name, version, content (json) |

### Rooms
| Table | Key columns |
|---|---|
| rooms | id (uuid), classroom_id, host_id, code (unique), status (enum: draft, scheduled, lobby, live, ended, archived), mode (enum: projector, smart_display, mobile_host, group), settings (json), starts_at, ends_at |
| participants | id (uuid), room_id, user_id (nullable), alias, role (enum: teacher_host, presenter, student, guest_student, group_leader), token_hash, joined_at, left_at |
| whiteboards | id (uuid), room_id, name, scene_data (json) |
| room_events | id (uuid), room_id, seq (bigint), event_type (varchar), payload (json), actor_id (uuid), idempotency_key (varchar nullable unique per room), committed_at |
| room_snapshots | id (uuid), room_id, seq_at, state (json), created_at |
| audit_logs | id (uuid), room_id, actor_id, action, metadata (json), created_at |

### Presenter + Devices
| Table | Key columns |
|---|---|
| presenter_requests | id (uuid), room_id, participant_id, status (enum: requested, approved, active, revoked, expired), scope (enum: draw_only, object_edit, full_board), expires_at |
| room_permissions | id (uuid), room_id, participant_id, permission, granted_by, granted_at, revoked_at |
| room_devices | id (uuid), room_id, device_id (uuid), device_name, token_hash, paired_at, revoked_at |

### Activities
| Table | Key columns |
|---|---|
| lesson_sessions | id (uuid), room_id, started_at, ended_at |
| activities | id (uuid), room_id, lesson_session_id, type (enum: poll, quiz, group_task), title, config (json), status (enum: draft, active, closed) |
| activity_questions | id (uuid), activity_id, body (text), options (json), answer_key (json, hidden from students) |
| activity_answers | id (uuid), activity_id, question_id, participant_id, response (json), submitted_at |
| room_groups | id (uuid), room_id, name, whiteboard_id |
| group_members | id (uuid), group_id, participant_id, is_leader |
| group_submissions | id (uuid), group_id, activity_id, content (json), submitted_by, submitted_at |

### AI
| Table | Key columns |
|---|---|
| ai_jobs | id (uuid), room_id (nullable), user_id, type, status (enum: pending, running, done, failed), result (json), tokens_used (int), created_at, finished_at |
| ai_usage_logs | id (uuid), user_id, school_id, job_id, model, prompt_tokens, completion_tokens, cost_usd, created_at |
| documents | id (uuid), school_id, title, content_hash, storage_path, embedding_model, ingested_at |
| document_chunks | id (uuid), document_id, chunk_index, text (text), embedding (vector) |

---

## Whiteboard event types

| event_type | payload schema |
|---|---|
| stroke.committed | {id, points: [[x,y,p],...], color, width, tool} |
| object.created | {id, object_type, props} |
| object.updated | {id, props_patch} |
| object.deleted | {id} |
| object.transform | {id, x, y, rotation, scaleX, scaleY} |
| scene.changed | {scene_id} |
| viz.solid.created | {id, solid_type, params} |
| viz.solid.updated | {id, params_patch} |
| viz.graph.created | {id, expressions: [str]} |
| viz.graph.updated | {id, expressions_patch} |
| annotation.created | {id, type, props} |
| annotation.deleted | {id} |
| device.pointer.moved | {x, y} (ephemeral, not stored) |
| device.action | {action_type, params} |

---

## Shared TypeScript types (packages/shared-types)

Exported names (do not rename):
- `User`, `School`, `Classroom`, `Room`, `Participant`, `RoomEvent`
- `WhiteboardEvent`, `StrokeCommittedPayload`, `ObjectCreatedPayload`
- `Activity`, `ActivityQuestion`, `ActivityAnswer`
- `PresenterRequest`, `RoomDevice`
- `ApiError`, `PaginatedResponse<T>`
- Zod schemas suffixed with `Schema`: `UserSchema`, `RoomSchema`, etc.

---

## Addendum P10–P12 (Contracts)

### A1. New optional fields on the existing `viz_solid` BoardObject
```ts
interface VizSolidExt {
  display?: {
    labels: boolean;                 // show A,B,C… (default true)
    hiddenEdges: boolean;            // dashed hidden edges (default true)
    faces: boolean;                  // translucent faces (default true)
    faceOpacity: number;             // 0..1 (default 0.08)
    projection: 'perspective' | 'orthographic';
  };
  section?:
    | { mode: 'vertices'; vertexIds: [string, string, string] }   // labels such as 'A','C','G'
    | { mode: 'parallel'; axis: 'x' | 'y' | 'z'; offset: number }
    | null;
  cutAway?: boolean;                 // hide one side of the section plane
  unfoldT?: number;                  // 0 = solid … 1 = flat net
  measures?: Array<{ id: string; kind: 'distance' | 'angle'; vertexIds: string[] }>;
}
```
Defaults apply when a field is missing, so old snapshots/replays keep working. Changes travel through the EXISTING viz patch event. Never emit per-frame events for camera moves.

### A2. Sketch/shape recognizer (package `@ai-classroom/sketch-core`)
- `recognizeShape(points, opts) → { decision: 'snap'|'suggest'|'keep', best, candidates, reason }`.
- Decision thresholds: snap ≥ 0.80 with margin ≥ 0.10; suggest ≥ 0.55; otherwise keep ink.
- Shape objects created from a snap use the current pen color/width and emit the SAME board events the manual shape tools emit.

### A3. Geometry conventions
- Math coordinates Z-up; Three.js conversion `(x,y,z) → (x, z, −y)` in `apps/web/src/lib/coords.ts` only.
- 1 grid cell = 20 world units = 1 cm. Angles in degrees at the UI boundary, radians internally.
- Indonesian vertex labels: cube/cuboid `ABCD.EFGH`, pyramid `T.ABCD`, triangular prism `ABC.DEF`; section points P,Q,R,S,T,U.

### A4. Shared test vectors (geometry-core ⇄ ai-service contract tests)
Unit cube `[0,1]³`: plane z=0.5 → 4 pts, area 1 · plane through (1,0,0),(0,1,0),(0,0,1) → 3 pts, area √3/2 · plane x+y+z=1.5 → 6 pts, area 3√3/4 · plane x=y → 4 pts, area √2 · dihedral(x+y+z=1, z=0) = 54.7356103° · angle(AC,AG) = 35.2643897° · dist(G, plane x+y+z=1) = 2/√3.
Surface areas / volumes: cube 5 → 150 / 125 · cuboid 3×4×5 → 94 / 60 · prism a3 b4 H10 → 132 / 60 · pyramid base 6 h 4 → 96 / 48 · cylinder r7 h10 → 238π / 490π · cone r3 h4 → 24π / 12π · sphere r3 → 36π / 36π.
Store them as `packages/geometry-core/fixtures/solids-p11.json` so Python and TypeScript tests read the same file.
