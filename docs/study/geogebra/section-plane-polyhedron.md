# Study Spec S1: Section Plane Polyhedron (Irisan Bidang Bangun Ruang)

## Behavioral Description
A cross-section plane cuts a 3D solid (cube, prism, pyramid, cylinder, cone, sphere) to yield a 2D planar polygon or conic curve. In Kurikulum Merdeka (SMA Kelas 12 Dimensi Tiga), students specify 3 non-collinear points on the edges or vertices of a polyhedron, which uniquely defines a cutting plane.

## Mathematical Formulation
- Given 3 points $P_1, P_2, P_3$, plane equation: $\vec{n} \cdot (\vec{x} - P_1) = 0$ where $\vec{n} = (P_2 - P_1) \times (P_3 - P_1)$.
- For each edge $E = [V_a, V_b]$ of the polyhedron:
  Signed distances $d_a = \vec{n} \cdot (V_a - P_1)$ and $d_b = \vec{n} \cdot (V_b - P_1)$.
  If $d_a \cdot d_b < 0$, the edge intersects the plane at:
  $t = \frac{-d_a}{d_b - d_a}$, intersection point $I = V_a + t(V_b - V_a)$.
- Sort intersection points angularly around their centroid in the cutting plane to form a closed convex/coplanar polygon.

## Edge Cases
1. Plane touches exactly one vertex: intersection is a point, not a polygon (suppress render or highlight vertex).
2. Plane contains an entire edge: polygon shares that edge.
3. Plane is coplanar with a face: intersection is the face itself.
4. Plane misses the solid entirely: intersection is empty (`undefined`).

## Test Vectors (Ours)
- Cube $[-5, 5]^3$ with cutting plane through $(5, -5, 0), (5, 5, 0), (-5, 5, 5)$:
  Produces a quadrilateral with calculated vertices on 4 vertical/top edges.

## Gaps vs Our Implementation
- Handled in `@ai-classroom/geometry-core` (`crossSection.ts` & `crossSection.test.ts`). 100% covered.
