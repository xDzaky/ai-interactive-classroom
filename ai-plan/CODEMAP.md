# CODEMAP.md — map of the code so nobody has to scan the repo

Rules:
- Every file created/changed by a task gets ONE row here at end-of-task. Keep purpose ≤ 12 words.
- Status: `OK` finished · `STUB` incomplete (explain) · `LOCKED` finished + verified (LOW/MID may not change it; see AGENTS.md §5).
- When a task becomes `[x]`, change its rows to `LOCKED`.
- Keep rows sorted by path inside each section. Do not delete rows of existing files.
- "Exports" = what other code imports (function/class/component names). This is what lets other agents reuse code without opening the file.
- "Pattern to copy" section at the bottom: HIGH-tier agents point LOW/MID agents to the best example file for each kind of work.

## apps/api (Laravel)
| Path | Purpose | Exports / routes | Task | Status |
|---|---|---|---|---|
| apps/api/app/Http/Controllers/AiJobController.php | Stub AI job CRUD controller | POST /api/v1/ai/jobs, GET /api/v1/ai/jobs/{id} | P00-T03 | LOCKED |
| apps/api/app/Http/Controllers/ClassroomController.php | Stub classroom CRUD controller | GET/POST /api/v1/classrooms | P00-T03 | LOCKED |
| apps/api/app/Http/Controllers/LoginController.php | Stub login/logout/me controller | POST /api/v1/auth/login, POST /api/v1/auth/logout, GET /api/v1/auth/me | P00-T03 | LOCKED |
| apps/api/app/Http/Controllers/RoomController.php | Stub room CRUD controller | GET/POST /api/v1/rooms | P00-T03 | LOCKED |
| apps/api/app/Http/Controllers/SchoolController.php | Stub school CRUD controller | GET/POST /api/v1/schools | P00-T03 | LOCKED |
| apps/api/app/Models/User.php | UUID user model with role enum | User (Eloquent model) | P00-T03 | LOCKED |
| apps/api/bootstrap/app.php | App bootstrap: API routes, Sanctum, JSON errors | — | P00-T03 | LOCKED |
| apps/api/database/migrations/*_create_users_table.php | UUID pk, role enum, school_id migration | — | P00-T03 | LOCKED |
| apps/api/database/migrations/*_create_personal_access_tokens.php | UUID morphs for Sanctum tokens | — | P00-T03 | LOCKED |
| apps/api/database/migrations/*_enable_pgvector.php | Enables pgvector extension (pgsql guard) | — | P00-T03 | LOCKED |
| apps/api/routes/api.php | All API routes: health, auth, schools, classrooms, rooms, ai/jobs | — | P00-T03 | LOCKED |
| apps/api/tests/Feature/HealthTest.php | Health endpoint feature tests (2 tests) | — | P00-T03 | LOCKED |

## apps/web (React)
| Path | Purpose | Exports | Task | Status |
|---|---|---|---|---|
| apps/web/index.html | Vite HTML entrypoint | — | P00-T04 | LOCKED |
| apps/web/package.json | Web app deps (React 19, Vite 6, Tailwind 4, etc.) | — | P00-T04 | LOCKED |
| apps/web/vite.config.ts | Vite config: React, Tailwind, PWA, proxy, chunks | — | P00-T04 | LOCKED |
| apps/web/vitest.config.ts | Vitest config: jsdom, setup, coverage | — | P00-T04 | LOCKED |
| apps/web/tsconfig.json | TS config for src (strict, bundler moduleResolution) | — | P00-T04 | LOCKED |
| apps/web/tsconfig.node.json | TS config for vite/vitest configs (composite) | — | P00-T04 | LOCKED |
| apps/web/src/index.css | Tailwind v4 CSS import | — | P00-T04 | LOCKED |
| apps/web/src/main.tsx | App entrypoint: QueryClient + RouterProvider | — | P00-T04 | LOCKED |
| apps/web/src/lib/api.ts | Axios instance with CSRF interceptor | api (axios instance) | P00-T04 | LOCKED |
| apps/web/src/router/index.tsx | React Router v7 lazy routes for all pages | router | P00-T04 | LOCKED |
| apps/web/src/stores/authStore.ts | Zustand auth store with persist middleware | useAuthStore | P00-T04 | LOCKED |
| apps/web/src/i18n/index.ts | i18next setup with Indonesian locale | i18n | P00-T04 | LOCKED |
| apps/web/src/i18n/locales/id.json | Full Indonesian translation strings | — | P00-T04 | LOCKED |
| apps/web/src/pages/LoginPage.tsx | Login page stub | LoginPage | P00-T04 | STUB (form impl in P01-T05) |
| apps/web/src/pages/DashboardPage.tsx | Dashboard page stub | DashboardPage | P00-T04 | STUB (impl in P01-T06) |
| apps/web/src/pages/RoomPage.tsx | Room page stub | RoomPage | P00-T04 | STUB (impl in P04-T07) |
| apps/web/src/pages/JoinPage.tsx | Join room page stub | JoinPage | P00-T04 | STUB (impl in P04-T06) |
| apps/web/src/pages/ControllerPage.tsx | Mobile controller page stub | ControllerPage | P00-T04 | STUB (impl in P05-T05) |
| apps/web/src/pages/NotFoundPage.tsx | 404 page | NotFoundPage | P00-T04 | LOCKED |
| apps/web/src/test/setup.ts | Vitest global test setup (jest-dom) | — | P00-T04 | LOCKED |
| apps/web/src/test/NotFoundPage.test.tsx | NotFoundPage component test (1 test) | — | P00-T04 | LOCKED |

## apps/ai-service (FastAPI)
| Path | Purpose | Exports / routes | Task | Status |
|---|---|---|---|---|
| apps/ai-service/main.py | FastAPI app + /health + stub AI job endpoints | app (FastAPI) | P00-T05 | LOCKED |
| apps/ai-service/pyproject.toml | uv project config + all deps from STACK.md | — | P00-T05 | LOCKED |
| apps/ai-service/tests/test_health.py | 5 tests: health, job auth, job CRUD stubs | — | P00-T05 | LOCKED |

## packages/*
| Path | Purpose | Exports | Task | Status |
|---|---|---|---|---|
| packages/shared-types/src/index.ts | Zod schemas + TS types for all CONTRACTS entities | User, School, Classroom, Room, Participant, RoomEvent, PresenterRequest, RoomDevice, Activity, ApiError, PaginatedResponse, etc. | P00-T06 | LOCKED |
| packages/whiteboard-core/src/index.ts | Board model types + initial state factory | BoardObject, BoardStroke, SceneState, BoardState, createInitialBoardState | P00-T06 | LOCKED |
| packages/geometry-core/src/index.ts | Solid type enum + geometry result types (placeholder) | SolidType, GeometryResult | P00-T06 | STUB (formulas in P03-T01) |
| packages/math-core/src/index.ts | Recursive descent parser, safe AST evaluator, MathLive LaTeX adapter | ASTNode, SafeScope, ParseError, EvaluationError, ALLOWED_FUNCTIONS, parseExpression, evaluateAST, safeEvaluate, parseMathLiveLatex | P03-T04 | OK |
| packages/math-core/src/index.test.ts | 76 unit tests for parser, evaluator, security, MathLive adapter | — | P03-T04 | OK |
| packages/curriculum-schema/src/index.ts | Subject/Curriculum/LessonTopic Zod schemas | Subject, Curriculum, LessonTopic | P00-T06 | LOCKED |

## infra / root / CI
| Path | Purpose | Notes | Task | Status |
|---|---|---|---|---|
| .github/workflows/ci.yml | GitHub Actions CI: 4 jobs (api, packages, web, ai-service) | Runs on push/PR to main | P00-T07 | LOCKED |
| .gitignore | Monorepo gitignore (Node, PHP, Python, Vite, etc.) | — | P00-T01 | LOCKED |
| .env.example | Root env vars template | — | P00-T02 | LOCKED |
| docker-compose.yml | Postgres+pgvector, Redis, Mailpit services | YAML valid; runtime not tested (no Docker on host) | P00-T02 | LOCKED |
| infra/postgres/init.sql | pgvector + uuid-ossp + classroom_test DB setup | — | P00-T02 | LOCKED |
| package.json | Root workspace scripts + engine/pnpm version | — | P00-T01 | LOCKED |
| pnpm-workspace.yaml | pnpm workspace packages + vite override | apps/web, packages/* | P00-T01 | LOCKED |
| README.md | Project README | — | P00-T01 | LOCKED |
| ai-plan/TASKS.md | Master task board | — | P00-T01 | OK |
| ai-plan/CODEMAP.md | This file — code map | — | ongoing | OK |
| ai-plan/CONTRACTS.md | API/DB/event contracts (source of truth for names) | — | P00-T01 | LOCKED |
| ai-plan/STACK.md | Allowed packages and versions | — | P00-T01 | LOCKED |
| ai-plan/REFERENCES.md | Allowed documentation URLs | — | P00-T01 | LOCKED |
| ai-plan/DECISIONS.md | Architecture decision log | — | P00-T01 | OK |
| ai-plan/KNOWLEDGE.md | Pitfalls and lessons learned | — | ongoing | OK |
| ai-plan/PROGRESS-LOG.md | Session activity log | — | ongoing | OK |
| ai-plan/REVIEW.md | HIGH-tier review protocol | — | P00-T01 | LOCKED |
| ai-plan/PROMPTS.md | Copy-paste prompts for the human | — | P00-T01 | LOCKED |
| ai-plan/tasks/P00-bootstrap.md | P00 task detail file | — | P00-T01 | OK |
| docs/AI-Interactive-Classroom-Tech-Spec.md | Original technical specification | DO NOT MODIFY | P00-T01 | LOCKED |
| docs/Proposal-AI-Interactive-Classroom.md | Original product proposal | DO NOT MODIFY | P00-T01 | LOCKED |

## Patterns to copy (filled by HIGH-tier agents)
| Kind of work | Best example file | Why |
|---|---|---|
| Laravel controller stub | apps/api/app/Http/Controllers/LoginController.php | Minimal resource controller, correct namespace |
| Laravel feature test | apps/api/tests/Feature/HealthTest.php | PHPUnit + Laravel TestCase, JSON response assertions |
| React page stub | apps/web/src/pages/NotFoundPage.tsx | Minimal page, useTranslation hook, Tailwind |
| Zustand store | apps/web/src/stores/authStore.ts | persist middleware, TypeScript typed, selectors |
| Vitest component test | apps/web/src/test/NotFoundPage.test.tsx | MemoryRouter wrapper, RTL, jest-dom matchers |
| Zod schema + TS type | packages/shared-types/src/index.ts | z.infer pattern, branded UUIDs, discriminated unions |
| FastAPI endpoint test | apps/ai-service/tests/test_health.py | httpx AsyncClient, auth header pattern |

## P02 — Whiteboard MVP

| path | purpose | public exports | task | status |
|------|---------|---------------|------|--------|
| packages/whiteboard-core/src/index.ts | Board state types, Zod schemas, event type union, factory helpers | BoardStroke, BoardObject, Transform, SceneState, BoardState, WhiteboardEvent, WhiteboardEventType, createInitialBoardState, getActiveScene, createScene | P02-T01 | LOCKED |
| packages/whiteboard-core/src/reducer.ts | Pure reducer: applyEvent, applyInverse, undo/redo history management | applyEvent, applyInverse, pushHistory, undo, redo, createHistory, InverseEvent, WhiteboardHistory, HistoryResult | P02-T02 | LOCKED |
| packages/whiteboard-core/src/reducer.test.ts | 22 vitest tests: all event types, inverse round-trips, undo/redo stack | — | P02-T02 | LOCKED |

| path | purpose | public exports | task | status |
|------|---------|---------------|------|--------|
| apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx | Konva Stage canvas: strokes (perfect-freehand), objects, zoom/pan, grid layer | WhiteboardCanvas, WhiteboardCanvasProps | P02-T03 | LOCKED |
| apps/web/src/hooks/useWhiteboardTool.ts | Tool state machine: 9 tools → WhiteboardEvents on pointer up | useWhiteboardTool, ToolType, ToolState | P02-T04 | LOCKED |
| apps/web/src/components/whiteboard/ToolBar.tsx | Toolbar UI + ShapePropertiesPanel (accessible, Indonesian labels) | ToolBar, ShapePropertiesPanel | P02-T05 | LOCKED |
| apps/web/src/lib/snapping.ts | Grid snap, axis constrain, anchor snap pure functions | snapToGrid, snapSize, constrainToAxis, snapToAnchors | P02-T05 | LOCKED |
| apps/web/src/hooks/usePointerEvents.ts | Unified pointer handler: mouse/pen/touch, palm rejection, pinch-zoom | usePointerEvents, ViewTransform, WorldPoint | P02-T06 | LOCKED |
| apps/web/src/lib/sceneManager.ts | Scene CRUD, reorder, localStorage, JSON export/import | addScene, removeScene, renameScene, switchScene, exportBoardJson, importBoardJson, saveBoardToLocal, loadBoardFromLocal | P02-T07 | LOCKED |
| apps/web/src/lib/exportPng.ts | Export Konva stage to PNG download | exportStageToPng, exportStageToBlob | P02-T08 | LOCKED |
| apps/web/src/components/math/GraphViewer.tsx | Mafs 2D graphing viewer + expression list side panel (controlled & uncontrolled) | GraphViewer, ExpressionEntry, GraphViewerProps | P03-T05 | OK |
| apps/web/src/components/math/GraphViewer.test.tsx | 16 vitest tests for GraphViewer (controlled + uncontrolled modes) | — | P03-T05 | OK |
| apps/web/src/r3f-types.d.ts | Augments React.JSX.IntrinsicElements with ThreeElements for react-jsx compat | — | P03-T05 | OK |
| apps/web/src/vite-env.d.ts | Vite + R3F type references | — | P03-T05 | OK |
| apps/web/src/pages/whiteboard/WhiteboardOverlay.tsx | DOM overlay layer for viz_solid + viz_graph BoardObjects over Konva canvas | WhiteboardOverlay, WhiteboardOverlayProps, ViewTransform | P03-T06 | OK |
| apps/web/src/pages/whiteboard/WhiteboardOverlay.test.tsx | 11 vitest tests for overlay positioning + rendering | — | P03-T06 | OK |
| apps/api/database/migrations/2026_11_21_200001_create_rooms_table.php | rooms migration (uuid pk, classroom_id, host_id, code, status, mode, settings, starts_at, ends_at) | — | P04-T01 | LOCKED |
| apps/api/database/migrations/2026_11_21_200002_create_participants_table.php | participants migration (uuid pk, room_id, user_id nullable, alias, role, token_hash, joined_at, left_at) | — | P04-T01 | LOCKED |
| apps/api/database/migrations/2026_11_21_200003_create_whiteboards_table.php | whiteboards migration (uuid pk, room_id, name, scene_data) | — | P04-T01 | LOCKED |
| apps/api/database/migrations/2026_11_21_200004_create_room_events_table.php | room_events migration (uuid pk, room_id, seq, event_type, payload, actor_id, idempotency_key, committed_at) | — | P04-T01 | LOCKED |
| apps/api/database/migrations/2026_11_21_200005_create_room_snapshots_table.php | room_snapshots migration (uuid pk, room_id, seq_at, state, created_at) | — | P04-T01 | LOCKED |
| apps/api/database/migrations/2026_11_21_200006_create_audit_logs_table.php | audit_logs migration (uuid pk, room_id, actor_id, action, metadata, created_at) | — | P04-T01 | LOCKED |
| apps/api/tests/Feature/MigrationP04Test.php | 12 schema-shape tests for all 6 P04 tables | — | P04-T01 | LOCKED |
| apps/api/app/Models/Room.php | Room model — generateCode, canTransitionTo, relationships | Room | P04-T02 | LOCKED |
| apps/api/app/Models/Participant.php | Participant model | Participant | P04-T02 | LOCKED |
| apps/api/app/Models/Whiteboard.php | Whiteboard model | Whiteboard | P04-T02 | LOCKED |
| apps/api/app/Models/RoomEvent.php | RoomEvent model | RoomEvent | P04-T02 | LOCKED |
| apps/api/app/Models/RoomSnapshot.php | RoomSnapshot model | RoomSnapshot | P04-T02 | LOCKED |
| apps/api/app/Models/AuditLog.php | AuditLog model | AuditLog | P04-T02 | LOCKED |
| apps/api/app/Policies/RoomPolicy.php | Room authorization policy | RoomPolicy | P04-T02 | LOCKED |
| apps/api/app/Http/Controllers/Api/V1/RoomController.php | Room API — store/show/update/end/regenerateCode/join(stub) | RoomController | P04-T02 | LOCKED |
| apps/api/app/Console/Commands/ExpireRoomsCommand.php | rooms:expire Artisan command | ExpireRoomsCommand | P04-T02 | LOCKED |
| apps/api/database/factories/SchoolFactory.php | School model factory | SchoolFactory | P04-T02 | LOCKED |
| apps/api/database/factories/ClassroomFactory.php | Classroom model factory | ClassroomFactory | P04-T02 | LOCKED |
| apps/api/tests/Feature/RoomApiTest.php | 15 feature tests for Room domain API | — | P04-T02 | LOCKED |
| apps/api/tests/Feature/RoomJoinTest.php | 14 feature tests for join flow (guest, auth, tokens, errors) | — | P04-T03 | LOCKED |
| apps/web/src/pages/room/TeacherView.tsx | Teacher view — writable whiteboard, toolbar, room controls (end room, participant sidebar stub) | TeacherView, TeacherViewProps | P04-T07 | LOCKED |
| apps/web/src/pages/room/PresentationView.tsx | Presentation/projector view — read-only whiteboard, fullscreen toggle | PresentationView, PresentationViewProps | P04-T07 | LOCKED |
| apps/web/src/pages/room/StudentView.tsx | Student view — read-only whiteboard, raise hand (FR-013), follow-teacher toggle | StudentView, StudentViewProps | P04-T07 | LOCKED |
| apps/web/src/pages/room/RoomPage.tsx | Room router — decodes token/role, routes to Teacher/Student/Presentation view | RoomPage (default) | P04-T07 | LOCKED |
| apps/web/src/lib/api/rooms.ts | rooms API client — added fetchMe (GET /rooms/{room}/participants/me) | fetchMe | P04-T07 | LOCKED |
| apps/web/src/pages/room/TeacherView.test.tsx | 4 tests for TeacherView | — | P04-T07 | LOCKED |
| apps/web/src/pages/room/PresentationView.test.tsx | 3 tests for PresentationView | — | P04-T07 | LOCKED |
| apps/web/src/pages/room/StudentView.test.tsx | 4 tests for StudentView | — | P04-T07 | LOCKED |
| apps/web/src/pages/room/RoomPage.test.tsx | 4 tests for RoomPage routing | — | P04-T07 | LOCKED |
| apps/web/src/lib/syncEngine.ts | Realtime sync engine — seq ordering, gap detection, backfill (GET /events?after=N), dedupe, applyEvent. useSyncEngine React hook. | SyncEngine, useSyncEngine, BroadcastPayload, RemoteEvent | P04-T08 | LOCKED |
| apps/web/src/lib/syncEngine.test.ts | 8 tests for SyncEngine (in-order, dedup, gap-fill, backfill, seed, error) | — | P04-T08 | LOCKED |
| apps/api/app/Http/Controllers/Api/V1/RoomController.php | Room API — added participants() + participantMe() endpoints | participants(), participantMe() | P04-T09 | LOCKED |
| apps/api/routes/api.php | Added GET /rooms/{room}/participants + /participants/me routes under ParticipantTokenGuard | — | P04-T09 | LOCKED |
| apps/api/tests/Feature/ParticipantListTest.php | 7 feature tests for participant list endpoints | — | P04-T09 | LOCKED |
| apps/web/src/components/room/ParticipantList.tsx | Real-time participant list sidebar (REST poll + useEchoPresence presence channel) | ParticipantList, ParticipantListProps, ParticipantInfo | P04-T09 | LOCKED |
| apps/web/src/components/room/ParticipantList.test.tsx | 4 tests for ParticipantList component | — | P04-T09 | LOCKED |
| apps/api/database/migrations/2026_11_21_300001_create_presenter_requests_table.php | presenter_requests migration (uuid pk, room_id, participant_id, status, scope, expires_at) | — | P05-T01 | LOCKED |
| apps/api/database/migrations/2026_11_21_300002_create_room_permissions_table.php | room_permissions migration (uuid pk, room_id, participant_id, permission, granted_by, granted_at, revoked_at) | — | P05-T01 | LOCKED |
| apps/api/database/migrations/2026_11_21_300003_create_room_devices_table.php | room_devices migration (uuid pk, room_id, device_id, device_name, token_hash, paired_at, revoked_at) | — | P05-T01 | LOCKED |
| apps/api/tests/Feature/MigrationP05Test.php | 6 schema-shape tests for all 3 P05 tables | — | P05-T01 | LOCKED |
| apps/api/app/Models/PresenterRequest.php | PresenterRequest Eloquent model | PresenterRequest | P05-T02 | LOCKED |
| apps/api/app/Models/RoomPermission.php | RoomPermission Eloquent model | RoomPermission | P05-T02 | LOCKED |
| apps/api/app/Models/RoomDevice.php | RoomDevice Eloquent model | RoomDevice | P05-T02 | LOCKED |
| apps/api/app/Http/Controllers/Api/V1/PresenterRequestController.php | Presenter request CRUD — POST/GET/PATCH/DELETE /rooms/{room}/presenter-requests | store, index, update, destroy | P05-T02 | LOCKED |
| apps/api/tests/Feature/PresenterRequestTest.php | 8 feature tests for presenter-requests CRUD (raise hand, approve, reject, revoke, duplicate guard) | — | P05-T02 | LOCKED |
| apps/web/src/lib/api/presenterRequests.ts | API client for presenter-request endpoints (raiseHand, listPresenterRequests, updatePresenterRequest, deletePresenterRequest) | raiseHand, listPresenterRequests, updatePresenterRequest, deletePresenterRequest, PRStatus, PRScope, PresenterRequest | P05-T03 | LOCKED |
| apps/web/src/components/room/RaiseHandButton.tsx | Student raise-hand button — POST /presenter-requests + DELETE on lower | RaiseHandButton, RaiseHandButtonProps | P05-T03 | LOCKED |
| apps/web/src/components/room/PresenterQueue.tsx | Teacher queue of pending presenter requests + ApproveDialog (scope selector) | PresenterQueue, PresenterQueueProps | P05-T03 | LOCKED |
| apps/web/src/components/room/RaiseHandButton.test.tsx | 4 tests for RaiseHandButton | — | P05-T03 | LOCKED |
| apps/web/src/components/room/PresenterQueue.test.tsx | 4 tests for PresenterQueue + ApproveDialog | — | P05-T03 | LOCKED |
| apps/api/app/Http/Controllers/Api/V1/DeviceController.php | Device pairing CRUD — POST/GET/DELETE /rooms/{room}/devices + confirm | store, index, destroy, confirm | P05-T04 | LOCKED |
| apps/api/tests/Feature/DevicePairingTest.php | 7 feature tests for device pairing (initiate, confirm, revoke, list) | — | P05-T04 | LOCKED |
| apps/web/src/pages/room/ControllerPage.tsx | Mobile Controller app — gesture controls (prev/next/zoom/pointer/blank), sends device.* events | ControllerPage | P05-T05 | LOCKED |
| apps/web/src/pages/room/ControllerPage.test.tsx | 5 tests for ControllerPage gesture controls | — | P05-T05 | LOCKED |
| apps/web/src/i18n/locales/id.json | Added controller.* i18n keys for mobile controller UI | — | P05-T05 | LOCKED |
| apps/web/src/lib/api/devices.ts | API client for device-pairing endpoints (initiateDevice, listDevices, revokeDevice) | initiateDevice, listDevices, revokeDevice, RoomDevice, InitiatedDevice | P05-T06 | LOCKED |
| apps/web/src/lib/api/devices.test.ts | 4 tests for devices API client | — | P05-T06 | LOCKED |
| apps/web/src/components/room/ConnectDeviceModal.tsx | Teacher modal — QR pairing, device list, revoke | ConnectDeviceModal, ConnectDeviceModalProps | P05-T06 | LOCKED |
| apps/web/src/components/room/ConnectDeviceModal.test.tsx | 4 tests for ConnectDeviceModal | — | P05-T06 | LOCKED |
| apps/web/src/pages/room/TeacherView.tsx | Added ConnectDeviceModal import + deviceModalOpen state + Connect Device button | (unchanged exports) | P05-T06 | LOCKED |
| apps/web/src/i18n/locales/id.json | Added device.* i18n keys for ConnectDeviceModal | — | P05-T06 | LOCKED |
