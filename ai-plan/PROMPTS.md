# PROMPTS.md — copy-paste prompts for the human / next agent

## To continue after a session ends

```
Read AGENTS.md and ai-plan/TASKS.md. Run git status --short and git log --oneline -n 8.
Tail ai-plan/PROGRESS-LOG.md (last 40 lines). Then continue from the first unticked step of
the [~] task, or pick the next [ ] task eligible for your tier.
```

## To ask human about ADR-020 (embedding model)

```
I need a decision on ADR-020 before implementing P08-T03 (document embeddings + pgvector).
Please choose one:
A) OpenAI text-embedding-3-small → 1536 dimensions
B) sentence-transformers/all-MiniLM-L6-v2 → 384 dimensions (self-hosted, free)
C) Other (specify model + dimension)

This decision is locked once the migration runs — changing it later requires a full re-index.
```

## To create GitHub repo (run from project root)

```bash
gh repo create ai-interactive-classroom --private --source=. --remote=origin --push
```

## To start dev environment

```bash
# From project root
docker compose up -d                # Start Postgres + Redis
cd apps/api && php artisan serve    # Laravel API on :8000
cd apps/api && php artisan reverb:start  # Reverb on :8080
cd apps/web && pnpm dev             # Vite on :5173
cd apps/ai-service && uvicorn main:app --reload --port 8100
```

## To run all tests

```bash
cd apps/api && php artisan test
cd apps/web && pnpm test
cd apps/ai-service && pytest
```
