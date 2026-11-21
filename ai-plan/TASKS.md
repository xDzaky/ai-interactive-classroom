# TASKS.md — master task board (index only; details live in `ai-plan/tasks/Pxx-*.md`)

Legend: `[ ]` TODO · `[~]` in progress · `[x]` done+verified · `[R]` done, needs HIGH review · `[!]` blocked · `[-]` deferred
Line format: `- [status] ID | TIER | deps: ... | title`
Pick rule: the `[~]` task if present, else the first `[ ]` whose deps are all `[x]` and whose TIER ≤ your tier.
Edit ONLY the status marker (and the owner note after it). Never reorder or rename tasks. To add a task, see the bottom of this file.

Owner note format when `[~]`: append `  <-- <model-name> / <tier> / <YYYY-MM-DD HH:MM>`

Spec stage mapping: P00=setup, P01=Stage 1 Foundation, P02=Stage 2 Whiteboard, P03=Stage 3 Math Visualization, P04=Stage 4 Classroom Room, P05=Stage 5 Presenter+Controller, P06=activities (FR-012), P07=Stage 6 Replay+Offline, P08=Stage 7 AI/RAG, P09=Stage 8 Pilot readiness.

---

## P00 — Bootstrap & tooling · `tasks/P00-bootstrap.md`
- [x] P00-T01 | LOW  | deps: -        | Repo skeleton, git, pnpm workspace, .gitignore, copy original docs
- [x] P00-T02 | LOW  | deps: T01      | Docker compose (Postgres+pgvector, Redis) + .env.example
- [x] P00-T03 | MID  | deps: T01,T02  | Laravel 13 API in apps/api (Sanctum, Pest, pgsql, health endpoint)
- [x] P00-T04 | MID  | deps: T01      | React web shell in apps/web (Vite, Tailwind, shadcn, Router, Query, Zustand, Vitest)
- [x] P00-T05 | LOW  | deps: T01,T02  | FastAPI AI service in apps/ai-service (uv, health endpoint, pytest)
- [x] P00-T06 | MID  | deps: T01,T04  | Shared packages scaffold (shared-types, whiteboard-core, geometry-core, math-core, curriculum-schema)
- [x] P00-T07 | LOW  | deps: T03,T04,T05,T06 | Root verify scripts + GitHub Actions CI
- [ ] P00-T08 | LOW  | deps: T03      | OPTIONAL: Laravel Boost (dev) for Laravel-specific agent guidance
- [x] P00-RV  | HIGH | deps: T01-T07  | Phase review

## P01 — Foundation (identity, schools, classrooms, web shell) · `tasks/P01-foundation.md`
- [x] P01-T01 | MID  | deps: P00-T03  | Migrations: UUID users, schools, memberships, classrooms, subjects, curricula
- [x] P01-T02 | MID  | deps: T01      | Auth API (Sanctum SPA cookie): login/logout/me + API error format + CORS
- [x] P01-T03 | MID  | deps: T02      | Schools/classrooms API + policies + tenant isolation tests
- [x] P01-T04 | LOW  | deps: P00-T06  | shared-types: zod schemas for auth/school/classroom/error
- [x] P01-T05 | MID  | deps: T02,T04,P00-T04 | Web: app shell, routing, API client (CSRF), auth store, i18n(id)
- [x] P01-T06 | LOW  | deps: T03,T05  | Web: teacher dashboard (list/create classroom)
- [x] P01-T07 | MID  | deps: T06      | Seeders + Playwright smoke test (login → create classroom)
- [x] P01-RV  | HIGH | deps: T01-T07  | Phase review

## P02 — Whiteboard MVP · `tasks/P02-whiteboard.md`
- [x] P02-T01 | MID  | deps: P00-T06  | whiteboard-core: board model types + zod schemas + event types
- [x] P02-T02 | HIGH | deps: T01      | whiteboard-core: reducer, inverse events, undo/redo history (pure, tested)
- [x] P02-T03 | MID  | deps: T02,P00-T04 | Web: canvas render from state, zoom/pan, grid
- [x] P02-T04 | MID  | deps: T03      | Tools: select/transform, pen, eraser, line/arrow, text
- [x] P02-T05 | MID  | deps: T04      | Shape builder: click-create, drag-resize, numeric panel, snapping
- [x] P02-T06 | MID  | deps: T04      | Pointer Events layer: mouse/pen/touch, palm rejection, pinch zoom
- [x] P02-T07 | MID  | deps: T05      | Layers, grouping, scenes (slides), local JSON save/load
- [x] P02-T08 | LOW  | deps: T03      | Export active scene to PNG
- [x] P02-RV  | HIGH | deps: T01-T08  | Phase review

## P03 — Math visualization · `tasks/P03-math-viz.md`
- [x] P03-T01 | MID  | deps: P00-T06  | geometry-core: solid formulas + shared fixtures + tests
- [x] P03-T02 | MID  | deps: T01,P00-T04 | Web: Three geometry builders per solid (+ bounding-box tests)
- [x] P03-T03 | MID  | deps: T02      | Web: SolidViewer (R3F), parameter panel, labels, clip plane, low-quality mode, WebGL fallback
- [x] P03-T04 | HIGH | deps: P00-T06  | math-core: safe expression evaluator (AST whitelist) + MathLive adapter
- [x] P03-T05 | MID  | deps: T04,P00-T04 | Web: GraphViewer (Mafs) + expression list
- [x] P03-T06 | HIGH | deps: T03,T05,P02-T07 | Integrate viz.solid / viz.graph objects into whiteboard (DOM overlay layer)
- [x] P03-RV  | HIGH | deps: T01-T06  | Phase review

## P04 — Classroom room (rooms, join, realtime, views) · `tasks/P04-room.md`
- [x] P04-T01 | MID  | deps: P01-T01  | Migrations: rooms, participants, whiteboards, events, snapshots, audit_logs
- [x] P04-T02 | HIGH | deps: T01,P01-T02 | Room domain: create, lifecycle, lock, regenerate code, expiry command
- [x] P04-T03 | HIGH | deps: T02      | Join flow (guest + account), participant tokens, rate limits
- [x] P04-T04 | HIGH | deps: T03,P00-T03 | Reverb install + channel authorization with participant guard
- [~] P04-T05 | HIGH | deps: T04      | Event ingestion API (seq, idempotency, permission allowlist, broadcast) + sync endpoints  <-- Claude Antigravity / HIGH / 2026-11-21 15:33
- [ ] P04-T06 | MID  | deps: T02,P01-T05 | Web: quick setup (adaptive mode), create room, lobby, QR
- [ ] P04-T07 | MID  | deps: T05,T06,P02-T07 | Web: Teacher / Presentation / Student views
- [ ] P04-T08 | HIGH | deps: T05,P02-T02 | Web: realtime sync engine (ordering, gap fill, dedupe, optimistic)
- [ ] P04-T09 | LOW  | deps: T05,T07  | Host participant list
- [ ] P04-RV  | HIGH | deps: T01-T09  | Phase review

## P05 — Presenter approval + mobile controller · `tasks/P05-presenter-controller.md`
- [ ] P05-T01 | LOW  | deps: P04-T01  | Migrations: presenter_requests, room_permissions, room_devices
- [ ] P05-T02 | HIGH | deps: T01,P04-T05 | Presenter workflow API + server enforcement
- [ ] P05-T03 | MID  | deps: T02,P04-T07 | Web: Raise Hand, host queue, approve dialog with scope
- [ ] P05-T04 | HIGH | deps: T01,P04-T05 | Device pairing API (pair/confirm/revoke, device auth)
- [ ] P05-T05 | MID  | deps: T04,P04-T08 | Web: Mobile Controller app (/controller)
- [ ] P05-T06 | LOW  | deps: T04,P04-T07 | Web: Connect Device modal (QR) + device list/revoke
- [ ] P05-T07 | MID  | deps: T02,T04  | End room revokes all tokens/permissions/devices (FR-016)
- [ ] P05-RV  | HIGH | deps: T01-T07  | Phase review

## P06 — Activities: poll, quiz, group · `tasks/P06-activities.md`
- [ ] P06-T01 | MID  | deps: P04-T01  | Migrations: lesson_sessions, activities, questions, answers, room_groups, group_members, group_submissions
- [ ] P06-T02 | MID  | deps: T01,P04-T03 | Poll/quiz API (answer key hidden from students)
- [ ] P06-T03 | MID  | deps: T02,P04-T07 | Web: host builder, student responder, results dashboard
- [ ] P06-T04 | HIGH | deps: T01,P04-T08 | Group workspace (own channel + board) + leader submission
- [ ] P06-T05 | LOW  | deps: P04-T07  | Timer, random picker, group generator
- [ ] P06-RV  | HIGH | deps: T01-T05  | Phase review

## P07 — Replay + offline · `tasks/P07-replay-offline.md`
- [ ] P07-T01 | MID  | deps: P04-T05  | Snapshot API + host-client snapshot creator
- [ ] P07-T02 | HIGH | deps: T01,P02-T02 | Replay engine (nearest snapshot + events, seek/step/speed)
- [ ] P07-T03 | MID  | deps: T02      | Replay UI (timeline, controls, key-event highlights)
- [ ] P07-T04 | HIGH | deps: P04-T08  | Dexie: drafts + persistent outbox with idempotency keys
- [ ] P07-T05 | HIGH | deps: T04      | Sync states + reconnect flush (saved locally/syncing/synced/needs attention)
- [ ] P07-T06 | MID  | deps: P03-T03  | PWA (vite-plugin-pwa/Workbox), lazy loading, low-quality 3D default on weak devices
- [ ] P07-RV  | HIGH | deps: T01-T06  | Phase review

## P08 — AI / RAG · `tasks/P08-ai-rag.md`
- [ ] P08-T01 | MID  | deps: P00-T05  | ai-service structure, internal auth, LiteLLM wrapper
- [ ] P08-T02 | HIGH | deps: T01,P03-T01 | Geometry/math service with shared fixtures (contract tests TS↔Python)
- [ ] P08-T03 | HIGH | deps: T01,P01-T03 | Document ingestion + embeddings + pgvector (needs ADR-020 filled by human)
- [ ] P08-T04 | HIGH | deps: T03      | Scoped retrieval + cited answers
- [ ] P08-T05 | HIGH | deps: T01,P04-T03 | Laravel AI job layer (202 + job_id, usage log, rate limit)
- [ ] P08-T06 | MID  | deps: T05      | Teacher AI UI: outline/quiz generator with edit+approve
- [ ] P08-T07 | MID  | deps: T04,T05  | Student AI tutor UI (hint-first)
- [ ] P08-T08 | HIGH | deps: P02-T06,P03-T06 | OPTIONAL: rule-based sketch recognition + clarification UI
- [ ] P08-RV  | HIGH | deps: T01-T07  | Phase review

## P09 — Pilot readiness · `tasks/P09-pilot.md`
- [ ] P09-T01 | HIGH | deps: P05-RV    | Security pass (authz matrix tests, rate limits, headers)
- [ ] P09-T02 | HIGH | deps: P07-RV    | Privacy: retention job, export/erasure, consent notice
- [ ] P09-T03 | MID  | deps: P07-RV    | Accessibility pass
- [ ] P09-T04 | MID  | deps: P05-RV    | Playwright multi-context E2E (teacher + student + controller)
- [ ] P09-T05 | MID  | deps: P07-RV    | Performance + network throttling checks
- [ ] P09-T06 | MID  | deps: P08-T05   | Observability: structured logs, error hook, AI cost log
- [ ] P09-T07 | LOW  | deps: P09-T04   | Pilot checklist + device compatibility matrix doc
- [ ] P09-RV  | HIGH | deps: T01-T07   | Final review

---

## How to add a task (HIGH tier or human only)
1. Add one line in the right phase here (new ID, never reuse).
2. Add a section in the phase file using the template below.
```
### Pxx-Tyy — Title   [tier: MID] [deps: ...]
Goal: one sentence.
Allowed paths: exact paths (mark "(additive)" for locked files).
Read: exact files / CONTRACTS sections.
Steps:
- [ ] 1. ...
Verify:
- `command` → expected result
Refs: URLs from REFERENCES.md
```
