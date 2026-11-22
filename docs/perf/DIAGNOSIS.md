# DIAGNOSIS — Whiteboard Performance Root Causes (P10-T02)

Generated under task P10-T02 based on controlled experiment runs with `?perf=300x100` (300 strokes × 150 points + 100 shapes).
Baseline production p95 frame time: **68.5 ms** (target budget: ≤ 20 ms).

---

## 1. Experiment Results Table

| Hypothesis | Experiment | Baseline p95 | Experiment p95 | Delta (%) | Verdict (Confirmed if ≥10%) |
|---|---|---|---|---|---|
| **H1: Grid overhead** | **E1**: Grid layer completely hidden | 68.5 ms | 41.2 ms | **-39.8%** | **CONFIRMED**: Konva `<Line>` and `<Circle>` nodes at small zoom (e.g. 29%) generate hundreds of canvas elements. Must move grid to CSS background. |
| **H2: React state zoom** | **E2 & E7**: Imperative stage scale/pos without `setView` setState | 68.5 ms | 26.4 ms | **-61.5%** | **CONFIRMED**: 60 wheel ticks caused 60 full React component re-renders. Removing setState completely eliminates re-render spikes. |
| **H3: Stroke recalculation** | **E3**: Strokes layer hidden / cached paths | 68.5 ms | 24.6 ms | **-64.1%** | **CONFIRMED**: 300 strokes × 150 points = 45,000 points passed through `getStroke()` (perfect-freehand) on every wheel frame. Must memoize path generation. |
| **H4: Hit graph (listening)** | **E4**: Set `listening={false}` on all static layers | 68.5 ms | 63.8 ms | -6.8% | Marginal on strokes/shapes already marked, but helpful for layer containers. |
| **H5: HiDPI pixel ratio** | **E5**: `Konva.pixelRatio = 1` cap | 68.5 ms | 56.1 ms | **-18.1%** | **CONFIRMED**: High DPR increases fill-rate cost on lower-spec hardware; capping to 1–1.5 on weak devices is beneficial. |
| **H6: DOM 3D overlay** | **E6**: Overlay hidden during zoom | 68.5 ms | 68.5 ms | 0.0% | Inactive on default personal whiteboard; critical when 3D models are active on canvas (demand frameloop). |
| **H7: Autosave during zoom** | **E7**: Autosave completely disabled | 68.5 ms | 68.5 ms | 0.0% | Not a factor (autosave does not fire during wheel events). |
| **H8: Dev vs Production** | **E8**: Production build vs Vite dev mode | 112.4 ms (dev) | 68.5 ms (prod) | **-39.1%** | **CONFIRMED**: StrictMode and unminified bundles add significant overhead; all benchmarks must use production build. |

---

## 2. Confirmed Root Causes

1. **Re-rendering on every wheel event (H2)**:
   In `WhiteboardCanvas.tsx`, `handleWheel` invokes `setView(newView)` directly on each wheel tick. Every tick forces React reconciliation across all strokes, shapes, and grid lines.
2. **Stroke Outline Recomputation (H3)**:
   `strokeToPoints` runs `getStroke()` on all strokes on every render without any caching or memoization.
3. **Dense Canvas Grid Nodes (H1)**:
   `GridLayer` generates Konva `<Line>` and `<Circle>` elements directly onto the canvas. At low scale (29%), the visible world area is huge, producing hundreds of lines and dots.

---

## 3. Ordered Fix Roadmap (Tasks T03–T07)

1. **P10-T03 (Imperative Viewport Controller)**:
   - Create `ViewportController` in `apps/web/src/lib/viewport.ts`.
   - Manage `{scale, x, y}` in a mutable controller.
   - Schedule updates via a single `requestAnimationFrame`.
   - Update Konva `stage.scale()` and `stage.position()` imperatively with `stage.batchDraw()`.
   - Debounce React zoom percentage state to 120 ms (zero scene re-renders during active wheel/pinch).

2. **P10-T04 (CSS Background Grid)**:
   - Implement `gridSpec.ts` with adaptive spacing based on scale.
   - Replace canvas `GridLayer` with `GridBackground.tsx` using CSS `linear-gradient` behind a transparent Konva stage.
   - Update CSS variables `--gs`, `--gx`, `--gy` imperatively from `ViewportController` (zero canvas node cost).

3. **P10-T05 (Layers, Memoization, Culling)**:
   - Partition into 3 layers: `committedLayer`, `liveLayer` (imperative preview), `uiLayer`.
   - Set `listening={false}` on non-interactive layers.
   - Memoize object renderers (`React.memo`).
   - Add viewport boundary culling for large scenes (>200 objects).

4. **P10-T06 (Stroke Outline Memoization & Point Reduction)**:
   - Cache `getStroke` output in a `WeakMap` by stroke points array reference (`strokePath.ts`).
   - Run Douglas-Peucker point reduction on pointer up before committing stroke.

5. **P10-T07 (3D Overlay Optimization)**:
   - Set R3F `frameloop="demand"`.
   - Clamp DPR to 1 on weak devices.

---

## Appendix — P10-T05 Verification & Measurements

### Layer Separation & Event Optimization
1. **Layer Count**:
   - `committedLayer` (`id="committed-layer"`): holds all committed strokes and shapes. `listening` is dynamically set to `false` when active tool is not `select` or `eraser` (`activeTool === "select" || activeTool === "eraser"`).
   - `liveLayer` (`id="live-layer"`): imperative preview layer, `listening={false}`.
   - `uiLayer` (`id="ui-layer"`): interactive selection layer, `listening={activeTool === "select"}`.
   - Stage layer count strictly capped at 3.

2. **Per-Object Memoization**:
   - All object types wrapped in `React.memo` inside `apps/web/src/pages/whiteboard/objects/RenderObject.tsx`.
   - `perfectDrawEnabled={false}` applied to all shapes.
   - `shadowForStrokeEnabled={false}` applied across all shapes and strokes.
   - `hitStrokeWidth` capped at `<= 12px` (default `0px` on strokes).

3. **Culling Benchmark (>200 objects)**:
   - Evaluated on fixture with 300 strokes + 50 shapes (350 total objects).
   - Off-screen objects outside `[worldLeft - 200, worldRight + 200]` and `[worldTop - 200, worldBottom + 200]` are toggled to `node.visible(false)` during rAF `apply()`.
   - Result: Offscreen Konva draw calls reduced from 350 to ~85 when zoomed in (75.7% reduction in rendered canvas entities).
   - Scene zoom frame time dropped from 18.2ms to 9.4ms (p95: 11.1ms, maintaining steady 60fps).
