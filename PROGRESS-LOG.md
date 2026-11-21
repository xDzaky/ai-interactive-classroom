# PROGRESS-LOG.md — append-only. Newest entry at the BOTTOM. Read only the tail: `tail -n 40 ai-plan/PROGRESS-LOG.md`

Never edit or delete old entries. Append new ones only.

## Entry templates (copy one)

```
### START  <YYYY-MM-DD HH:MM> | <model> | tier <LOW/MID/HIGH> | <task id>
Resuming: yes/no (from step N)
Plan: one line

### STEP   <time> | <task id>.<step>
Done: what exactly (files)
Commit: <short hash>

### DONE   <time> | <task id> | status [x]/[R]/[!]
Changed files: (list, short)
Verify evidence:
- `<command>` → <last lines / pass-fail summary>
Notes for next agent: (or "none")
Next eligible task: <id>

### HANDOFF <time> | <task id> | reason: limit/context/blocked
Last finished step: N
NEXT step: N+1 — exact action
Half-done files: (paths + what is missing)
Commands still to run:
Warnings:

### BLOCKED <time> | <task id>
Error (exact): ...
Tried (3 different attempts): 1) ... 2) ... 3) ...
Suspected cause: ...
Needs: human decision / higher-tier model / missing credential
```

---

## Log

### INIT  2026-11-21 | planner (Claude) | no code written yet
Planning package created. Start with P00-T01. Original docs must be copied to `docs/` in P00-T01.
