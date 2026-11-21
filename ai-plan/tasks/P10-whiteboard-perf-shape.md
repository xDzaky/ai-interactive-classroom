# P10 — Whiteboard performance + shape recognition v2

## Header (read once)
- **Authorization:** P10–P12 are human-approved FIX/feature tasks. They MAY modify files marked LOCKED in CODEMAP **only if the file is listed under the task's `Allowed paths`**. Existing tests covering unchanged behavior must stay green. Tests may be edited only to follow an intentional internal change; log every such edit in PROGRESS-LOG.
- File paths below come from `ai-plan/CODEMAP.md`. If a path differs on disk, find it with the scoped greps in P10-T01, record the real path in `ai-plan/AUDIT-P10.md`, and use that.
- Package filter: `@ai-classroom/web`. Use `pnpm --filter @ai-classroom/web exec <cmd>` for tools (avoids guessing script names).
- Symptoms reported by the human (2026-11-22): (1) zoom in/out is very heavy at route `/whiteboard`; (2) auto-shape sometimes converts a drawing into a DIFFERENT shape; unclear freehand blobs/scribbles should stay as ink.
- Grid convention (new, document in UI): **1 minor grid cell = 20 world units = 1 cm** for geometry work.

Budgets (the acceptance gate for P10-T08): on a production build (`build` + `preview`), scene `?perf=300x100` (300 strokes × ~150 pts + 100 shapes), zoom/pan p95 frame time ≤ 20 ms; scene `?perf=1000x300` p95 ≤ 33 ms; no more than 3 consecutive frames > 50 ms during a 29%→300% zoom sweep.

---

### P10-T01 — Locate code, perf harness, baseline   [tier: MID] [deps: P09-RV]
Goal: find every file involved and measure the current state BEFORE changing behavior.
Allowed paths: `ai-plan/AUDIT-P10.md` (new), `docs/perf/**` (new), `apps/web/src/dev/**` (new), `apps/web/e2e/perf-zoom.spec.ts` (new), `apps/web/src/pages/whiteboard/**` (additive: only a dev-only `?perf=` fixture loader; no behavior change).
Read: `CODEMAP.md` rows for WhiteboardCanvas, useWhiteboardTool, usePointerEvents, ToolBar, snapping, sceneManager, WhiteboardOverlay.
Steps:
- [ ] 1. Locate with SCOPED commands (never from repo root):
  - `ls apps/web/src/pages apps/web/src/pages/whiteboard apps/web/src/components/whiteboard apps/web/src/hooks apps/web/src/lib`
  - `grep -rniE "recogni|autoshape|auto-shape|detectShape|snapShape|isCircle|isRect|isTriangle" apps/web/src packages --include=*.ts --include=*.tsx --exclude-dir=node_modules -l`
  - `grep -rniE "grid" apps/web/src/pages apps/web/src/components --include=*.tsx -n`
  - `grep -rniE "onWheel|scaleBy|\.scale\(|setScale|setZoom|stage\.position" apps/web/src --include=*.ts --include=*.tsx -n`
  - `grep -rniE "saveBoardToLocal|useDraftBoard|localStorage" apps/web/src --include=*.ts --include=*.tsx -n`
- [ ] 2. Create `ai-plan/AUDIT-P10.md`: table `concern → file → line range → how it works (≤3 lines)` for: `/whiteboard` route page, grid, wheel/pinch zoom, stroke rendering, shape rendering, auto-shape recognizer, autosave, 3D overlay positioning. Note whether zoom updates React state per event.
- [ ] 3. `apps/web/src/dev/perfFixture.ts`: `makePerfScene({ strokes, shapes, seed })` → valid `BoardState` (use `createInitialBoardState` + the existing object types). Deterministic PRNG (mulberry32). Stroke = smooth random walk ~150 points. Enabled only when URL has `?perf=<strokes>x<shapes>` AND (`import.meta.env.DEV || import.meta.env.VITE_PERF === '1'`).
- [ ] 4. `apps/web/src/dev/FpsMeter.tsx`: rAF sampler showing avg and p95 frame ms (last 120 frames). Rendered only when `?perf=` is present.
- [ ] 5. `apps/web/e2e/perf-zoom.spec.ts` (Playwright): open `/whiteboard?perf=300x100`, run 60 wheel events (zoom out then in) while sampling rAF intervals, print avg/p95, write `docs/perf/last-run.json`. `test.skip(!process.env.PERF)` so CI is unaffected.
- [ ] 6. Measure on the PRODUCTION build (dev mode is slower: StrictMode double render, unminified): `pnpm --filter @ai-classroom/web build` then `pnpm --filter @ai-classroom/web exec vite preview`. Record for: empty board, `300x100`, `1000x300`, each over zoom 100% → 29% → 300%. In Chrome DevTools → Performance, record 5 s of zooming; write the top-5 self-time functions and the share of "Recalculate style"/"Layout" into `docs/perf/BASELINE.md` with machine/browser info.
Verify:
- `pnpm --filter @ai-classroom/web exec tsc --noEmit` → no errors
- `pnpm --filter @ai-classroom/web exec vitest run` → all pass
- `AUDIT-P10.md` and `docs/perf/BASELINE.md` exist and contain numbers.
Refs: Konva perf tips https://konvajs.org/docs/performance/All_Performance_Tips.html

### P10-T02 — Diagnose by experiment   [tier: MID] [deps: T01]
Goal: prove which hypotheses cost frame time; fix only what is measured.
Allowed paths: `docs/perf/DIAGNOSIS.md` (new); temporary local flags in whiteboard files (REMOVE before commit; never commit flags).
Hypotheses: H1 grid built as many Konva nodes / redrawn each zoom · H2 zoom stored in React state → whole scene re-renders per wheel/pinch event · H3 stroke nodes rebuild perfect-freehand outlines every render · H4 every node `listening` (hit graph) · H5 high `pixelRatio` on HiDPI · H6 DOM overlay (`WhiteboardOverlay`) re-laid out per zoom step · H7 autosave/JSON work during zoom · H8 dev-mode artefacts.
Steps:
- [ ] 1. For each experiment run the same fixture and record p95: E1 grid hidden · E2 all shapes `listening(false)` · E3 strokes layer hidden · E4 overlay hidden · E5 `Konva.pixelRatio = 1` · E6 autosave disabled · E7 count renders of `WhiteboardCanvas` during 60 wheel events (`console.count`, remove after) · E8 production vs dev.
- [ ] 2. Write `docs/perf/DIAGNOSIS.md`: table `hypothesis → experiment → p95 before/after → verdict (confirmed if ≥10% better)` and the ordered fix list for T03–T07.
Verify: DIAGNOSIS.md exists; `git diff --stat` shows no leftover experiment flags.

### P10-T03 — Imperative viewport controller   [tier: MID] [deps: T02]
Goal: zoom/pan never triggers a React re-render of the scene.
Allowed paths: `apps/web/src/lib/viewport.ts` (new), `apps/web/src/lib/viewport.test.ts` (new), `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx`, `apps/web/src/hooks/usePointerEvents.ts`.
Steps:
- [ ] 1. `viewport.ts`: class `ViewportController` holding `{scale, x, y}` in a plain object. Methods: `zoomAt(screenX, screenY, factor)`, `panBy(dx, dy)`, `set(v)`, `subscribe(fn)`; clamp scale to [0.1, 8]. It schedules at most ONE `requestAnimationFrame` per frame; inside it calls `stage.scale()/position()`, `stage.batchDraw()` and notifies subscribers (grid, overlay).
- [ ] 2. Invariant (test it): the world point under the cursor stays fixed. `world = (screen − pos)/scale` before and after. Vector: scale 1, pos (0,0), `zoomAt(100,50,2)` → scale 2, pos (−100,−50).
- [ ] 3. Wheel: factor `Math.exp(-deltaY * 0.0015)` (smooth for trackpads); keep existing modifier-key behavior (check current handler). Pinch in `usePointerEvents` calls the controller, not `setState`.
- [ ] 4. React state for the zoom percentage label is updated debounced (120 ms) only.
- [ ] 5. Existing tests for WhiteboardCanvas / usePointerEvents stay green (update mocks only if the API changed).
Verify: `pnpm --filter @ai-classroom/web exec vitest run src/lib/viewport.test.ts` pass; full vitest pass; PERF run shows fewer renders (E7 count ≈ 0 during zoom).
Refs: Konva stage zoom/drag docs via REFERENCES.

### P10-T04 — Grid as CSS background + adaptive spacing   [tier: MID] [deps: T02]
Goal: zero canvas cost for the grid.
Allowed paths: `apps/web/src/lib/gridSpec.ts` (+test) (new), `apps/web/src/components/whiteboard/GridBackground.tsx` (new), `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx`, `apps/web/src/lib/snapping.ts` (additive).
Steps:
- [ ] 1. `gridSpec(scale, baseWorld = 20)` → `{ worldSpacing, screenSpacing, visible }`: `spacing = baseWorld; while (spacing*scale < 14) spacing *= 5; visible = scale >= 0.15`. Test vectors: scale 1 → world 20, screen 20; scale 0.29 → world 100, screen 29; scale 3 → world 20, screen 60; scale 0.1 → `visible=false`.
- [ ] 2. `GridBackground`: a `div` BEHIND the Konva stage (stage background transparent) using two `linear-gradient` layers (minor 1px) + two stronger layers every 5 cells (major). `background-size` and `background-position` driven by CSS variables `--gs`, `--gx`, `--gy` written imperatively by a `ViewportController` subscriber (no React render).
- [ ] 3. Remove the old per-line Konva grid nodes. Snap-to-grid keeps using the world base spacing (20) — behavior unchanged; `snapping.test` stays green.
- [ ] 4. PNG export does not include the grid (document it).
Verify: gridSpec tests pass; vitest all pass; manual: at 29% the grid looks sparse (29 px cells), not a dense mesh.

### P10-T05 — Layers, memoization, listening, culling   [tier: MID] [deps: T03]
Allowed paths: `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx`, `apps/web/src/pages/whiteboard/objects/**` (new, small components), `apps/web/src/lib/viewport.ts` (additive).
Steps:
- [ ] 1. Max 3 Konva layers: `committedLayer` (listening only while tool is select/eraser), `liveLayer` (current stroke/shape preview), `uiLayer` (Transformer/selection). Set `listening={false}` on layers/nodes that do not need events (see Konva Listening_False).
- [ ] 2. Per-object components wrapped in `React.memo` with equality on the object reference; stable callbacks (`useCallback`/refs). `perfectDrawEnabled={false}` for shapes with fill+stroke; `shadowForStrokeEnabled={false}`; `hitStrokeWidth` ≤ 12.
- [ ] 3. Culling when object count > 200: register Konva nodes in a `Map<id, Konva.Node>` via ref callbacks; in the controller's rAF `apply()` toggle `node.visible(...)` by bbox-vs-viewport (margin 200 px). bbox cached in a `WeakMap` keyed by the object reference.
- [ ] 4. Do NOT cache every node (Konva docs warn). Cache only if DIAGNOSIS shows benefit.
Verify: vitest pass; PERF numbers recorded in `docs/perf/DIAGNOSIS.md` appendix.
Refs: https://konvajs.org/docs/posts/canvas-performance.html

### P10-T06 — Stroke rendering   [tier: MID] [deps: T03]
Allowed paths: `apps/web/src/pages/whiteboard/objects/StrokeNode.tsx` (new), `apps/web/src/lib/strokePath.ts` (+test) (new), `apps/web/src/hooks/useWhiteboardTool.ts` (pen commit only).
Steps:
- [ ] 1. `strokePath.ts`: build the perfect-freehand outline ONCE per stroke object (memo in a `WeakMap` by points array reference) → SVG path string / `Path2D`. Benchmark Konva `Path` vs custom `Shape` + cached `Path2D`; keep the faster one (record numbers).
- [ ] 2. On commit only: reduce raw points (min spacing 1.5 screen px ÷ scale; Douglas–Peucker tolerance ≤ 0.4 world units; hard cap 400 points; keep pressure array aligned). Old stored strokes stay valid (no schema change).
- [ ] 3. Live stroke preview is drawn on `liveLayer` from a ref (no state per move); commit = ONE `whiteboard.stroke.committed` event on pointerup (unchanged contract).
Verify: tests for point reduction (a straight 1000-pt line collapses to ≤ 3 points; a circle keeps ≥ 20); vitest all pass.
Refs: perfect-freehand https://github.com/steveruizok/perfect-freehand · simplify.js (algorithm reference) https://github.com/mourner/simplify-js/blob/master/simplify.js

### P10-T07 — 3D overlay performance   [tier: MID] [deps: T03]
Allowed paths: `apps/web/src/pages/whiteboard/WhiteboardOverlay.tsx`, its test, the existing SolidViewer file (find via AUDIT).
Steps:
- [ ] 1. Every R3F `<Canvas>`: `frameloop="demand"`, `dpr={weak ? 1 : [1, 1.5]}` (reuse `useWeakDevice`), call `invalidate()` from controls `onChange` and on prop change.
- [ ] 2. Overlay positions update imperatively from the viewport subscriber (`style.transform`/left/top via refs), not through React state.
- [ ] 3. At most 3 live WebGL canvases; others render a static snapshot image (`gl.domElement.toDataURL()` captured on blur) until clicked. Unmount canvases that are far outside the viewport.
Verify: overlay tests pass; with 1 solid on the board the idle GPU/CPU use is ~0 (`frameloop` demand) — note in DIAGNOSIS.
Refs: R3F on-demand rendering (REFERENCES).

### P10-T08 — Re-measure & gate   [tier: MID] [deps: T03–T07]
Steps:
- [ ] 1. Repeat the T01 measurements on the production build; write `docs/perf/RESULT-P10.md` (before/after table).
- [ ] 2. Compare with the budgets in the header. Missed? Add new tasks (see TASKS.md "How to add a task") instead of ad-hoc tweaks.
Verify: RESULT-P10.md exists; full `vitest run` and Playwright e2e (if configured) pass.

---

### P10-T09 — sketch-core: shape recognizer v2   [tier: HIGH] [deps: P09-RV]
Goal: replace "guess a shape" with "fit, score, and reject when unsure". When in doubt the stroke stays as ink.
Allowed paths: `packages/sketch-core/**` (new package `@ai-classroom/sketch-core`, pure TypeScript, no DOM; copy the package layout of `packages/math-core`), `pnpm-workspace.yaml` only if needed, `ai-plan/STACK.md` (additive: record the new package).
Public API (exact names):
```ts
export interface Pt { x: number; y: number; t?: number; p?: number }
export type ShapeKind = 'line'|'circle'|'ellipse'|'triangle'|'right_triangle'|'rect'|'square'|'rhombus'|'pentagon'|'hexagon'|'star';
export type ShapeGeometry =
  | { type: 'line'; a: Pt; b: Pt }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotationDeg: number }
  | { type: 'polygon'; points: Pt[] };            // ordered, closed implicitly
export interface ShapeCandidate { kind: ShapeKind; confidence: number; fitError: number; geometry: ShapeGeometry }
export interface RecognizeOptions { scale?: number; minLengthPx?: number; snapAngleDeg?: number }
export interface RecognizeResult { decision: 'snap'|'suggest'|'keep'; best: ShapeCandidate | null; candidates: ShapeCandidate[]; reason: string }
export function recognizeShape(points: Pt[], opts?: RecognizeOptions): RecognizeResult;
```
Algorithm (implement exactly; constants in one `constants.ts`):
1. Reject tiny input: path length L < `minLengthPx` (default 24 screen px, i.e. 24/scale world) or < 8 points → `keep`.
2. Remove points closer than 1 px; resample to N = 64 equidistant points.
3. `gap = |p0 − pN| / L`. **Closed** if `gap ≤ 0.20`, else open.
4. Open strokes: `line` if max perpendicular deviation from the chord / chord ≤ 0.05 and chord/L ≥ 0.9 → candidate `line` (snap to horizontal/vertical when within 5°). Other open strokes → `keep`.
5. Closed strokes → compute candidates:
   - Ellipse fit: PCA axes + radial error; `rmsErr = RMS(normalized radial distance − 1)`; confidence `clamp(1 − rmsErr/0.12, 0, 1)`; `circle` if semi-axis ratio ≥ 0.88 else `ellipse`.
   - Polygon: Douglas–Peucker with ε ∈ {0.02,0.03,0.05,0.07,0.10}×bboxDiagonal; take the first ε giving 3–10 corners after merging corners closer than 0.06·L and dropping corners with interior angle > 165°. Refine each vertex by fitting lines to the two adjacent sides and intersecting them.
   - k=3 → `triangle` (or `right_triangle` if one angle is 90°±10°); k=4 → `square` (4 sides within 12%, all angles 90°±12°), `rect` (opposite sides equal within 12%, angles 90°±12°), `rhombus` (4 sides within 12%, angles not 90°); k=5 → `pentagon` if side CV ≤ 0.25; k=6 → `hexagon` if side CV ≤ 0.25; k=10 with alternating radii (inner/outer ∈ [0.30, 0.65]) → `star`.
   - `fitError` = mean distance from the 64 points to the polygon edges ÷ bbox diagonal; confidence `clamp(1 − fitError/0.06, 0, 1) × regularity`.
   - Self-intersecting RDP polyline (non-adjacent segments cross) → candidate dropped unless it is a star.
6. Decision: best.confidence ≥ 0.80 AND (best − second) ≥ 0.10 → `snap`; best ≥ 0.55 → `suggest`; else `keep`. `reason` is a short English string for debugging.
7. Angle snapping: rotation within ±7° → axis-aligned (rect/square/rhombus/triangle base); keep real rotation otherwise.
Steps:
- [ ] 1. Package scaffold + `constants.ts` + `resample.ts` + `geometry.ts` (RDP, circle/ellipse fit, polygon metrics) with unit tests for each pure function (e.g., RDP on a noisy straight line → 2 points; resample of a 100-length line → 64 points spaced 100/63).
- [ ] 2. `recognizeShape` per the spec above. Return `candidates` sorted by confidence.
- [ ] 3. Tests with ideal inputs: circle (64 pts) → `circle` snap, confidence ≥ 0.95; square from any start vertex, CW and CCW → `square` ≥ 0.90; equilateral triangle → `triangle`; a thick "S", a figure "8", a heart, a spiral, a zigzag → `keep`.
Verify: `pnpm --filter @ai-classroom/sketch-core exec vitest run` pass; `tsc --noEmit` pass.
Refs: $1 recognizer paper/site (idea reference) https://depts.washington.edu/acelab/proj/dollar/index.html · shape correction thesis (chapter 3) https://ii.uni.wroc.pl/media/uploads/2023/11/16/skalski-switaa-uwr-28-inz-68629-225406-224964.pdf · RDP reference https://github.com/mourner/simplify-js/blob/master/simplify.js

### P10-T10 — Corpus generator, negatives, recorder   [tier: MID] [deps: T09]
Allowed paths: `packages/sketch-core/src/testing/**`, `packages/sketch-core/fixtures/**`, `apps/web/src/dev/StrokeRecorder.tsx` (new), `docs/shape-recognition.md` (new, stub).
Steps:
- [ ] 1. `testing/generate.ts`: seeded generators for the 11 classes. Variation: noise σ = 0.01–0.03×diagonal, tilt ±0–15°, aspect 0.6–1.6 (rect/ellipse), start gap 0–15% of L, overshoot 0–8%, random start vertex, CW/CCW, low-frequency hand wobble (sum of 2 sines).
- [ ] 2. Negatives: scribble, letters S/8, heart, spiral, zigzag, wave, blob, hook, open arc.
- [ ] 3. Dev recorder: URL `?record=<label>` captures finished strokes with timestamps and offers a JSON download `{label, points, scale, pointerType}`. HUMAN will record ≥ 20 samples per class on their own device and commit them to `packages/sketch-core/fixtures/human/<label>-*.json`.
- [ ] 4. Test runner `corpus.test.ts` loads synthetic + human fixtures and prints a per-class table.
Verify: corpus test runs; gates are enforced in T12 (print only here).

### P10-T11 — Integrate recognizer   [tier: MID] [deps: T09]
Allowed paths: `apps/web/src/hooks/useWhiteboardTool.ts`, `apps/web/src/components/whiteboard/ToolBar.tsx`, `apps/web/src/components/whiteboard/ShapeSuggestionChip.tsx` (new), `apps/web/src/i18n/locales/id.json` (additive), the file that currently contains the recognizer (from AUDIT).
Steps:
- [ ] 1. Keep the old recognizer reachable only via `VITE_LEGACY_SHAPE=1` (A/B). Default path = `recognizeShape`.
- [ ] 2. Toolbar setting `Auto-shape: Otomatis | Tahan | Mati` (persist in localStorage; i18n keys). Default Otomatis.
- [ ] 3. Behavior: `snap` → do NOT commit the ink; emit the shape creation event(s) instead, with the CURRENT pen color and width (min 2). Keep the original points in memory for 4 s to offer "Kembalikan coretan" (swap shape back to a stroke through normal events). `suggest` → commit ink + show a chip "Jadikan {bentuk}?" for 4 s near the bbox. `keep` → ink only.
- [ ] 4. `Tahan` mode: snap only if the pointer stayed within 2 px for ≥ 450 ms before pointerup (show a ghost preview after the hold).
- [ ] 5. Tests: mock `recognizeShape` outputs → assert emitted events for snap/suggest/keep and for undo-to-ink.
Verify: vitest all pass; manual: draw a wobbly circle (snaps), a heart (stays ink), an almost-square (suggests or snaps), then press undo → original ink returns.

### P10-T12 — Accuracy gate   [tier: HIGH] [deps: T10, T11]
Gates (all must pass, synthetic AND human fixtures): per-class recall (correct kind via snap or suggest) ≥ 0.85; wrong-snap rate over all positives ≤ 0.02; negatives kept as ink ≥ 0.95.
Steps:
- [ ] 1. Add the gate assertions to `corpus.test.ts`.
- [ ] 2. Tune ONLY `constants.ts`; never special-case fixtures. Log each tuning round (before/after table) in `docs/shape-recognition.md` with a confusion matrix.
- [ ] 3. Document remaining known confusions (e.g., rhombus vs tilted square).
Verify: full sketch-core tests pass with gates; web vitest pass.

### P10-T13 — OPTIONAL extra planar shapes   [tier: MID] [deps: T12]
jajargenjang (parallelogram), trapesium, layang-layang (kite), segitiga siku-siku (right triangle with square-corner mark), sudut (angle with arc and degree label). Add `ShapeKind` entries + recognition rules + toolbar entries + optional "Tampilkan ukuran" (side/angle labels in cm using 1 cell = 1 cm). Only after T12 gates pass.

### P10-RV — Phase review   [tier: HIGH]
Follow `ai-plan/REVIEW.md`: run all verify commands, re-run the perf and corpus gates, check no leftover flags, update CODEMAP (rows → LOCKED), add Patterns-to-copy rows, record lessons in KNOWLEDGE.md.
