# TASKS-ADDENDUM-P13.md — append to the END of `ai-plan/TASKS.md` (after P12). Do not renumber anything.

P13 = learn from GeoGebra legally (clean-room + UX study + evaluate alternatives). It starts with a HUMAN decision gate.
No GeoGebra code, icon, translation string or file may enter the repo until P13-T00 is `[x]`.

## P13 — GeoGebra study, clean-room, UX redesign · `tasks/P13-geogebra-study-ux.md`
- [ ] P13-T00 | HUMAN | deps: -        | LEGAL GATE: choose path A/B/C and record ADR-P13 in DECISIONS.md
- [ ] P13-T01 | LOW   | deps: T00      | Third-party policy doc + guard script wired into CI/verify
- [ ] P13-T02 | HIGH  | deps: T00,P11-T03 | Clean-room READER sessions → behavior specs in docs/study/geogebra/ (no code copied)
- [ ] P13-T03 | MID   | deps: T00      | UX study (use the apps manually) → own design spec + tokens (no assets copied)
- [ ] P13-T04 | MID   | deps: T00      | Spike: JSXGraph as 2D dynamic-geometry engine (license + fit) → build-vs-adopt decision
- [ ] P13-T05 | MID   | deps: T00      | OPTIONAL (path A only): feature-flagged GeoGebra Apps embed for NON-COMMERCIAL pilot
- [ ] P13-T06 | HIGH  | deps: T02,T04  | construction-core: own dependency-graph engine (only if T04 says "build")
- [ ] P13-T07 | MID   | deps: T03      | Apply design spec: workspace layout (objects panel, grouped toolbar, mode presets)
- [ ] P13-T08 | MID   | deps: T03,P11-T11 | Lesson-template library + Kurikulum Merdeka taxonomy (original content)
- [ ] P13-RV  | HIGH  | deps: T01-T04,T07 | Phase review (incl. guard script and license audit)
