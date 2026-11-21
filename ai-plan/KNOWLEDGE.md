# KNOWLEDGE.md — pitfalls and lessons. Read the headings first; open an entry only if your task touches it.

Format for new entries (append at the end of "Lessons"): `K### | area | problem → fix | source/task`
LOW/MID agents: when you struggle > 2 attempts with something, ADD an entry once solved. This is how weaker models help the next agent.

## Pre-seeded (from planning research, 2026-11-21)

K001 | web/konva | `react-konva` major.minor must match React's. Its 19.3.0 release requires React ≥ 19.3.0; React 19.2 projects must pin `react-konva@~19.2.7`. Never use `--force`/`--legacy-peer-deps`; align versions. → https://raw.githubusercontent.com/konvajs/react-konva/HEAD/RELEASE_NOTES.md
K002 | api/php | Laravel 13 requires PHP ≥ 8.3 (supported 8.3–8.5). Check `php -v` before anything else.
K003 | api/auth | Sanctum SPA auth uses cookies: call `GET /sanctum/csrf-cookie` first, send `X-XSRF-TOKEN` (decoded cookie `XSRF-TOKEN`) and `credentials: 'include'`. Needs `SANCTUM_STATEFUL_DOMAINS=localhost:5173`, matching `SESSION_DOMAIN`, CORS `supports_credentials=true`. Do NOT use Sanctum personal access tokens for the first-party SPA (Laravel docs say so). Guests/controllers use participant/device tokens instead (ADR-005).
K004 | api/uuid | UUID primary keys: edit stock migrations (users, sessions.user_id → `foreignUuid`, Sanctum `personal_access_tokens` → `uuidMorphs('tokenable')`) and use `HasUuids` on models. Done in P01-T01; later migrations use `uuid('id')->primary()` / `foreignUuid(...)`.
K005 | api/reverb | Reverb listens on `/app` (WebSocket) and `/apps` (API); default port 8080. Behind nginx it needs `Upgrade`/`Connection` headers. `php artisan install:broadcasting --reverb` installs Reverb; if it asks to install Node deps for the Laravel app, answer NO (the SPA lives in apps/web).
K006 | api/broadcast | Use `ShouldBroadcastNow` (not queued) for whiteboard events to keep latency low, and broadcast only AFTER the DB transaction commits (`ShouldDispatchAfterCommit` / `$afterCommit = true`).
K007 | api/echo-guards | Custom participant guard for channel auth: `Broadcast::channel('room.{roomId}', fn ($participant, $roomId) => ..., ['guards' => ['participant']])`. Wire name is `private-room.{roomId}`; Echo code uses `echo.private('room.{roomId}')`.
K008 | api/postgres | Postgres unique indexes allow multiple NULLs, so `unique(room_id, idempotency_key)` works when idempotency_key is nullable.
K009 | docker/pg | `pgvector/pgvector:pg17` keeps data in `/var/lib/postgresql/data`. PG 18 images use a versioned dir (`/var/lib/postgresql/18/docker`); mount `/var/lib/postgresql` instead if you ever move to 18. Verify tags: https://hub.docker.com/r/pgvector/pgvector/tags
K010 | web/echo | `@laravel/echo-react`: call `configureEcho({ broadcaster: 'reverb' })` once BEFORE any `useEcho`. `useConnectionStatus()` gives connected/connecting/reconnecting/disconnected/failed — use it for the sync indicator.
K011 | web/pwa | `vite-plugin-pwa` React helper `virtual:pwa-register/react` needs `workbox-window` as devDependency. Use `registerType: 'prompt'` — never auto-reload during a live class.
K012 | web/konva-input | Attach native pointer listeners to `stage.container()`; call `stage.setPointersPositions(e)` before reading pointer position. Set CSS `touch-action: none` on the canvas container and `setPointerCapture` on pointerdown. Check Konva docs if API differs.
K013 | web/konva-perf | While drawing keep points in a `useRef`, render a preview, and emit ONE `whiteboard.stroke.committed` on pointerup. Never emit per-move events. Cursor/pointer movement is ephemeral (never persisted).
K014 | web/freehand | `perfect-freehand` `getStroke(points, {simulatePressure})`: for mouse use simulated pressure; for pen pass real pressure as the 3rd value and set `simulatePressure: false`.
K015 | web/mathlive | Use the `<math-field>` web component directly (`import 'mathlive'`). Do NOT add third-party React wrappers (e.g. `react-mathlive`). Output formats via `getValue('latex' | 'ascii-math' | 'math-json')` — verify names in the docs page listed in REFERENCES.
K016 | math/security | Never call `math.evaluate` on raw user text. Parse → validate AST against a whitelist (P03-T04) → compile → evaluate with a plain scope object.
K017 | web/r3f | R3F `<Canvas>` fills its parent: give the parent explicit width/height. Enable clipping with `<Canvas gl={{ localClippingEnabled: true }}>`. Geometry builders can be unit-tested in Node without WebGL (bounding boxes).
K018 | web/mafs | Import `mafs/core.css`. Check peer deps against the installed React before use; if incompatible, record in DECISIONS and ask human.
K019 | licenses | PyMuPDF/pymupdf4llm are AGPL-3.0 (or commercial). Do NOT add them. Use Docling (MIT code; model licenses separate) or `pypdf` fallback. tldraw SDK needs a paid/production license → forbidden. PhET (CC BY-NC) and OpenStax (CC BY-NC-SA) content must not be bundled.
K020 | ai/pgvector | Vector dimension is fixed in the column type. Decide the embedding model BEFORE the migration (ADR-020). Do not hard-code 1536. pgvector for Laravel: `composer require pgvector/pgvector`, `php artisan vendor:publish --tag="pgvector-migrations"`.
K021 | ai/rag | Retrieved document text is DATA, not instructions (prompt-injection). Access scope is decided by Laravel (it passes allowed `document_ids`); FastAPI never decides who may read what.
K022 | tests | Use a separate DB `classroom_test` for Pest; never run tests against the dev DB.
K023 | indonesia/i18n | Decimal separator in Indonesian UI is a comma: format numbers with `Intl.NumberFormat('id-ID')`; internal values stay plain numbers with dot.

## Lessons (append below, newest last)

_(none yet)_

## Open issues found in LOCKED files (do NOT fix unless you are a HIGH-tier REVIEW/FIX task)

Format: `OI### | file | symptom | suggested fix | found by task`

_(none yet)_
