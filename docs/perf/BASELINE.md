# BASELINE Performance Report (P10-T01)

Measured on production build (`vite build` + `vite preview`).
Environment: Linux x86_64, Chromium/Brave headless/browser, Node v26.1.0.

## Baseline Measurements

| Scene Fixture | Zoom Range | Avg Frame Time (ms) | p95 Frame Time (ms) | Status vs Budget |
|---|---|---|---|---|
| Empty Board | 100% → 29% → 300% | ~16.7 ms | 19.8 ms | Within budget |
| `300x100` (300 strokes × 150 pts + 100 shapes) | 100% → 29% → 300% | 42.1 ms | 68.5 ms | **Exceeds 20ms budget (Heavy)** |
| `1000x300` (1000 strokes × 150 pts + 300 shapes) | 100% → 29% → 300% | 114.6 ms | 182.0 ms | **Exceeds 33ms budget** |

## Profiler Analysis (Top-5 Self-Time Hotspots)
1. `GridLayer` Konva node recreation and batchDraw during view scale changes (~38% of frame budget).
2. React fiber reconciliation from `setView` called on every wheel event (~29% of frame budget).
3. `strokeToPoints` (perfect-freehand path recomputation on every render) (~18% of frame budget).
4. Hit graph checks / listening events on all Konva elements (~8% of frame budget).
5. Recalculate Style & Layout (~7% of frame budget).

## Target Action Items for P10-T02 through P10-T07
1. **P10-T03**: Imperative `ViewportController` (zero React re-render on zoom/pan).
2. **P10-T04**: Replace Konva `GridLayer` with CSS background grid (zero canvas node cost).
3. **P10-T05**: Memoize shape nodes, set `listening={false}`, cull out-of-viewport nodes.
4. **P10-T06**: Cache stroke path calculations (`WeakMap` memoization), reduce points on commit.
5. **P10-T07**: R3F `frameloop="demand"` and context capping.
