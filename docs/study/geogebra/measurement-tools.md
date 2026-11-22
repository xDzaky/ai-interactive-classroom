# Study Spec S5: Measurement Tools & Indonesian Curriculum Formulas (Alat Ukur)

## Behavioral Description
Measurement tools calculate distances, angles, perimeter, and area in real time. For Indonesian SMP & SMA mathematics (Kurikulum Merdeka), standard conventions are applied:
- Segment length: $|AB| = \sqrt{(x_B - x_A)^2 + (y_B - y_A)^2 + (z_B - z_A)^2}$.
- Vertex angle: $\cos \theta = \frac{\vec{u} \cdot \vec{v}}{|\vec{u}| |\vec{v}|}$, reported in degrees ($0^\circ \le \theta \le 180^\circ$).
- Cube space diagonal: $d = s\sqrt{3}$; face diagonal: $d_f = s\sqrt{2}$.
- Skew lines distance: Shortest distance between non-parallel, non-intersecting 3D lines $L_1, L_2$:
  $d = \frac{|(\vec{p}_2 - \vec{p}_1) \cdot (\vec{d}_1 \times \vec{d}_2)|}{|\vec{d}_1 \times \vec{d}_2|}$.

## Edge Cases
1. Collinear points forming zero or $180^\circ$ angle.
2. Parallel lines in 3D: $\vec{d}_1 \times \vec{d}_2 = \vec{0}$, distance reduces to point-to-line distance.
3. Floating point rounding: display formats to 2 decimal places with LaTeX radical symbol option where applicable ($s\sqrt{2}$).

## Test Vectors (Ours)
- Cube of side 6: face diagonal $= 6\sqrt{2} \approx 8.49$, space diagonal $= 6\sqrt{3} \approx 10.39$.
- Angle between $(1, 0, 0)$ and $(0, 1, 0)$ is $90.00^\circ$.

## Gaps vs Our Implementation
- Handled in `@ai-classroom/geometry-core` (`measure.ts` & `measure.test.ts`) and `@ai-classroom/construction-core`. 100% covered.
