# TASKS-ADDENDUM.md — append the blocks below to the END of `ai-plan/TASKS.md` (after P09). Do not renumber anything.

Priority order: P10 (fix zoom performance + shape recognition) → P11 (solid geometry / bangun ruang) → P12 (optional UX/compat).
Same legend and pick rule as TASKS.md. Existing P00–P09 stay as they are.

---

## P10 — Whiteboard performance + shape recognition v2 · `tasks/P10-whiteboard-perf-shape.md`
- [ ] P10-T01 | MID  | deps: P09-RV | Locate code, build perf harness (fixtures, FPS meter), record baseline
- [ ] P10-T02 | MID  | deps: T01    | Diagnose root cause by experiments (evidence before fixes)
- [ ] P10-T03 | MID  | deps: T02    | Imperative viewport controller (zoom/pan without React re-render)
- [ ] P10-T04 | MID  | deps: T02    | Grid as CSS background + adaptive spacing (no per-line nodes)
- [ ] P10-T05 | MID  | deps: T03    | Layer split, memoization, listening(false), culling
- [ ] P10-T06 | MID  | deps: T03    | Stroke rendering: cached paths, point reduction on commit
- [ ] P10-T07 | MID  | deps: T03    | 3D overlay perf (frameloop demand, DPR cap, context limit)
- [ ] P10-T08 | MID  | deps: T03-T07 | Re-measure against budgets, write result doc
- [ ] P10-T09 | HIGH | deps: P09-RV | packages/sketch-core: shape recognizer v2 (confidence + reject option)
- [ ] P10-T10 | MID  | deps: T09    | Synthetic corpus generator + negative set + dev stroke recorder
- [ ] P10-T11 | MID  | deps: T09    | Integrate recognizer: modes Otomatis/Tahan/Mati, suggestion chip, undo-to-ink
- [ ] P10-T12 | HIGH | deps: T10,T11 | Accuracy gate (corpus + human samples), tuning, confusion matrix doc
- [ ] P10-T13 | MID  | deps: T12    | OPTIONAL: extra planar shapes (jajargenjang, trapesium, layang-layang, siku-siku, sudut)
- [ ] P10-RV  | HIGH | deps: T01-T12 | Phase review

## P11 — Solid geometry / bangun ruang (iFLYTEK-style) · `tasks/P11-solid-geometry.md`
- [ ] P11-T01 | MID  | deps: P10-T08 | Audit existing 3D code (viz_solid, viewer, geometry) → AUDIT-P11.md
- [ ] P11-T02 | HIGH | deps: T01    | geometry-core: Polyhedron model (cube, cuboid, prism, pyramid) with labels/faces/edges
- [ ] P11-T03 | HIGH | deps: T02    | geometry-core: plane/line math, convex cross-section, angles, distances
- [ ] P11-T04 | MID  | deps: T02    | Web: PolyhedronViewer (hidden dashed edges, vertex handles, labels)
- [ ] P11-T05 | HIGH | deps: T03,T04 | Section (irisan) tool: 3 vertices / parallel plane, filled polygon, cut-away, info card
- [ ] P11-T06 | MID  | deps: T03,T04 | Measure tool: distance, angle, diagonal shortcuts with formulas
- [ ] P11-T07 | MID  | deps: T05    | Sync viz state (section/labels/unfold) via existing events + reducer + replay safe
- [ ] P11-T08 | MID  | deps: T04,P10-T12 | Datar→Ruang: turn a recognized 2D shape into a solid (context chooser)
- [ ] P11-T09 | HIGH | deps: T03    | Jaring-jaring: unfold/fold animation (general convex + cylinder/cone)
- [ ] P11-T10 | HIGH | deps: T08,P10-T12 | OPTIONAL: wireframe sketch→solid recognition (cube/pyramid/prism/cylinder/cone)
- [ ] P11-T11 | LOW  | deps: T06    | i18n glossary (Indonesian terms) + a11y labels
- [ ] P11-RV  | HIGH | deps: T01-T09 | Phase review

## P12 — Board UX + compatibility (optional, inspired by iFLYTEK demo) · `tasks/P12-board-ux-optional.md`
- [ ] P12-T01 | MID  | deps: P11-T04 | Radial quick-action menu (floating dial)
- [ ] P12-T02 | MID  | deps: P11-T06 | Floating contextual toolbar under selected 3D object
- [ ] P12-T03 | MID  | deps: P12-T01,P08-T05 | OPTIONAL: handwriting → LaTeX via vision LLM → graph (teacher-confirmed)
- [ ] P12-T04 | MID  | deps: P10-T08 | Multi-pointer writing (several pens/fingers at once) + large-touch mode for smart displays
- [ ] P12-T05 | LOW  | deps: P12-T04 | Device matrix update + Playwright device emulation checks
- [ ] P12-T06 | LOW  | deps: P11-T11 | OPTIONAL: voice commands (Web Speech API, id-ID) for 5 commands
- [ ] P12-RV  | HIGH | deps: T01-T05 | Phase review
