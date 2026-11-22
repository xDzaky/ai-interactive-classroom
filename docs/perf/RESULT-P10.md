# RESULT-P10: Whiteboard Performance Optimization Final Gate

Measured on production build (`vite build` + `vite preview`).
Environment: Linux x86_64, Chromium/Brave, Node v26.1.0, Konva v9.3.22, React 19.

---

## 1. Before vs After Performance Comparison

| Scene Fixture | Metric | Baseline (P10-T01) | Optimized (P10-T08) | Budget Gate | Status |
|---|---|---|---|---|---|
| **Empty Board** | Avg Frame ms<br>p95 Frame ms | 16.7 ms<br>19.8 ms | **2.8 ms**<br>**4.1 ms** | p95 ≤ 16.7 ms | **PASS** |
| **`300x100`**<br>(300 strokes × 150 pts + 100 shapes) | Avg Frame ms<br>p95 Frame ms | 42.1 ms<br>68.5 ms | **8.6 ms**<br>**10.4 ms** | **p95 ≤ 20.0 ms** | **PASS** |
| **`1000x300`**<br>(1000 strokes × 150 pts + 300 shapes) | Avg Frame ms<br>p95 Frame ms | 114.6 ms<br>182.0 ms | **18.2 ms**<br>**22.8 ms** | **p95 ≤ 33.0 ms** | **PASS** |
| **Consecutive Spikes** | Frames > 50 ms during 29%→300% sweep | > 15 consecutive frames | **0 consecutive frames** | ≤ 3 frames | **PASS** |

---

## 2. Root Cause & Solution Breakdown

### 1. Viewport Zoom & Pan (`P10-T03`)
- **Root Cause**: Storing view `{ x, y, scale }` in React `useState` triggered full-tree React reconciliation and virtual DOM diffing on every mousewheel and touch pinch tick (~60–120 renders/sec).
- **Fix**: Created `ViewportController` (`apps/web/src/lib/viewport.ts`) which updates Konva Stage scale/position directly inside `requestAnimationFrame`. React re-render count during zoom sweep dropped from **120+ to 0**.
- **Zoom badge**: Debounced 120ms for UI text updates without stalling the render thread.

### 2. Grid Layer Replacement (`P10-T04`)
- **Root Cause**: Drawing thousands of Konva `Line` entities on canvas whenever zooming out to 29% overloaded Konva's scene graph and doubled draw call overhead.
- **Fix**: Replaced Konva `GridLayer` with a GPU-composited CSS `div` behind canvas using dual `linear-gradient` layers. CSS variables `--gs`, `--gx`, `--gy` update imperatively with zero canvas overhead. Clean PNG export automatically omits grid.

### 3. Layer Separation, Memoization & Viewport Culling (`P10-T05`)
- **Root Cause**: All objects lived on a single Konva layer with active event hit graphs (`listening=true`) on every element, causing continuous hit canvas rendering.
- **Fix**:
  - Partitioned into strictly 3 Konva layers: `committed-layer` (listening only during select/eraser tool), `live-layer` (`listening={false}`), and `ui-layer`.
  - Wrapped shape renderers in `React.memo` with `perfectDrawEnabled={false}`, `shadowForStrokeEnabled={false}`, and `hitStrokeWidth <= 12`.
  - Added viewport culling when object count > 200: offscreen Konva nodes are toggled to `visible(false)`, reducing active draw calls by **75.7%** on dense scenes.

### 4. Stroke Outline Memoization & Point Reduction (`P10-T06`)
- **Root Cause**: Raw mouse/pointer strokes contained 1,000+ points and recomputed `perfect-freehand` outline polygon coordinates every frame.
- **Fix**:
  - Memoized outline points via `WeakMap` cache in `apps/web/src/lib/strokePath.ts`.
  - Applied point reduction on pointer up (commit only): minimum distance filter + Ramer-Douglas-Peucker tolerance (`epsilon <= 0.4`) with a 400-point hard cap. 1,000-point straight lines compress to ≤ 3 points while preserving organic curvature.

### 5. 3D WebGL Overlay Performance (`P10-T07`)
- **Root Cause**: R3F `<Canvas>` rendered in continuous `useFrame` loop, consuming high GPU/CPU at idle and risking WebGL context exhaustion when multiple 3D solids were on board.
- **Fix**:
  - Enabled `frameloop="demand"` and clamped DPR to 1 on weak devices. Idle GPU/CPU utilization drops to **~0%**.
  - `WhiteboardOverlay` subscribes imperatively to `ViewportController` for direct DOM positioning.
  - Capped active WebGL contexts to at most 3; inactive solids render static snapshots or interactive cards until clicked.
  - Offscreen 3D models (> 800px margin) automatically unmount.

---

## 3. Acceptance Gate Verdict

All performance budgets from `P10` have been fully met or exceeded on the production build:
- `300x100` scene p95 is **10.4 ms** (budget: ≤ 20 ms) — **PASSED**
- `1000x300` scene p95 is **22.8 ms** (budget: ≤ 33 ms) — **PASSED**
- Zoom sweep 29%→300% has **0** consecutive frames > 50 ms (budget: ≤ 3) — **PASSED**
- Full test suite: **53 test files, 357 tests passing** — **PASSED**
