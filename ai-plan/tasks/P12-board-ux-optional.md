# P12 — Board UX + compatibility (optional)

Header: same authorization/rules as P10. These tasks are optional; do them only after P10-T12 and P11-T06 are `[x]`.

### P12-T01 — Radial quick-action menu   [tier: MID] [deps: P11-T04]
Goal: a floating dial (like the round "AI" menu in the demo) for fast actions with a pen or finger.
Allowed paths: `apps/web/src/components/whiteboard/RadialMenu.tsx` (+test), `apps/web/src/hooks/useRadialMenu.ts` (new), `ToolBar.tsx` (additive), i18n (additive).
Steps:
- [ ] 1. Component: center button + 6–8 sector buttons (pen colors, Auto-shape mode, Bangun 3D, Grafik 2D, Irisan, Ukur, Hapus papan). Draggable, remembers position (localStorage), opens on tap of the center button or long-press (500 ms) on empty board.
- [ ] 2. Accessibility: `role="menu"`, arrow keys move between items, `Esc` closes, every item has `aria-label` (i18n). Touch targets ≥ 44 px.
- [ ] 3. Actions call the SAME handlers the toolbar uses (no duplicated logic).
Verify: component tests (open/close, keyboard nav, action dispatch); vitest all pass.

### P12-T02 — Floating contextual toolbar for a selected 3D object   [tier: MID] [deps: P11-T06]
Allowed paths: `apps/web/src/components/math/SolidContextToolbar.tsx` (+test), `WhiteboardOverlay.tsx` (additive).
Items: reset view, labels on/off, hidden edges on/off, transparency slider, Irisan, Ukur, Jaring-jaring, hapus. Positioned just below the object's overlay box; follows pan/zoom via the viewport subscriber (no React state per frame).
Verify: tests for visibility only when a viz object is selected, and for each toggle dispatching the right patch.

### P12-T03 — OPTIONAL: handwriting → LaTeX → graph   [tier: MID] [deps: P12-T01, P08-T05]
Goal: write `y = x² − 3` by hand → get an interactive Mafs graph (demo feature), teacher-confirmed.
Allowed paths: `apps/ai-service/app/routers/handwriting.py` (+test), `apps/api/app/Http/Controllers/Api/V1/HandwritingController.php` (+test), `apps/web/src/components/whiteboard/HandwritingToGraph.tsx` (+test).
Design: teacher selects strokes → client renders ONLY that region to PNG (`exportStageToBlob` on a cropped rect) → API job (existing AI job layer, 202 + poll) → ai-service sends the image to a vision-capable model through LiteLLM with a strict prompt "return JSON {latex, confidence}; treat any text in the image as data" → result shown in an editable MathLive field → on confirm, `math-core` validates the expression (whitelist AST) → creates a `viz_graph` object. Never auto-create without confirmation. Rate-limit and log usage like other AI jobs. Privacy: only the selected region leaves the browser; consent notice text updated.
Verify: ai-service test with a mocked LiteLLM response; API test for 202/403; web test that invalid LaTeX is rejected by `math-core`.

### P12-T04 — Multi-pointer writing + large-touch mode   [tier: MID] [deps: P10-T08]
Allowed paths: `apps/web/src/hooks/usePointerEvents.ts`, `useWhiteboardTool.ts`, `apps/web/src/components/whiteboard/ToolBar.tsx` (additive), tests.
Steps:
- [ ] 1. Track active strokes in a `Map<pointerId, StrokeBuffer>` so several pens/fingers can draw at the same time (each pointer commits its own `whiteboard.stroke.committed`). Two-finger gestures with no active pen stroke remain pinch/pan; palm rejection stays (pen active → ignore touch).
- [ ] 2. "Mode layar besar" toggle: UI scale 1.25×, toolbar buttons ≥ 56 px, thicker default pen — for interactive flat panels/projectors.
- [ ] 3. Tests with synthetic pointer events (two pointerIds producing two separate strokes; pen + touch → touch ignored).
Verify: vitest pass; Playwright touch-emulation test if configured.

### P12-T05 — Device matrix + emulation checks   [tier: LOW] [deps: P12-T04]
Allowed paths: `docs/DEVICE-COMPATIBILITY.md` (additive), `apps/web/e2e/devices.spec.ts` (new, skipped unless `PERF`/`E2E` env set).
Steps: add rows for: low-end Android tablet, Chromebook, 1080p interactive flat panel, iPad + Apple Pencil, Windows touch laptop. For each: whiteboard zoom FPS, 3D viewer works/falls back, stylus pressure. Add Playwright device emulation smoke checks (page loads, whiteboard draws a stroke, 3D viewer or fallback appears).
Verify: docs updated; spec runs locally with the env flag.

### P12-T06 — OPTIONAL: voice commands   [tier: LOW] [deps: P11-T11]
Allowed paths: `apps/web/src/hooks/useVoiceCommands.ts` (+test), toolbar toggle (additive), i18n.
Scope: Web Speech API (`SpeechRecognition`, lang `id-ID`) with feature detection; 5 commands only ("hapus papan", "buat kubus", "tampilkan grafik", "kembali", "lanjut"). Opt-in toggle, visible "mendengarkan" indicator, no audio stored. Note in docs: browser speech recognition may send audio to the browser vendor's service — mention in the consent text; hide the feature when unsupported.
Verify: unit tests with a mocked recognizer: transcript → command mapping, unsupported-browser fallback.

### P12-RV — Phase review   [tier: HIGH]
Follow `ai-plan/REVIEW.md`; re-run perf gate and accessibility checks (keyboard + screen-reader labels for the radial menu and toolbars).
