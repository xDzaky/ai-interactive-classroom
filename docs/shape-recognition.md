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
