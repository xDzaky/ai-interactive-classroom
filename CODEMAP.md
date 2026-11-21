# CODEMAP.md — map of the code so nobody has to scan the repo

Rules:
- Every file created/changed by a task gets ONE row here at end-of-task. Keep purpose ≤ 12 words.
- Status: `OK` finished · `STUB` incomplete (explain) · `LOCKED` finished + verified (LOW/MID may not change it; see AGENTS.md §5).
- When a task becomes `[x]`, change its rows to `LOCKED`.
- Keep rows sorted by path inside each section. Do not delete rows of existing files.
- "Exports" = what other code imports (function/class/component names). This is what lets other agents reuse code without opening the file.
- "Pattern to copy" section at the bottom: HIGH-tier agents point LOW/MID agents to the best example file for each kind of work.

## apps/api (Laravel)
| Path | Purpose | Exports / routes | Task | Status |
|---|---|---|---|---|
| _(empty)_ | | | | |

## apps/web (React)
| Path | Purpose | Exports | Task | Status |
|---|---|---|---|---|
| _(empty)_ | | | | |

## apps/ai-service (FastAPI)
| Path | Purpose | Exports / routes | Task | Status |
|---|---|---|---|---|
| _(empty)_ | | | | |

## packages/*
| Path | Purpose | Exports | Task | Status |
|---|---|---|---|---|
| _(empty)_ | | | | |

## infra / root / CI
| Path | Purpose | Notes | Task | Status |
|---|---|---|---|---|
| _(empty)_ | | | | |

## Patterns to copy (filled by HIGH-tier agents)
| Kind of work | Best example file | Why |
|---|---|---|
| _(empty)_ | | |
