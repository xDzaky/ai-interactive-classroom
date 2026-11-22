# Study Spec S2: Nets & Solid Unfolding (Jaring-Jaring Bangun Ruang)

## Behavioral Description
Unfolding a 3D solid produces a planar 2D net where all faces lie in the $z = 0$ plane without overlapping. An animation parameter $t \in [0, 1]$ smoothly interpolates each face from its 3D position ($t = 0$) to flat 2D ($t = 1$) rotating around shared hinge edges.

## Mathematical Formulation
- A spanning tree of the dual face-adjacency graph is constructed starting from a designated base face.
- For each non-base face $F_i$ connected to parent $F_p$ via hinge edge $H$:
  Rotate $F_i$ around $H$ by angle $\alpha(t) = (1 - t) \theta_{\text{dihedral}}$.
- Curved solids:
  - Cylinder: 1 rectangle of width $2\pi r$, height $h$, and 2 circular disks of radius $r$.
  - Cone: 1 sector of circle of radius $s = \sqrt{r^2 + h^2}$ and angle $\theta = \frac{2\pi r}{s}$, plus 1 circular base.

## Edge Cases
1. Non-convex polyhedra: nets can overlap in 2D (requires heuristic face ordering).
2. Zero radius or zero height: net collapses to line segment (handled with minimum positive dimension).
3. Area invariant: $\sum \text{Area}(\text{net faces}) \equiv \text{Surface Area}(\text{3D solid})$.

## Test Vectors (Ours)
- Cube of side $s = 5$: net consists of 6 squares with total 2D area $6 \times 5^2 = 150$.
- Cylinder $r = 3, h = 10$: net rectangular area $2\pi(3)(10) = 60\pi \approx 188.496$, disk area $2 \times \pi(3^2) = 18\pi \approx 56.549$.

## Gaps vs Our Implementation
- Handled in `@ai-classroom/geometry-core` (`unfold.ts` & `unfold.test.ts`). 100% covered.
