# P00 — Bootstrap & Tooling

---

### P00-T01 — Repo skeleton, git, pnpm workspace, .gitignore, copy original docs   [tier: LOW] [deps: -]

Goal: Create the monorepo directory tree, root pnpm-workspace.yaml, .gitignore, and copy original planning docs into docs/.

Allowed paths:
- .gitignore
- .gitattributes
- package.json (root)
- pnpm-workspace.yaml
- pnpm-lock.yaml
- README.md
- docs/
- apps/ (empty subdirs only)
- packages/ (empty subdirs only)
- ai-plan/ (planning files only, no code)
- .github/

Read: ai-plan/STACK.md (versions), ai-plan/CONTRACTS.md (structure overview)

Steps:
- [x] 1. git init + git checkout -b main
- [x] 2. Create directory structure: apps/{api,web,ai-service}, packages/{shared-types,whiteboard-core,geometry-core,math-core,curriculum-schema}, infra, docs, .github/workflows, ai-plan/tasks
- [x] 3. Copy docs (AI-Interactive-Classroom-Tech-Spec.md, Proposal-AI-Interactive-Classroom.md) to docs/
- [x] 4. Create ai-plan/ planning files: TASKS.md, CODEMAP.md, PROGRESS-LOG.md, KNOWLEDGE.md, STACK.md, CONTRACTS.md, REFERENCES.md, DECISIONS.md, REVIEW.md, PROMPTS.md
- [x] 5. Create .gitignore
- [x] 6. Create root package.json + pnpm-workspace.yaml
- [x] 7. Create README.md
- [x] 8. Initial git commit

Verify:
- `git log --oneline -n 1` → one commit with message "chore(P00-T01): repo skeleton"
- `ls apps/` → api  web  ai-service
- `ls packages/` → shared-types  whiteboard-core  geometry-core  math-core  curriculum-schema
- `ls ai-plan/` → all planning files present
- `ls docs/` → AI-Interactive-Classroom-Tech-Spec.md  Proposal-AI-Interactive-Classroom.md

Refs: ai-plan/REFERENCES.md

---

### P00-T02 — Docker compose (Postgres+pgvector, Redis) + .env.example   [tier: LOW] [deps: T01]

Goal: docker-compose.yml that starts PostgreSQL 17 with pgvector and Redis 7. .env.example for all services.

Allowed paths:
- docker-compose.yml
- .env.example
- infra/

Read: ai-plan/STACK.md (ports, env vars), ai-plan/KNOWLEDGE.md (K009 pgvector image)

Steps:
- [ ] 1. Write docker-compose.yml with services: postgres (pgvector/pgvector:pg17), redis
- [ ] 2. Add mailpit service for dev email
- [ ] 3. Write .env.example (root) with all env var keys from STACK.md, no real secrets
- [ ] 4. Verify docker compose config parses
- [ ] 5. Commit

Verify:
- `docker compose config 2>&1 | tail -5` → no errors
- `cat .env.example | grep POSTGRES_DB` → POSTGRES_DB=classroom

---

### P00-T03 — Laravel 13 API in apps/api   [tier: MID] [deps: T01, T02]

Goal: Scaffold Laravel 13 app with Sanctum, Pest, pgsql config, and a GET /api/health endpoint returning {"status":"ok"}.

Allowed paths: apps/api/

Read: ai-plan/STACK.md (packages), ai-plan/KNOWLEDGE.md (K002 PHP version, K003 Sanctum, K004 UUID, K005 Reverb), ai-plan/CONTRACTS.md (error format)

Steps:
- [ ] 1. composer create-project laravel/laravel apps/api --no-interaction
- [ ] 2. Install packages: sanctum, reverb (composer require)
- [ ] 3. Install Pest: composer require pestphp/pest pestphp/pest-plugin-laravel --dev
- [ ] 4. Configure .env: DB_CONNECTION=pgsql, UUID user model (HasUuids), remove default migration auto-increment id from users → uuid
- [ ] 5. Set up apps/api/.env (copy from .env.example, fill local dev values)
- [ ] 6. Add GET /api/health route returning {"status":"ok","timestamp":now()}
- [ ] 7. Run php artisan test → all pass
- [ ] 8. Commit

Verify:
- `cd apps/api && php artisan --version` → Laravel Framework 13.x.x
- `cd apps/api && php artisan test` → PASS
- `curl http://localhost:8000/api/health` → {"status":"ok",...}

---

### P00-T04 — React web shell in apps/web   [tier: MID] [deps: T01]

Goal: Vite + React 19 + TypeScript + Tailwind v4 + shadcn + React Router + TanStack Query + Zustand + Vitest scaffold in apps/web. Dev server starts; vitest runs (0 tests = OK).

Allowed paths: apps/web/

Read: ai-plan/STACK.md (all web packages), ai-plan/KNOWLEDGE.md (K001 react-konva version)

Steps:
- [ ] 1. pnpm create vite apps/web --template react-ts
- [ ] 2. Install all packages from STACK.md web section
- [ ] 3. Configure Tailwind v4 + shadcn/ui init
- [ ] 4. Set up vite.config.ts with proxy to :8000 and :8080
- [ ] 5. Set up React Router with placeholder / route
- [ ] 6. Set up TanStack Query provider + Zustand placeholder store
- [ ] 7. Set up vitest
- [ ] 8. Write apps/web/.env.local with VITE_* vars
- [ ] 9. Run pnpm build → success
- [ ] 10. Commit

Verify:
- `cd apps/web && pnpm build` → exit 0
- `cd apps/web && pnpm test --run` → pass (0 tests OK)

---

### P00-T05 — FastAPI AI service in apps/ai-service   [tier: LOW] [deps: T01, T02]

Goal: FastAPI skeleton in apps/ai-service with uv, GET /health endpoint, one passing pytest test.

Allowed paths: apps/ai-service/

Read: ai-plan/STACK.md (python packages)

Steps:
- [ ] 1. Create apps/ai-service/ with uv init
- [ ] 2. Create pyproject.toml with all packages from STACK.md ai-service section
- [ ] 3. Write main.py with GET /health → {"status":"ok"}
- [ ] 4. Write test_health.py with one test
- [ ] 5. Run pytest → pass
- [ ] 6. Commit

Verify:
- `cd apps/ai-service && uv run pytest` → pass
- `cd apps/ai-service && uv run uvicorn main:app --port 8100 &; sleep 2; curl http://localhost:8100/health` → {"status":"ok"}

---

### P00-T06 — Shared packages scaffold   [tier: MID] [deps: T01, T04]

Goal: Empty but buildable TypeScript packages: shared-types, whiteboard-core, geometry-core, math-core, curriculum-schema. Each has package.json, tsconfig, index.ts (empty exports), and passes tsc.

Allowed paths: packages/

Read: ai-plan/STACK.md, ai-plan/CONTRACTS.md (Shared TypeScript types section)

Steps:
- [ ] 1. Create package.json + tsconfig.json + src/index.ts for each of the 5 packages
- [ ] 2. Add packages to pnpm-workspace.yaml
- [ ] 3. Run pnpm -r build → all pass
- [ ] 4. Commit

Verify:
- `pnpm -r build` → exit 0
- `ls packages/shared-types/src/index.ts` → exists

---

### P00-T07 — Root verify scripts + GitHub Actions CI   [tier: LOW] [deps: T03,T04,T05,T06]

Goal: Root package.json scripts to run all tests. GitHub Actions workflow that runs on push: api tests, web build+test, ai-service tests, packages build.

Allowed paths:
- package.json (root, scripts only)
- .github/workflows/ci.yml

Steps:
- [ ] 1. Add scripts to root package.json: "test:api", "test:web", "test:ai", "test:all", "build"
- [ ] 2. Write .github/workflows/ci.yml
- [ ] 3. Verify workflow YAML parses (yaml lint or manual review)
- [ ] 4. Commit

Verify:
- `cat .github/workflows/ci.yml | head -5` → name: CI
- `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))"` → no error (if js-yaml available, else manual review)

---

### P00-T08 — OPTIONAL: Laravel Boost   [tier: LOW] [deps: T03]

Goal: If Laravel Boost is available as a dev tool, install it in apps/api to generate supplementary AGENTS.md for Laravel-specific guidance.

Allowed paths: apps/api/

Steps:
- [x] 1. Check if Laravel Boost package exists: composer search laravel/boost
- [x] 2. If exists and MIT/compatible license: composer require laravel/boost --dev
- [ ] 3. If not exists: skip (mark [-])
- [x] 4. Commit or mark [-]

---

### P00-RV — Phase 0 review   [tier: HIGH] [deps: T01-T07]

Goal: Verify all P00 tasks pass, all CODEMAP rows present, locked. Write phase summary.

Steps:
- [ ] 1. Run all Verify commands from T01-T07
- [ ] 2. Cross-check CODEMAP has rows for all created files
- [ ] 3. Mark all P00 CODEMAP rows LOCKED
- [ ] 4. Update TASKS.md: P00-T01 through T07 → [x]
- [ ] 5. Commit: chore(P00-RV): phase review complete
