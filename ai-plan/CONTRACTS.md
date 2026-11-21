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
