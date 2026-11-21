# AI Interactive Classroom

[![CI Status](https://github.com/xDzaky/ai-interactive-classroom/actions/workflows/ci.yml/badge.svg)](https://github.com/xDzaky/ai-interactive-classroom/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)](#license)
[![Laravel](https://img.shields.io/badge/Laravel-13.x-FF2D20?logo=laravel)](apps/api)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](apps/web)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](apps/ai-service)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?logo=typescript)](packages)
[![WCAG](https://img.shields.io/badge/WCAG-2.2%20AA-success)](docs/PILOT-CHECKLIST.md)

> **AI Interactive Classroom** is an enterprise-grade, browser-based interactive classroom platform engineered for schools and universities. It integrates a low-latency collaborative whiteboard, dynamic 2D/3D math visualizations, real-time multi-tenant classrooms with presenter controls, mobile smartphone remote controllers, offline-first PWA synchronization, and a private RAG-powered AI teaching assistant.

---

## 🚀 Project Status: Production-Ready Pilot MVP (Phases P00–P09 Complete)

Every development phase specified in [AGENTS.md](AGENTS.md) and [ai-plan/TASKS.md](ai-plan/TASKS.md) is 100% implemented, verified, and locked:

| Test Suite | Scope | Result | Execution Time |
|---|---|---|---|
| **PHPUnit / Laravel** | API, Sanctum Auth, Multi-tenant Isolation, Reverb WebSockets, Rate Limits, Security Headers, Privacy GDPR | **222 / 222 PASS** (486 assertions) | ~6.2s |
| **Vitest** | Frontend Components, Whiteboard Reducer, 3D Geometry Builders, Safe Math AST, Dexie Outbox | **331 / 331 PASS** (49 test files) | ~7.8s |
| **Pytest** | AI Microservice, LiteLLM Proxy, pgvector Ingestion, Cosine Similarity Retrieval, TS↔Python Contracts | **36 / 36 PASS** | ~3.1s |
| **Playwright E2E** | Multi-context (Teacher + Student + Mobile Controller) Live Flows | **7 Tests Configured** | E2E Suite |
| **Vite PWA Build** | Production bundle, code splitting, Workbox ServiceWorker | **Built in ~12.9s** (`three-vendor`: 65.8 kB gzip, `canvas-vendor`: 106.1 kB gzip) | Verified |

---

## 🏛️ Architecture

```
ai-interactive-classroom/
├── apps/
│   ├── api/                 # Laravel 13 API (Sanctum Auth, Reverb WebSockets, PostgreSQL, Redis)
│   ├── web/                 # React 19 + TypeScript PWA (Konva, Three.js, Mafs, Dexie, i18next)
│   └── ai-service/          # FastAPI Python Microservice (LiteLLM, RAG embeddings & retrieval)
├── packages/
│   ├── shared-types/        # Zod schemas & TypeScript definitions shared across web & API
│   ├── whiteboard-core/     # Deterministic board state reducer, event stream & undo/redo
│   ├── geometry-core/       # Solid 3D geometry mathematical formulas & cross-sections
│   ├── math-core/           # AST whitelist expression evaluator (zero eval/Function())
│   └── curriculum-schema/   # Curriculum data structures & lesson outline schemas
├── infra/                   # Docker Compose configurations (Postgres 17 + pgvector, Redis 7)
├── docs/                    # Technical specifications, pilot checklist & device compatibility
└── ai-plan/                 # Multi-agent architectural plans, contracts, decisions & logs
```

---

## ✨ Key Capabilities

### 1. Collaborative Whiteboard (`packages/whiteboard-core` & `apps/web`)
- **Konva + perfect-freehand**: Smooth pressure-sensitive ink, eraser, shapes (line, arrow, rect, ellipse, polygon), text blocks, and math blocks.
- **Pure State Reducer**: Deterministic event-driven architecture with invertible operations (`undo`/`redo`), slide scene management, and layer reordering.
- **Touch & Stylus Ready**: Full pointer event handling with palm rejection, pinch-to-zoom, pan, snapping grid, and PNG export.

### 2. 2D & 3D Mathematical Visualizations (`packages/geometry-core`, `math-core`)
- **3D Solid Geometry**: React Three Fiber / Three.js interactive solid visualizer for prisms, pyramids, cylinders, cones, and spheres with live dimension adjustments, surface unwrapping, and dynamic slicing planes.
- **2D Function Graphing**: Interactive Mafs Cartesian graphing calculator with zoom, parametric curves, and live parameter sliders.
- **AST Whitelisted Math Evaluator**: Safe math expression evaluation powered by an AST parser without dynamic code execution (`eval`/`Function()`). MathLive LaTeX formula editor embedded.

### 3. Realtime Classroom Engine (`apps/api` & `apps/web`)
- **Laravel Reverb WebSockets**: Ultra low-latency state synchronization with monotonic sequence numbers, idempotency verification, and automatic gap-fill recovery.
- **Role-Based Experience**:
  - **Teacher View**: Full board controls, participant roster, student raise-hand approvals, and timer/picker tools.
  - **Student View**: Synchronized presentation view, individual scratchpad, and question responders.
  - **Presentation View**: Distraction-free full-screen projection mode with live remote pointer.

### 4. Smartphone Remote Controller (`apps/web/src/pages/MobileController.tsx`)
- Turn any mobile smartphone into a classroom presenter tool via instant QR pairing (`/controller`).
- Real-time laser pointer touchpad, slide switcher, tool selector, and raise-hand queue manager.
- Zero-installation mobile web application.

### 5. Interactive Activities & Breakout Groups
- Live quick polls and multiple-choice quizzes with student answers hidden until reveal.
- Group breakout workspaces with private channels and group leader submission workflows.

### 6. Offline-First PWA & Replay
- **Dexie (IndexedDB) Outbox**: Complete offline queueing; actions performed without network are saved and seamlessly flushed on reconnect with deduplication.
- **Session Replay Engine**: Time-travel scrubbing through lesson recordings using keyframe snapshots and delta event replay.
- **PWA Service Worker**: Instant caching, offline page availability, and mobile install prompt.

### 7. AI Assistant & RAG Knowledge Retrieval (`apps/ai-service`)
- **Private Document Embeddings**: Teacher uploads syllabi/PDFs, chunked and embedded via FastAPI and pgvector.
- **Scoped Semantic Search**: Context-aware cosine similarity retrieval strictly bounded by school/classroom authorization.
- **Student AI Tutor**: Hint-first Socratic dialogue without directly revealing answers.
- **Teacher AI Assistant**: Automatic lesson plan generator and quiz creator with teacher review/approval gate.

### 8. Enterprise Privacy, Security & Accessibility
- **Security Headers**: HSTS, CSP, X-Frame-Options (`DENY`), X-Content-Type-Options (`nosniff`), Permissions-Policy.
- **Privacy Compliance**: GDPR data export (`GET /api/v1/me/export`), account erasure (`DELETE /api/v1/me`), auto-retention cleanup (`rooms:prune`), and explicit consent banners.
- **WCAG 2.2 Level AA**: Full keyboard navigation, `SkipToMain` skip links, semantic ARIA roles, and high-contrast color palette.

---

## 🛠️ Tech Stack

| Domain | Technology |
|---|---|
| **Backend API** | Laravel 13, PHP 8.3+, Laravel Sanctum, Laravel Reverb |
| **Database & Cache** | PostgreSQL 17 + pgvector, Redis 7, SQLite (testing) |
| **Frontend SPA/PWA** | React 19, TypeScript 5.6+, Vite 6, Tailwind CSS v4, shadcn/ui |
| **Canvas & 3D** | Konva.js, Three.js, React Three Fiber, Mafs, MathLive |
| **Offline Storage** | Dexie.js (IndexedDB), Workbox PWA |
| **AI Microservice** | FastAPI, Python 3.11+, LiteLLM, NumPy |
| **Monorepo Tools** | pnpm workspaces, Composer |

---

## 🏁 Quickstart Guide

### Prerequisites
- **Node.js** >= 20.x & **pnpm** >= 10.x
- **PHP** >= 8.3 & **Composer** >= 2.x
- **Python** >= 3.11 & **uv**
- **Docker** & **Docker Compose**

### 1. Clone & Setup Infrastructure
```bash
git clone https://github.com/xDzaky/ai-interactive-classroom.git
cd ai-interactive-classroom

# Start PostgreSQL 17 (pgvector) and Redis
docker compose up -d
```

### 2. Setup Laravel API (`apps/api`)
```bash
cd apps/api
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8000
```
*In a separate terminal, start Laravel Reverb WebSocket server:*
```bash
cd apps/api
php artisan reverb:start --port=8080
```

### 3. Setup React Web Frontend (`apps/web`)
```bash
# From repository root
pnpm install
pnpm --filter @ai-classroom/web dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Setup AI Microservice (`apps/ai-service`)
```bash
cd apps/ai-service
uv sync
uv run uvicorn app.main:app --reload --port 8100
```

---

## 🧪 Running Test Suites

Run all tests across backend, frontend, and AI services:

```bash
# 1. Laravel API tests (222 tests)
cd apps/api && php artisan test

# 2. Frontend & packages tests (331 tests)
pnpm test:all

# 3. FastAPI AI tests (36 tests)
cd apps/ai-service && uv run pytest tests/ -v

# 4. Playwright E2E tests (live server required)
PLAYWRIGHT_RUN=true pnpm --filter @ai-classroom/web e2e
```

---

## 📚 Documentation Index

- [PILOT-CHECKLIST.md](docs/PILOT-CHECKLIST.md) — Pre-pilot go/no-go readiness checklist and criteria
- [DEVICE-COMPATIBILITY.md](docs/DEVICE-COMPATIBILITY.md) — Browser, hardware, stylus, and OS compatibility matrix
- [Technical Specification](docs/AI-Interactive-Classroom-Tech-Spec.md) — Full technical specification
- [Project Proposal](docs/Proposal-AI-Interactive-Classroom.md) — Original proposal and product requirements
- [Agent Protocols (AGENTS.md)](AGENTS.md) — Multi-agent development discipline and golden rules
- [API Contracts](ai-plan/CONTRACTS.md) — REST endpoints, WebSocket events, and data payloads
- [Code Architecture Map (CODEMAP.md)](ai-plan/CODEMAP.md) — Complete file registry and exported symbols
- [Master Task List](ai-plan/TASKS.md) — Detailed task execution breakdown

---

## 📄 License

Proprietary. All rights reserved © 2026 AI Interactive Classroom Team.
