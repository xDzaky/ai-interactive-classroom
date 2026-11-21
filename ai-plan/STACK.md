# STACK.md — approved packages, commands, ports, env vars

Never add a package not listed here. If you need one, write a PROPOSED entry in DECISIONS.md, mark your task [!], STOP.

---

## Runtime versions

| Runtime | Version required |
|---|---|
| PHP | 8.3–8.5 |
| Composer | 2.x |
| Node.js | 20+ LTS |
| pnpm | 8+ |
| Python | 3.11+ |
| uv | 0.4+ |
| PostgreSQL | 17 |
| Redis | 7 |

---

## apps/api (Laravel 13)

| Package | Version pin | Purpose |
|---|---|---|
| laravel/framework | ^13.0 | Framework |
| laravel/sanctum | ^4.0 | SPA cookie auth |
| laravel/reverb | ^1.0 | WebSocket server |
| laravel/telescope | ^5.0 | Dev debugging |
| pestphp/pest | ^3.0 | Testing |
| pestphp/pest-plugin-laravel | ^3.0 | Laravel test helpers |
| pgvector/pgvector | ^0.2 | Vector DB |
| barryvdh/laravel-ide-helper | ^3.0 | IDE support (dev) |
| laravel/boost | ^2.10 | Laravel-specific AI development guidance (dev) |

---

## apps/web (React + Vite)

| Package | Version pin | Purpose |
|---|---|---|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM renderer |
| react-router-dom | ^7.0 | Routing |
| @tanstack/react-query | ^5.0 | Server state |
| zustand | ^5.0 | Client state |
| vite | ^6.0 | Bundler |
| typescript | ^5.6 | Types |
| tailwindcss | ^4.0 | CSS |
| @shadcn/ui | latest | UI components |
| vitest | ^2.0 | Unit tests |
| @testing-library/react | ^16.0 | Component tests |
| @playwright/test | ^1.49 | E2E smoke tests |
| react-konva | ~19.2.7 | Canvas whiteboard |
| konva | ^9.3 | Canvas engine |
| perfect-freehand | ^1.2 | Freehand strokes |
| three | ^0.169 | 3D rendering |
| @react-three/fiber | ^8.17 | R3F |
| @react-three/drei | ^9.115 | R3F helpers |
| mafs | ^0.19 | 2D graphing |
| mathlive | ^0.101 | Math input |
| katex | ^0.16 | Math notation render |
| @laravel/echo | ^1.17 | WebSocket client |
| laravel-echo | ^1.17 | Echo (alias) |
| pusher-js | ^8.4 | Pusher/Reverb client |
| @laravel/echo-react | ^1.0 | React hooks for Echo |
| dexie | ^4.0 | IndexedDB offline |
| vite-plugin-pwa | ^0.21 | PWA |
| workbox-window | ^7.1 | PWA workbox |
| i18next | ^23.0 | i18n |
| react-i18next | ^15.0 | React i18n |
| zod | ^3.23 | Schema validation |
| axios | ^1.7 | HTTP client |
| qrcode.react | ^4.0 | QR code |

---

## packages/* (shared)

| Package | Purpose |
|---|---|
| typescript | Types |
| zod | Schema validation |
| vitest | Tests |

---

## apps/ai-service (FastAPI)

| Package | Purpose |
|---|---|
| fastapi | HTTP framework |
| uvicorn | ASGI server |
| pydantic | Data validation |
| httpx | HTTP client |
| litellm | LLM abstraction |
| pypdf | PDF parsing (MIT) |
| numpy | Numerics |
| scikit-learn | ML utilities |
| pytest | Tests |
| pytest-asyncio | Async tests |
| python-dotenv | Env loading |

---

## Ports

| Service | Port |
|---|---|
| Laravel API (dev) | 8000 |
| Laravel Reverb | 8080 |
| Vite dev server | 5173 |
| FastAPI | 8100 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Mailpit (dev) | 8025 |

---

## Env variables (never commit values)

```
# Root .env (for Docker)
COMPOSE_PROJECT_NAME=ai-classroom
POSTGRES_DB=classroom
POSTGRES_USER=classroom
POSTGRES_PASSWORD=secret
REDIS_PASSWORD=

# apps/api/.env
APP_NAME="AI Interactive Classroom"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=classroom
DB_USERNAME=classroom
DB_PASSWORD=secret

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

BROADCAST_CONNECTION=reverb
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
SESSION_DRIVER=cookie

MAIL_MAILER=smtp
MAIL_HOST=localhost
MAIL_PORT=1025

AI_SERVICE_URL=http://localhost:8100
AI_SERVICE_INTERNAL_SECRET=changeme

# apps/web/.env.local
VITE_API_URL=http://localhost:8000
VITE_REVERB_HOST=localhost
VITE_REVERB_PORT=8080
VITE_REVERB_SCHEME=http

# apps/ai-service/.env
ENVIRONMENT=development
LARAVEL_INTERNAL_SECRET=changeme
OPENAI_API_KEY=
DATABASE_URL=postgresql://classroom:secret@localhost:5432/classroom
REDIS_URL=redis://localhost:6379
```

---

## Forbidden commands

git push --force · git reset --hard · git clean -fd · rm -rf (outside /tmp or build dirs)
composer update · pnpm update · pnpm up · npm audit fix --force
--force · --legacy-peer-deps · hand-editing lockfiles · committing .env
