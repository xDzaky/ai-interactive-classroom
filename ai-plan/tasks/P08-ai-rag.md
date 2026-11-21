# P08 — AI / RAG

---

### P08-T01 — AI service structure, internal auth, LiteLLM wrapper [tier: MID] [deps: P00-T05]

Goal: Provide the internal AI-service application, authenticated job endpoints, and LiteLLM wrapper.
Status: Completed; implementation is recorded in CODEMAP and commit `031d7bf`.

---

### P08-T02 — Geometry/math service with shared fixtures [tier: HIGH] [deps: T01,P03-T01]

Goal: Provide deterministic geometry solving with TS/Python contract fixtures.
Status: Completed; implementation is recorded in CODEMAP and commit `a00718c`.

---

### P08-T03 — Document ingestion + embeddings + pgvector [tier: HIGH] [deps: T01,P01-T03]

Goal: Ingest school-scoped documents, create 1536-dimensional OpenAI embeddings, and persist chunks in pgvector.

Allowed paths:
- apps/api/database/migrations/ (additive)
- apps/api/app/Models/ (additive)
- apps/api/app/Http/Controllers/Api/V1/ (additive)
- apps/api/routes/api.php (additive)
- apps/api/tests/Feature/ (additive)
- apps/ai-service/app/ (additive)
- apps/ai-service/tests/ (additive)
- ai-plan/CONTRACTS.md
- ai-plan/DECISIONS.md
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Read:
- ai-plan/CONTRACTS.md (AI and database sections)
- ai-plan/STACK.md (AI service packages)
- ai-plan/DECISIONS.md (ADR-020)
- ai-plan/CODEMAP.md entries for P08-T01 and P08-T05

Steps:
- [ ] 1. Confirm the required document-ingestion route, request payload, authorization scope, and response shape in CONTRACTS.md; if absent, add a PROPOSED ADR and stop.
- [ ] 2. Add document and chunk storage with a pgvector 1536-dimensional embedding that follows ADR-020.
- [ ] 3. Add authenticated, school-scoped ingestion and chunk/embedding processing without exposing document content across tenants.
- [ ] 4. Add tests for authorization, tenant isolation, chunk persistence, and rejected invalid input.
- [ ] 5. Run the specified Laravel and AI-service test suites; update CODEMAP and commit.

Verify:
- `cd apps/api && php artisan test --compact` → pass
- `cd apps/ai-service && uv run pytest` → pass

Refs: ai-plan/REFERENCES.md

---

### P08-T04 — Scoped retrieval + cited answers [tier: HIGH] [deps: T03]

Goal: Retrieve only documents authorized for the requester and return cited AI answers.
Allowed paths: To be specified after P08-T03 defines the retrieval contract.

---

### P08-T05 — Laravel AI job layer [tier: HIGH] [deps: T01,P04-T03]

Goal: Submit AI work through Laravel with 202/job-id, rate limits, and usage logging.
Status: Completed; implementation is recorded in CODEMAP and commit `ea66c3d`.

---

### P08-T06 — Teacher AI UI [tier: MID] [deps: T05]

Goal: Provide editable, teacher-approved outline and quiz generation.
Status: Completed; implementation is recorded in CODEMAP and commit `aa55ba6`.

---

### P08-T07 — Student AI tutor UI (hint-first) [tier: MID] [deps: T04,T05]

Goal: Give students progressively helpful, hint-first tutor responses without revealing answers immediately.

Allowed paths:
- apps/web/src/pages/room/StudentAiTutor.tsx
- apps/web/src/pages/room/StudentAiTutor.test.tsx
- apps/web/src/pages/room/StudentView.tsx (additive)
- apps/web/src/pages/room/StudentView.test.tsx (additive)
- apps/web/src/i18n/locales/id.json (additive)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Read:
- ai-plan/CONTRACTS.md (AI HTTP API)
- apps/web/src/hooks/useAiJob.ts
- apps/web/src/pages/room/TeacherAiPanel.tsx
- apps/web/src/pages/room/StudentView.tsx

Steps:
- [ ] 1. Review the carried-over tutor component and tests against the AI job contract.
- [ ] 2. Complete hint-first request, loading, error, and answer-escalation states with Indonesian i18n keys.
- [ ] 3. Render the tutor additively in StudentView and add focused component coverage.
- [ ] 4. Run web test, lint, typecheck, and build; update CODEMAP and commit.

Verify:
- `pnpm --dir apps/web run test:run` → pass
- `pnpm --dir apps/web run lint` → pass
- `pnpm --dir apps/web run build` → pass

Refs: ai-plan/REFERENCES.md

---

### P08-T08 — OPTIONAL: rule-based sketch recognition + clarification UI [tier: HIGH] [deps: P02-T06,P03-T06]

Goal: Recognize only deterministic, high-confidence whiteboard sketches and ask for clarification otherwise.
Allowed paths: To be specified before implementation.

---

### P08-RV — Phase review [tier: HIGH] [deps: T01-T07]

Goal: Verify P08 contracts, scope controls, and all tests before pilot work.
Allowed paths: ai-plan/; additive test-only changes where necessary.
