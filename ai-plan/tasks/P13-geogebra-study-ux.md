# P13 — GeoGebra study (legal), clean-room specs, UX redesign

## Header (read once)
- Same authorization rules as P10 (LOCKED files editable only when listed in `Allowed paths`).
- **What GeoGebra's GitHub repo is:** `https://github.com/geogebra/geogebra` is a MIRROR of the source of GeoGebra's math APPS (Graphing, Geometry, 3D, Classic…), written in Java and built for the web with GWT (`./gradlew -p source/web :web:run`). It is NOT the source of the `geogebra.org` website/portal (accounts, resource hub, `/math/...` pages, materials). Repo README says to read `https://www.geogebra.org/license` for licensing.
- **Licensing summary (verify on the live page before any decision):** the license page says the source code is licensed under **EUPL v1.2**; derivative works of the CODE may be made under EUPL without a non-commercial restriction, BUT using the code together with GeoGebra's Materials and/or Language Files "as part of the GeoGebra product" stays **non-commercial only**; commercial use needs an agreement with GeoGebra GmbH. EUPL is copyleft: a derivative work (a Java→TypeScript port counts) must be distributed/communicated under EUPL or a compatible licence. This repo's README says "Proprietary" → copying or porting GeoGebra code is incompatible with that, unless the owner changes the licensing strategy.
  - License page: https://www.geogebra.org/license (mirror text also at https://geogebra.org/license)
  - Not legal advice. A lawyer should review before commercial launch.
- **Allowed without any licence question:** ideas, mathematics, algorithms described in your own words, general UX patterns (layout concepts, interaction ideas). **Not allowed:** copying/porting source code, icons/images/CSS/trade dress, translation/language strings, GeoGebra materials (user-made, NC licensed), the name/logo as your product identity, scraping the live site's assets "to reuse".
- Reverse engineering the compiled web bundle is unnecessary (readable source is public) and adds risk. Do not do it.
- Guard: `scripts/check-third-party.mjs` fails CI if GeoGebra identifiers/files appear under `apps/`, `packages/`, `scripts/` (except the allowlisted embed spike folder).

---

### P13-T00 — LEGAL GATE (HUMAN decides)   [tier: HUMAN] [deps: -]
No agent may mark this `[x]`. The human picks ONE path and an agent records it in `ai-plan/DECISIONS.md` as `ADR-P13` (template below).
- **Path A — Embed GeoGebra (non-commercial pilot only).** Official apps via the Apps API; zero GeoGebra code in the repo. Free for non-commercial use; any commercial use (e.g., schools charging tuition/fees, paid platform) needs a licence/collaboration agreement. Works online only (not for the offline PWA promise).
- **Path B — Commercial agreement with GeoGebra.** Contact the address on the licence page; ask what a platform integration costs and what may be reused. Everything else waits for their answer.
- **Path C — Clean-room (recommended for a proprietary product).** Learn behavior from GeoGebra's public docs/source, write behavior specs in your own words (T02), implement your own code (T06/P11), evaluate permissive libraries (T04). Own design system (T03).
- **Path D — Go open source under EUPL-compatible terms** to reuse code directly. Only if the human wants to change this project's licence; then the whole derivative must follow EUPL.
ADR template:
```
ADR-P13 | date | decided by: <human>
Path: A | B | C | D (can combine A for pilot + C for production)
Commercial intent: yes/no/unknown (does any school pay? any fee?)
Consequences: ...
Review date: ...
```
Verify: ADR-P13 exists with a chosen path.

### P13-T01 — Third-party policy + guard   [tier: LOW] [deps: T00]
Allowed paths: `docs/THIRD-PARTY-POLICY.md` (new), `scripts/check-third-party.mjs` (provided), root `package.json` (additive script), `.github/workflows/ci.yml` (additive step).
Steps:
- [ ] 1. Copy `scripts/check-third-party.mjs` from this package to the repo root `scripts/`.
- [ ] 2. Root `package.json`: add `"check:third-party": "node scripts/check-third-party.mjs"`; add it to the existing aggregate verify script and as a CI step.
- [ ] 3. `docs/THIRD-PARTY-POLICY.md`: copy the "Allowed / Not allowed" lists from this file's header, the chosen ADR-P13 path, and how to add a new third-party library (DECISIONS entry + license check + allowlist in STACK.md).
Verify: `node scripts/check-third-party.mjs` → `third-party guard: OK`; create a temp file containing the word `geogebra` under `packages/` → script exits 1 (then delete the temp file).

### P13-T02 — Clean-room READER sessions   [tier: HIGH] [deps: T00, P11-T03]
Goal: extract BEHAVIOR (what happens, invariants, edge cases) from GeoGebra into specs written in our own words, so our code is independently written. Only for paths B/C/D? Reading public source to understand is allowed; copying is not. Do this ONLY if ADR-P13 includes path C.
Roles (must be DIFFERENT chat sessions):
- **Reader** (this task): may read GeoGebra source and public docs. Writes `docs/study/geogebra/<topic>.md`. Hard rules: no pasted code, no copied comments/strings/translations, at most 3 identifiers per document (for traceability), numeric test vectors must be computed by us from the math (not copied from their tests), plain-language descriptions only.
- **Implementer** (P11/T06 tasks): must NOT open GeoGebra source. Uses only `docs/study/geogebra/*.md` + our CONTRACTS. Writes tests first from the spec's vectors.
Provenance: `docs/study/geogebra/PROVENANCE.md` — one row per session: date, reader model, topic, GeoGebra paths looked at (paths only), confirmation "no code copied".
Where to look: list `source/` first (README confirms `source/web` and `source/desktop`; find the shared/kernel modules by listing directories — do not assume names). Public behavior docs: https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_API (API) and the user manual on wiki.geogebra.org (use as behavior reference only; its text is not ours to copy).
Topics (one session each; stop after the spec is written):
- [ ] S1 `section-plane-polyhedron.md` — how plane/polyhedron intersection is defined; degenerate cases (plane touches a vertex/edge/face, plane misses); ordering of intersection points; what is displayed. Our P11-T03 already defines the algorithm — this session is for edge cases we missed.
- [ ] S2 `nets.md` — what "net/unfold" does for each solid type, hinge/face order, animation parameter semantics, behavior for curved solids. Compare with P11-T09; list gaps.
- [ ] S3 `view3d-interaction.md` — rotate/zoom/pan rules, vertex picking/snapping tolerance, how labels avoid overlap, hidden-line drawing style, selection highlight, default view angles.
- [ ] S4 `dependency-graph.md` — how dependent objects update when a free object is dragged (order of recomputation, undefined states, cycles prevention), object naming rules, undo of constructions.
- [ ] S5 `measurement-tools.md` — angle/length/area measuring behavior and display rules (units, rounding, label placement).
- [ ] S6 `toolbar-structure.md` — tool grouping and discoverability (UX, no pixels): categories, which tools are one tap vs nested, how a tool's step-by-step hint works.
Each spec must end with: "Edge cases", "Test vectors (ours)", "Gaps vs our implementation" (list of new tasks proposed, not created).
Verify: each file exists, passes `node scripts/check-third-party.mjs` (docs are not scanned, so ALSO `grep -c "{" docs/study/geogebra/*.md` must show no code blocks longer than 3 lines — review manually), PROVENANCE.md updated.

### P13-T03 — UX study → own design spec   [tier: MID] [deps: T00]
Goal: take what works (information architecture and interaction patterns) and express it in OUR design language.
Allowed paths: `docs/ux/**` (new), `apps/web/src/styles/tokens.css` (new, only when the human approves the spec), `ai-plan/AUDIT-UX.md` (new).
Steps:
- [ ] 1. Human (or agent with a browser) uses the official apps (Graphing, Geometry, 3D) at https://www.geogebra.org/ and writes notes (no asset capture saved into the repo; screenshots stay private): layout regions (algebra/objects panel, graphics view, toolbar, input bar, settings), tool grouping, mode switching, mobile layout, onboarding hints, empty states, keyboard shortcuts.
- [ ] 2. `docs/ux/geogebra-ux-notes.md`: observations in our own words, grouped as Information Architecture / Interaction patterns / Mobile / Accessibility. Include a "good ideas to adopt" list and a "do not copy" list (anything distinctive: exact icons, color palette, illustrations, wording).
- [ ] 3. `docs/ux/design-spec.md`: OUR design system: color tokens (light/dark + high-contrast), typography scale, spacing (4-pt), radii, elevation, motion rules (respect reduced motion), touch target ≥ 44 px, icon set = the project's existing icon library (check its licence), component mapping to shadcn/ui, and a page-by-page redesign backlog for: `/whiteboard`, TeacherView, StudentView, PresentationView, ControllerPage.
- [ ] 4. `apps/web/src/styles/tokens.css` after human approval: CSS variables only; do not restyle pages in this task.
Verify: spec files exist; `docs/ux` contains no image files copied from geogebra.org (`ls docs/ux`); human approves the spec in PROGRESS-LOG ("approved by <name> <date>").

### P13-T04 — Spike: JSXGraph for 2D dynamic geometry   [tier: MID] [deps: T00]
Why: JSXGraph (University of Bayreuth) offers interactive geometry (points, lines, circles, constructions with dependent objects, drag) and, per its site, is dual-licensed LGPL/MIT, "including for commercial purposes". It could replace building a construction engine for 2D.
Allowed paths: `apps/web/src/spikes/jsxgraph/**` (new, deletable), `docs/spikes/jsxgraph.md` (new), `ai-plan/DECISIONS.md` (PROPOSED entry), `ai-plan/STACK.md` (only if accepted).
Steps:
- [ ] 1. Verify the licence yourself: https://github.com/jsxgraph/jsxgraph (LICENSE.MIT, LICENSE.LGPL) and https://jsxgraph.uni-bayreuth.de/home/ — record the MIT choice in the spike doc.
- [ ] 2. Prototype in a throwaway page: load via npm (pinned exact version ≥ 2 weeks old), create a board with 3 free points + midpoint + perpendicular bisector + circle through 3 points; drag a free point and confirm dependents update; test touch drag on a tablet/emulator.
- [ ] 3. Evaluate against criteria and score 0–3 each: React 19 integration effort, TypeScript types, bundle size impact, touch/stylus, theming/dark mode, i18n (Indonesian labels), accessibility (ARIA hooks), performance with 200 objects, can it export state JSON for our event log/replay, can it be driven by our own events (headless control).
- [ ] 4. Decision in `docs/spikes/jsxgraph.md`: ADOPT (wrap it as a board object type `viz_construction`), BUILD (own engine, T06), or HYBRID (JSXGraph for rendering/interaction, our state model). Add `PROPOSED` to DECISIONS.md; the human accepts.
Verify: spike doc has the score table and a decision; spike code isolated in `apps/web/src/spikes/jsxgraph/`; no change to production routes.

### P13-T05 — OPTIONAL: GeoGebra Apps embed (path A only)   [tier: MID] [deps: T00]
Only if ADR-P13 says path A. Purpose: a quick non-commercial pilot showing GeoGebra's own 3D/Geometry apps inside our room, with zero GeoGebra code in our repo.
Allowed paths: `apps/web/src/features/ggb-embed/**` (new; allowlisted in the guard script), i18n (additive).
Design:
- Official embedding method: include `https://www.geogebra.org/apps/deployggb.js`, create `new GGBApplet({ appName: 'geometry' | '3d' | 'graphing', ... }, true)`, `inject('<div id>')`. Docs: https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_Embedding and https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_API (also https://wiki.geogebra.org/en/Reference:GeoGebra_Apps_Embedding).
- Feature flag `VITE_GGB_EMBED=1`; teacher-only; lazy-loaded; the page's CSP must allow the script origin — document the change in the security headers (P09-T01 middleware) instead of weakening it globally.
- Visible banner "Mode non-komersial (GeoGebra)" and a link to the licence; disabled automatically when `VITE_COMMERCIAL=1`.
- Never copy the downloaded bundle into the repo. No offline use (the PWA must show a friendly "butuh internet").
- State sharing is NOT synchronized to students in this spike; teacher can export PNG (`getPNGBase64`) and drop it on the board as an image object.
Steps: [ ] 1. wrapper component + loader; [ ] 2. flag + banner + CSP note; [ ] 3. test (mock `GGBApplet`) for flag off/on and error path; [ ] 4. doc `docs/spikes/ggb-embed.md` with the commercial-use warning.
Verify: vitest pass; guard script OK (allowlist only); production build without the flag contains no `deployggb` string (`grep -c deployggb apps/web/dist -r` → 0).

### P13-T06 — construction-core (own engine)   [tier: HIGH] [deps: T02, T04]
Only if T04 decided BUILD or HYBRID. Package `packages/construction-core` (pure TS).
Scope (MVP, 2D): free points; dependent objects: segment, line (2 points), ray, midpoint, perpendicular line, parallel line, circle (center+point), circle (3 points), intersection (line-line, line-circle, circle-circle), polygon, angle (3 points). Dependency DAG with topological recompute; cycle prevention (reject an edit that would create a cycle); undefined states propagate (e.g., parallel lines have no intersection → dependent objects `undefined`, not NaN); serialization to JSON compatible with our event log (`construction.object.created/updated/deleted`) — propose names in DECISIONS first.
Implement from `docs/study/geogebra/dependency-graph.md` and the math only (the Implementer must not read GeoGebra source).
Tests: invariants (drag A → midpoint of AB equals (A+B)/2); intersection of two lines with known answer; circle through 3 points: A(0,0), B(2,0), C(0,2) → center (1,1), radius √2; undefined handling; cycle rejection; 1000-object recompute < 16 ms (measure, report).
Verify: package tests pass; CODEMAP updated.

### P13-T07 — Apply design spec: workspace layout   [tier: MID] [deps: T03]
Allowed paths: `apps/web/src/pages/whiteboard/**` (layout only), `apps/web/src/components/workspace/**` (new), `apps/web/src/styles/**`, i18n (additive).
Steps:
- [ ] 1. Objects panel (like an algebra/objects list): lists board objects (shapes, solids, graphs) with visibility toggle, lock, rename (A, B, C for vertices of solids), delete; click selects on the canvas. Uses existing object ids/events — no new event types.
- [ ] 2. Grouped toolbar with flyouts: Draw (pen, highlighter, eraser), Shapes, Geometry (line, segment, angle, measure), 3D (solids, section, net), Graph (function), Text/Math. Keyboard shortcuts documented in a help dialog.
- [ ] 3. Mode presets (like Graphing/Geometry/3D): "Menggambar", "Grafik 2D", "Geometri", "Bangun Ruang" = just different default toolbar group + panel layout + grid on/off; same board underneath.
- [ ] 4. Responsive: desktop (3 regions), tablet (collapsible panel), phone (bottom sheet). Large-touch mode from P12-T04 respected.
- [ ] 5. Apply tokens; no icon/asset copied from GeoGebra.
Verify: component tests; Playwright smoke on 3 viewport sizes if configured; perf gate from P10 still met (record in PROGRESS-LOG).

### P13-T08 — Lesson-template library + taxonomy   [tier: MID] [deps: T03, P11-T11]
Idea taken from the geogebra.org math hub (categories such as Number Sense, Algebra, Geometry, Measurement, Operations, Probability & Statistics): a browsable library of ready-to-use board templates. CONTENT MUST BE OURS (GeoGebra materials are user-made and NC-licensed; do not import them).
Allowed paths: `packages/curriculum-schema/src/**` (additive), `apps/web/src/features/templates/**` (new), `apps/web/src/i18n/locales/id.json` (additive), `docs/templates/README.md` (new).
Steps:
- [ ] 1. Taxonomy: map to the Indonesian Kurikulum Merdeka math elements as the human confirms them (typically Bilangan, Aljabar, Pengukuran, Geometri, Analisis Data dan Peluang) × phase/grade; extend `curriculum-schema` additively (`LessonTemplate { id, title, elementCode, phase, boardState, instructions }`).
- [ ] 2. Author 10 starter templates as `BoardState` JSON (original): kubus ABCD.EFGH diagonal ruang; irisan kubus (3 titik); jaring-jaring balok; luas permukaan tabung; grafik fungsi kuadrat; garis dan sudut; keliling & luas bangun datar; dll. Each template carries a teacher note and 2 student questions (reviewed by a human teacher).
- [ ] 3. UI: template picker (search by element/phase) → creates a new scene from the template through normal board events (undoable).
- [ ] 4. Optional later: AI-assisted template drafting through the existing AI job layer with teacher review/approve (never auto-publish).
Verify: schema tests; each template loads without errors (`BoardState` zod parse); picker tests.

### P13-RV — Phase review   [tier: HIGH]
Follow `ai-plan/REVIEW.md`. Extra: run `node scripts/check-third-party.mjs`; confirm `docs/study/geogebra/*.md` contain no copied code or text (spot-check 3 files); confirm PROVENANCE.md; confirm ADR-P13 matches what shipped (e.g., no embed in production if commercial); update `docs/THIRD-PARTY-POLICY.md`; lock files; add lessons to KNOWLEDGE.md.
