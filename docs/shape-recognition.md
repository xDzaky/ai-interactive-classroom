# Shape Recognition v2 (`@ai-classroom/sketch-core`)

## Overview
`@ai-classroom/sketch-core` provides high-precision geometric shape recognition with confidence scoring and explicit rejection capability. Rather than forcing every stroke into an arbitrary shape ("guess a shape"), it fits candidate mathematical models, computes normalized radial/boundary errors, and rejects ambiguous strokes as raw ink (`decision: 'keep'`).

## Architecture & Algorithm

1. **Input Rejection**:
   - Rejects strokes with total path length $L < 24\text{px} / \text{scale}$ or $< 8$ raw points.
2. **Resampling**:
   - Drops points closer than $1\text{px} / \text{scale}$.
   - Resamples along arc length to exactly $N = 64$ equidistant points.
3. **Closure Test**:
   - $\text{gap} = \|p_0 - p_N\| / L$.
   - If $\text{gap} \le 0.20 \implies$ **Closed**, else **Open**.
4. **Open Stroke (Line)**:
   - Line candidate if max perpendicular deviation / chord $\le 0.05$ and chord/$L \ge 0.90$.
   - Snaps to exact horizontal/vertical when within $5^\circ$.
5. **Closed Stroke (Polygons & Conics)**:
   - **PCA Ellipse/Circle**: Centroid + covariance principal axes. Axis ratio $\ge 0.88 \implies$ `circle`, else `ellipse`.
   - **Multi-Epsilon Douglas-Peucker**: Tests $\varepsilon \in \{0.02, 0.03, 0.05, 0.07, 0.10\} \times \text{bboxDiagonal}$. Merges corners closer than $0.06 \cdot L$ and drops corners with interior angle $> 165^\circ$. Refines vertices via line intersection.
   - Classification: $k=3 \implies$ `triangle` / `right_triangle`, $k=4 \implies$ `square` / `rect` / `rhombus`, $k=5 \implies$ `pentagon`, $k=6 \implies$ `hexagon`, $k=10 \implies$ `star`.
   - Self-intersecting check drops non-star candidates.
6. **Decision**:
   - `best.confidence >= 0.80 && margin >= 0.10` $\implies$ `snap`
   - `best.confidence >= 0.55` $\implies$ `suggest`
   - Otherwise $\implies$ `keep` (remains as ink)

## Corpus Evaluation & Dev Recorder
- Synthetic generator: `packages/sketch-core/src/testing/generate.ts`
- Corpus runner: `packages/sketch-core/src/testing/corpus.test.ts`
- Dev recorder: Accessible via `?record=<label>` in whiteboard URL. Captures human stroke samples for calibration.

---

## P10-T12 Tuning Rounds & Benchmark Results

### 1. Parameter Tuning History (`constants.ts`)

| Parameter | Baseline (Round 1) | Tuned (Round 2) | Tuned (Final Round 3) | Rationale |
|---|---|---|---|---|
| `LINE_PERP_DEV_RATIO` | 0.05 | 0.08 | 0.15 | Hand-drawn lines with wobble have deviation up to 10-14% of chord length. |
| `LINE_CHORD_RATIO` | 0.90 | 0.88 | 0.80 | Tolerates start/end hook and slight hand arcs without rejecting true lines. |
| `ELLIPSE_RMS_DIVISOR` | 0.12 | 0.22 | 0.22 | Normalizes radial variance for noisy hand-drawn ellipses so confidence reaches suggest/snap. |
| `FIT_ERROR_DIVISOR` | 0.06 | 0.08 | 0.10 | Improves polygon base confidence for higher-vertex shapes (pentagon, hexagon). |
| `QUAD_SIDE_EQUAL_RATIO` | 0.15 | 0.22 | 0.22 | Allows natural human side length variation in squares and rhombuses. |
| `POLYGON_REGULARITY_CV` | 0.25 | 0.30 | 0.30 | Prevents dropping valid hand-drawn pentagons/hexagons due to uneven side lengths. |

### 2. Accuracy Benchmark Matrix

```
===== SYNTHETIC SHAPE RECOGNITION BENCHMARK =====
| Class          | Correct / Total | Accuracy | Snap | Suggest | Keep |
|----------------|-----------------|----------|------|---------|------|
| line           | 14/15           | 93.3%    | 13   | 1       | 1    |
| circle         | 15/15           | 100.0%   | 15   | 0       | 0    |
| ellipse        | 15/15           | 100.0%   | 0    | 15      | 0    |
| triangle       | 13/15           | 86.7%    | 13   | 2       | 0    |
| right_triangle | 14/15           | 93.3%    | 0    | 15      | 0    |
| rect           | 15/15           | 100.0%   | 0    | 15      | 0    |
| square         | 15/15           | 100.0%   | 15   | 0       | 0    |
| rhombus        | 11/15           | 73.3%    | 10   | 5       | 0    |
| pentagon       | 13/15           | 86.7%    | 13   | 2       | 0    |
| hexagon        | 15/15           | 100.0%   | 9    | 6       | 0    |
| star           | 15/15           | 100.0%   | 15   | 0       | 0    |
| **OVERALL**    | 155/165         | **93.9%**|      |         |      |

===== NEGATIVE REJECTION BENCHMARK =====
| Negative Class | Rejected (Keep) | False Positive | Rejection Rate |
|----------------|-----------------|----------------|----------------|
| scribble       | 15/15           | 0              | 100.0%         |
| letter_S       | 15/15           | 0              | 100.0%         |
| letter_8       | 15/15           | 0              | 100.0%         |
| heart          | 15/15           | 0              | 100.0%         |
| spiral         | 15/15           | 0              | 100.0%         |
| zigzag         | 15/15           | 0              | 100.0%         |
| wave           | 15/15           | 0              | 100.0%         |
| blob           | 14/15           | 1 (suggest)    | 93.3%          |
| hook           | 15/15           | 0              | 100.0%         |
| open_arc       | 15/15           | 0              | 100.0%         |
| **TOTAL REJECTION** | 149/150    | 1              | **99.3%**      |
```

### 3. Documented Known Confusions
1. **Rhombus vs Tilted Square**: Geometrically, a square rotated by $45^\circ$ has four equal sides and perpendicular diagonals, which matches the definition of an equilateral quadrilateral (rhombus). If the user draws a diamond with interior angles close to $90^\circ$, it is identified as a square with axis orientation. When angles deviate further, it classifies as a rhombus.
2. **Right Triangle vs Scalene Triangle**: Right triangles are detected by inspecting whether any corner angle is within $10^\circ$ of $90^\circ$. If the angle deviates further due to drawing jitter, it correctly falls back to generic `triangle`.
3. **Hexagon vs Circle**: Regular hexagons with 6 vertices spaced at $60^\circ$ on a circle have low radial RMS deviation ($< 8\%$). If the user draws rapid rounded corners, a `circle` candidate may also be suggested alongside the `hexagon`. Both appear in the candidates list for user choice.
