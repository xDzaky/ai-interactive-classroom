# DECISIONS.md — Architecture Decision Records (ADR)

Format: `ADR-NNN | status | title`
Status: DECIDED · PROPOSED (needs human/HIGH-tier review) · SUPERSEDED

---

ADR-001 | DECIDED | Use Laravel 13 + Sanctum SPA cookie auth (not token) for first-party web app. Participant/device tokens for guest/controller.
ADR-002 | DECIDED | Use Laravel Reverb as WebSocket server for MVP. Yjs/Hocuspocus deferred unless multi-cursor collaborative editing is proven necessary.
ADR-003 | DECIDED | Event-based replay (store structured events). No video/audio recording.
ADR-004 | DECIDED | pnpm workspaces for monorepo frontend packages. Laravel stays in apps/api as a standard Composer project.
ADR-005 | DECIDED | Whiteboard events go via HTTP POST, not WebSocket whisper. Server applies, persists, then broadcasts via Reverb.
ADR-006 | DECIDED | UUID v4 primary keys on all tables. laravel HasUuids trait.
ADR-007 | DECIDED | Use KaTeX (not MathJax) for rendering. MathLive for input.
ADR-008 | DECIDED | Use mathjs for safe expression evaluation with AST whitelist (P03-T04). Never call evaluate on raw user strings.
ADR-009 | DECIDED | Use Mafs for 2D graphing. Three.js/R3F for 3D.
ADR-010 | DECIDED | Freehand strokes: perfect-freehand library with Konva canvas.
ADR-011 | DECIDED | PWA with vite-plugin-pwa, registerType:'prompt'. Never auto-reload during live class.
ADR-012 | DECIDED | IndexedDB via Dexie for offline draft queue.
ADR-013 | DECIDED | i18n: Indonesian default via i18next. No hardcoded UI strings in components.
ADR-014 | DECIDED | Separate PostgreSQL DB `classroom_test` for Pest tests. Never test against dev DB.
ADR-015 | DECIDED | FastAPI for AI microservice. Laravel proxies all AI calls (202+job_id pattern).
ADR-016 | DECIDED | PyMuPDF/pymupdf4llm FORBIDDEN (AGPL). Use pypdf (MIT) for PDF parsing.
ADR-017 | DECIDED | tldraw SDK FORBIDDEN (paid license). Build whiteboard with Konva + React.
ADR-018 | DECIDED | PhET and OpenStax content MUST NOT be bundled (NC license).
ADR-019 | DECIDED | Guest tokens scoped to one room + one participant. Room code alone is not authorization.
ADR-020 | PROPOSED | Embedding model for pgvector: dimension must be decided before migration. Options: OpenAI text-embedding-3-small (1536-dim), sentence-transformers (768-dim). HUMAN MUST DECIDE before P08-T03.

## PROPOSED entries (need human/HIGH-tier decision)

_(ADR-020 above is the first one)_
