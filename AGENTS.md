# AGENTS.md — MANDATORY. Read fully at the start of EVERY session.

Project: **AI Interactive Classroom** — browser-based interactive classroom
(whiteboard + 2D/3D math + realtime rooms + AI assistant).
Stack: Laravel 13 API · React + TypeScript web (PWA) · FastAPI AI service · PostgreSQL + pgvector · Redis · Laravel Reverb.

You are ONE of several different AI agents working in turns, with different skill levels.
You may hit a usage limit at any moment and another agent will continue after you.
Therefore: **everything you do must be written down in `ai-plan/`**. Memory outside the repo does not exist.

---

## 1. Golden rules (no exceptions)

1. **Do NOT scan the repo.** Never run `find .`, `tree`, `ls -R`, `grep -r` from the root, never open `node_modules/`, `vendor/`, `dist/`, `storage/`, lockfiles, or `.git/`. Read ONLY: this file, `ai-plan/TASKS.md`, your current task file, files in the task's `Read:` list, and the needed lines of `ai-plan/CODEMAP.md` / `ai-plan/CONTRACTS.md`.
2. **ONE task at a time.** Do its steps in order. Do not start another task unless the human says "continue".
3. **Claim before coding.** Set the task to `[~]` in `ai-plan/TASKS.md` with your tier + timestamp BEFORE you change any code.
4. **Checkpoint after every step.** Tick the step checkbox in the task file, then `git commit`. A fresh agent must be able to resume from the first unticked step.
5. **Stay inside `Allowed paths:`** of your task. Touching anything else = violation. Files of finished tasks are LOCKED (see §5).
6. **Never change dependency versions, never upgrade, never add a package** that is not in `ai-plan/STACK.md`. Need one? Write a `PROPOSED` entry in `ai-plan/DECISIONS.md`, mark the task `[!]`, STOP.
7. **Never delete, rewrite, or rename working code.** Extend with new files/functions. Refactoring is only allowed in tasks of type `REVIEW`/`FIX` with tier HIGH.
8. **Never invent** API paths, event names, table/column names, JSON keys. Use `ai-plan/CONTRACTS.md` exactly. Missing? → `PROPOSED` entry in DECISIONS, STOP.
9. **Documentation: use only URLs in `ai-plan/REFERENCES.md`.** Open the single page you need. Do not web-search whole docs; do not crawl.
10. **Verify before claiming done.** Run every command in the task's `Verify:`. Paste the LAST ~20 lines of each output into the log entry. No evidence = not done.
11. **3-strikes rule:** same error after 3 different attempts → STOP. Mark `[!]`, write what you tried + the exact error in `PROGRESS-LOG.md`. Do not keep looping.
12. **No fake completion.** No stubs/TODOs presented as finished. If something is stubbed, mark the CODEMAP row `STUB` and the task `[R]`.
13. **Security non-negotiables:** server-side authorization on every mutating endpoint; tokens stored hashed; no secrets committed; never `eval`/`Function()`/raw `math.evaluate` on user text; no video/audio recording; no personal data beyond the guest alias.
14. **Keep replies short.** Do not paste whole files into chat. Final message ≤ 10 lines (see §6).
15. **Language:** code, comments, commit messages in English. UI strings are Indonesian by default via i18n keys (never hard-code UI text in components).
16. **Forbidden commands:** `git push --force`, `git reset --hard`, `git clean -fd`, `rm -rf` outside `/tmp` or build dirs, `composer update`, `pnpm update`/`pnpm up`, `npm audit fix --force`, `--force`, `--legacy-peer-deps`, hand-editing lockfiles, committing `.env`.

---

## 2. Tiers — declare yours in your first reply

| Tier | Who | May take |
|---|---|---|
| LOW | small / free models (e.g. free opencode models) | tasks tagged `LOW` only |
| MID | capable general coding models (e.g. Gemini, DeepSeek, SWE-class) | `LOW`, `MID` |
| HIGH | top reasoning models (e.g. Claude Sonnet class) | everything, incl. `REVIEW` tasks |

- Unsure about your tier? You are **LOW**.
- A task above your tier is **not yours**: skip to the next eligible task. If none is eligible, STOP and tell the human: `Need HIGH-tier model for <task id>`.
- LOW/MID agents: before writing a new file, open the closest similar file listed in `CODEMAP.md` and **mimic its patterns** (naming, imports, test style). Do not invent new patterns.

---

## 3. Session start procedure (always the same)

1. Read this file.
2. Read `ai-plan/TASKS.md` (index only).
3. Run: `git status --short` and `git log --oneline -n 8`.
   - **Dirty tree or a task marked `[~]`** = an agent was interrupted. Run `tail -n 40 ai-plan/PROGRESS-LOG.md`, then `git diff --stat` (NOT the full diff). Resume at the first unticked step of that task. Do not redo ticked steps.
4. Choose the task: the `[~]` task if any, else the first `[ ]` task whose deps are all `[x]` and whose tier ≤ yours.
5. Read the whole task file `ai-plan/tasks/Pxx-*.md` section of that task (not the others).
6. Read only the `Read:` items. For existing code, use `ai-plan/CODEMAP.md` to find it. View files by line range (`sed -n 'a,bp'`), never whole files > 300 lines.
7. Set the status `[~]`, append a `START` entry to `PROGRESS-LOG.md`, commit (`chore(plan): claim Pxx-Tyy`).
8. Work through the steps.

## 4. Status markers (in `ai-plan/TASKS.md`)

| Marker | Meaning |
|---|---|
| `[ ]` | TODO |
| `[~]` | IN PROGRESS (owner + time written next to it) |
| `[x]` | DONE and every Verify command passed |
| `[R]` | DONE but needs HIGH-tier review (weak tests, stubs, uncertainty) |
| `[!]` | BLOCKED (reason in PROGRESS-LOG) |
| `[-]` | DEFERRED / skipped by human decision |

## 5. Locked files (protect finished work)

- When a task becomes `[x]`, every file it created is **LOCKED** for LOW/MID agents.
- Locked means: no deletion, no rename, no signature/behavior change, no formatting-only edits.
- Allowed on locked files, only if the current task lists the path under `Allowed paths: (additive)`: append new exports/functions/tests.
- Found a bug in a locked file while doing something else? Do NOT fix it. Add an entry to `ai-plan/KNOWLEDGE.md` (section "Open issues") with file, symptom, suggested fix. A HIGH-tier `REVIEW` task will fix it.
- HIGH-tier agents doing `REVIEW`/`FIX` may edit locked files, must keep all tests green, and must log every change.

## 6. End-of-task procedure

1. Run all `Verify:` commands. Fix until green (3-strikes rule applies).
2. Update `ai-plan/CODEMAP.md`: one row per file created/changed (path · purpose · public exports · task id · `OK`/`STUB`).
3. Update `TASKS.md`: `[x]` if all verify passed and no stubs; `[R]` if not fully sure; `[!]` if blocked.
4. Append a `DONE` entry to `PROGRESS-LOG.md` (template in that file).
5. Lesson learned that would save another agent time? Add a numbered entry to `KNOWLEDGE.md`.
6. Commit: `type(Pxx-Tyy): short message` (types: feat, fix, test, chore, docs, refactor).
7. Final reply to the human (≤ 10 lines): task id · status · what changed · verify result · next eligible task id · anything needed from the human.
8. STOP.

## 7. If you are about to hit a limit / context is nearly full

Immediately (before anything else): tick finished steps, commit WIP (`wip(Pxx-Tyy): step N`), append a `HANDOFF` entry to `PROGRESS-LOG.md` stating the exact next step, files half-done, and commands still to run. The next agent depends on this.

## 8. Definition of Done (applies to every task)

- Every step ticked; every Verify command passed with evidence in the log.
- Types check, lint passes, new code has tests (unless the task says otherwise).
- Matches `CONTRACTS.md` names exactly. No new dependency outside `STACK.md`.
- CODEMAP + TASKS + PROGRESS-LOG updated; committed.

## 9. Where things are

| Need | File |
|---|---|
| What to do next | `ai-plan/TASKS.md` → `ai-plan/tasks/Pxx-*.md` |
| What others did / where to resume | `ai-plan/PROGRESS-LOG.md` (read only the tail) |
| Where code lives | `ai-plan/CODEMAP.md` |
| Names, payloads, endpoints, permissions | `ai-plan/CONTRACTS.md` |
| Allowed packages, commands, ports, env vars | `ai-plan/STACK.md` |
| URLs of repos/docs (use these, don't search) | `ai-plan/REFERENCES.md` |
| Why things are the way they are | `ai-plan/DECISIONS.md` |
| Pitfalls already discovered | `ai-plan/KNOWLEDGE.md` |
| Copy-paste prompts for the human | `ai-plan/PROMPTS.md` |
| Review protocol for HIGH tier | `ai-plan/REVIEW.md` |
| Original product docs (DO NOT read unless a task cites a line range) | `docs/AI-Interactive-Classroom-Tech-Spec.md`, `docs/Proposal-AI-Interactive-Classroom.md` |

Note: `apps/api/AGENTS.md` (if Laravel Boost generated one) is supplementary. If it conflicts with this file, THIS file wins.
