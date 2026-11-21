# Contributing to AI Interactive Classroom

Thank you for your interest in contributing to AI Interactive Classroom! To maintain the stability, security, and verification guarantees of this codebase, please adhere to the following guidelines.

## Development Workflow

1. **Monorepo Structure**:
   - `apps/api`: Laravel 13 REST & Reverb WebSocket service.
   - `apps/web`: React 19 + TypeScript PWA frontend.
   - `apps/ai-service`: FastAPI Python AI & RAG microservice.
   - `packages/*`: Shared modular libraries.

2. **Branching & Commits**:
   - Create a feature branch from `main`: `git checkout -b feat/your-feature-name`.
   - Use Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
   - Reference task IDs where applicable (e.g., `feat(P04-T02): add room lock status check`).

3. **Code Quality & Testing**:
   - Every new feature must be accompanied by unit or integration tests.
   - Run typechecks and linting before submitting a PR:
     ```bash
     pnpm typecheck
     pnpm lint
     ```
   - Ensure all test suites pass:
     - `cd apps/api && php artisan test`
     - `pnpm test:all`
     - `cd apps/ai-service && uv run pytest`

4. **Security & Privacy**:
   - Never commit `.env` or credentials.
   - Ensure all API endpoints enforce authorization.
   - Math expressions must only be parsed via `packages/math-core` AST validator — never use `eval()` or `Function()`.
