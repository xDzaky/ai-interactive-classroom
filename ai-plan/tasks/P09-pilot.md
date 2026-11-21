# P09 — Pilot Readiness

---

### P09-T01 — Security pass [tier: HIGH] [deps: P05-RV]

Goal: Verify authz matrix, rate limits, and add security headers (CORS, CSP, X-Frame-Options).

Allowed paths:
- apps/api/app/Http/Middleware/ (additive)
- apps/api/bootstrap/app.php (additive)
- apps/api/config/cors.php (additive)
- apps/api/tests/Feature/ (additive)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Read:
- ai-plan/CONTRACTS.md (authorization rules)
- apps/api/bootstrap/app.php

Steps:
- [ ] 1. Add SecurityHeaders middleware (X-Frame-Options, X-Content-Type, CSP, HSTS stub).
- [ ] 2. Register middleware globally; verify it fires on /health.
- [ ] 3. Write authz matrix tests: each protected route returns 401 without auth and 403 with wrong role.
- [ ] 4. Run php artisan test; update CODEMAP and commit.

Verify:
- `cd apps/api && php artisan test --compact` → pass

---

### P09-T02 — Privacy: retention job, export/erasure, consent notice [tier: HIGH] [deps: P07-RV]

Goal: Schedule data cleanup, provide export/erasure endpoint, add consent notice component.

Allowed paths:
- apps/api/app/Console/Commands/ (additive)
- apps/api/routes/api.php (additive)
- apps/api/app/Http/Controllers/Api/V1/ (additive)
- apps/api/tests/Feature/ (additive)
- apps/web/src/components/ (additive)
- apps/web/src/i18n/locales/id.json (additive)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Steps:
- [ ] 1. Create DeleteOldRooms artisan command (delete ended rooms older than 90 days).
- [ ] 2. Create GET /api/v1/me/export → JSON of user's rooms + events (own data only).
- [ ] 3. Create DELETE /api/v1/me → anonymize user record (GDPR erasure, soft approach).
- [ ] 4. Create ConsentNotice React component with i18n Indonesian keys.
- [ ] 5. Run tests; update CODEMAP; commit.

Verify:
- `cd apps/api && php artisan test --compact` → pass
- `cd apps/web && pnpm run test:run` → pass
- `cd apps/web && pnpm run build` → green

---

### P09-T03 — Accessibility pass [tier: MID] [deps: P07-RV]

Goal: Ensure WCAG 2.2 AA compliance — aria labels, keyboard nav, focus management.

Allowed paths:
- apps/web/src/ (additive)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Steps:
- [ ] 1. Audit and fix missing aria-labels on interactive elements (buttons, inputs, dialogs).
- [ ] 2. Ensure all modals trap focus (focus-trap-react or manual tabIndex).
- [ ] 3. Add skip-to-main-content link.
- [ ] 4. Run build and tests; commit.

Verify:
- `cd apps/web && pnpm run build` → green
- `cd apps/web && pnpm run test:run` → pass

---

### P09-T04 — Playwright multi-context E2E [tier: MID] [deps: P05-RV]

Goal: Playwright tests for teacher + student + controller flows.

Allowed paths:
- apps/web/e2e/ (additive)
- apps/web/playwright.config.ts (additive)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Steps:
- [ ] 1. Confirm Playwright is installed; check playwright.config.ts.
- [ ] 2. Write teacher login → create classroom → start room E2E test.
- [ ] 3. Write student join room flow test.
- [ ] 4. Run playwright tests; commit.

Verify:
- `cd apps/web && pnpm exec playwright test --reporter=line` → pass (or all skip if no server)

---

### P09-T05 — Performance + network throttling checks [tier: MID] [deps: P07-RV]

Goal: Measure and document load time under throttled network; add bundle size assertion.

Allowed paths:
- apps/web/ (additive, scripts only)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Steps:
- [ ] 1. Run build; check bundle sizes vs limits (canvas-vendor < 400 kB gzip, main < 200 kB gzip).
- [ ] 2. Document results in ai-plan/KNOWLEDGE.md.
- [ ] 3. Commit doc.

Verify:
- `cd apps/web && pnpm run build` → green; check gzip sizes in output.

---

### P09-T06 — Observability: structured logs, error hook, AI cost log [tier: MID] [deps: P08-T05]

Goal: Structured JSON logging in Laravel, frontend error boundary with log hook, AI cost reporting.

Allowed paths:
- apps/api/config/logging.php (additive)
- apps/api/app/Http/Middleware/ (additive)
- apps/web/src/components/ (additive)
- apps/web/src/i18n/locales/id.json (additive)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Steps:
- [ ] 1. Set Laravel default log channel to `stderr` with JSON formatter for production.
- [ ] 2. Create RequestLogger middleware: log method, path, status, duration_ms as JSON.
- [ ] 3. Create ErrorBoundary React component that calls a log hook on render errors.
- [ ] 4. Run tests and build; commit.

Verify:
- `cd apps/api && php artisan test --compact` → pass
- `cd apps/web && pnpm run build` → green

---

### P09-T07 — Pilot checklist + device compatibility matrix [tier: LOW] [deps: P09-T04]

Goal: Document the pilot launch checklist and device compatibility matrix.

Allowed paths:
- docs/ (additive)
- ai-plan/CODEMAP.md
- ai-plan/PROGRESS-LOG.md
- ai-plan/TASKS.md

Steps:
- [ ] 1. Create docs/PILOT-CHECKLIST.md with go/no-go criteria.
- [ ] 2. Create docs/DEVICE-COMPATIBILITY.md with tested browser/OS matrix.
- [ ] 3. Commit.

Verify:
- Both files exist and have content.

---

### P09-RV — Final review [tier: HIGH] [deps: T01-T07]

Goal: Run all 4 suites and confirm all P09 work is complete, locked, and committed.

Allowed paths: ai-plan/; additive test-only changes where necessary.

Steps:
- [ ] 1. Run php artisan test → ≥200.
- [ ] 2. Run pnpm run test:run → ≥321.
- [ ] 3. Run pnpm run build → green.
- [ ] 4. Run pytest → ≥36.
- [ ] 5. Lock all P09 CODEMAP rows; mark P09-RV [x].

Verify:
- `cd apps/api && php artisan test --compact` → pass
- `cd apps/ai-service && .venv/bin/python -m pytest tests/ -v` → pass
- `cd apps/web && pnpm run test:run` → pass
- `cd apps/web && pnpm run build` → green
