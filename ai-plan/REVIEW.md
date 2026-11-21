# REVIEW.md — HIGH-tier review protocol

## When a task hits [R] status

A task marked `[R]` means the agent who completed it isn't confident everything is correct. A HIGH-tier agent must:

1. Read the task file `ai-plan/tasks/Pxx-*.md` to understand the goal.
2. Read the CODEMAP rows the task added.
3. Check each file against the task's Verify commands.
4. Check for: missing tests, stubs (marked STUB in CODEMAP), security holes, missing CONTRACTS alignment, hardcoded values.
5. Fix issues. Keep all existing tests green.
6. Log every change in PROGRESS-LOG.md.
7. Change task status to `[x]` and all CODEMAP rows to `LOCKED`.
8. Commit: `fix(Pxx-Tyy): high-tier review corrections`.

## Review checklist per task

- [ ] All Verify commands pass with real output
- [ ] No stubs or TODOs in production paths
- [ ] Server-side authz on every mutating route
- [ ] No secrets in committed files
- [ ] No `eval`/`Function()` on user input
- [ ] Types check clean
- [ ] Lint passes
- [ ] Tests cover happy path + at least one error case
- [ ] CONTRACTS.md names used exactly
- [ ] No package outside STACK.md
- [ ] CODEMAP updated (OK or LOCKED)
- [ ] PROGRESS-LOG DONE entry appended

## Phase review (P00-RV, P01-RV, etc.)

A phase review checks all tasks in the phase:
1. Run all Verify commands for the phase.
2. Do a cross-task integration check (do the pieces fit?).
3. Update CODEMAP: mark all phase rows LOCKED.
4. Write a summary DONE entry covering the whole phase.
5. Commit: `chore(P0x-RV): phase review complete`.
