# AI Interactive Classroom

> Browser-based interactive classroom: whiteboard + 2D/3D math visualization + realtime rooms + AI assistant.

**Status:** 🚧 In development (Phase P00 — Bootstrap)

---

## Architecture

```
ai-interactive-classroom/
├── apps/
│   ├── api/          # Laravel 13 — REST API + WebSocket (Reverb) + Auth
│   ├── web/          # React 19 + TypeScript — PWA frontend
│   └── ai-service/   # FastAPI (Python) — AI/RAG microservice
├── packages/
│   ├── shared-types/       # Zod schemas + TypeScript types
│   ├── whiteboard-core/    # Board state reducer + undo/redo (pure, tested)
│   ├── geometry-core/      # Solid geometry formulas (tested)
│   ├── math-core/          # Safe expression evaluator (AST whitelist)
│   └── curriculum-schema/  # Curriculum data schemas
├── infra/            # Docker configs
├── docs/             # Original product spec
└── ai-plan/          # Agent planning files (TASKS, CODEMAP, CONTRACTS, etc.)
```

## Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13, Sanctum, Reverb, PostgreSQL 17 + pgvector, Redis 7 |
| Frontend | React 19, TypeScript, Vite 6, Tailwind v4, shadcn/ui |
| Whiteboard | Konva, perfect-freehand |
| Math 3D | Three.js, React Three Fiber |
| Math 2D | Mafs |
| Math Input | MathLive |
| AI Service | FastAPI, LiteLLM |
| Offline | Dexie (IndexedDB), vite-plugin-pwa |
| Realtime | Laravel Echo + Reverb |
| i18n | i18next (Indonesian default) |
| Package manager | pnpm workspaces |

## Dev Setup

### Prerequisites

- PHP 8.3+ · Composer 2.x
- Node.js 20+ LTS · pnpm 8+
- Python 3.11+ · uv
- Docker & Docker Compose

### Quick start

```bash
# 1. Start infrastructure
cp .env.example .env
docker compose up -d

# 2. Laravel API
cd apps/api
cp .env.example .env   # fill in values
composer install
php artisan key:generate
php artisan migrate
php artisan serve       # :8000

# In another terminal:
php artisan reverb:start  # :8080

# 3. React web
cd apps/web
pnpm install
pnpm dev               # :5173

# 4. AI service
cd apps/ai-service
uv sync
uv run uvicorn main:app --reload --port 8100
```

### Run tests

```bash
cd apps/api && php artisan test
cd apps/web && pnpm test
cd apps/ai-service && uv run pytest
```

## For AI Agents

Read `AGENTS.md` and `ai-plan/TASKS.md` before doing anything.
Never scan the whole repo. Follow the golden rules in AGENTS.md exactly.

## License

Proprietary. All rights reserved.
