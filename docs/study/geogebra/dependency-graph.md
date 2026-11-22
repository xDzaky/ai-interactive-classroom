# Study Spec S4: Dependency Graph & Topological Recompute (Graf Ketergantungan)

## Behavioral Description
A dynamic geometry engine evaluates objects in directed acyclic graph (DAG) topological order. When a free object (such as a point) is dragged, only that object and its transitive descendants are marked dirty and recomputed. Cycles are prohibited and rejected before mutating the state.

## Algorithmic Invariants
- Each object declares its parent dependencies: $P(O_i)$.
- Cycle detection: $O_{\text{target}}$ cannot depend on $O_{\text{dep}}$ if $O_{\text{target}}$ is an ancestor of $O_{\text{dep}}$.
- Topological sorting: Kahn's in-degree queue or post-order depth-first traversal.
- Undefined propagation: If any parent $P \in P(O_i)$ is `undefined` (e.g. parallel lines with no intersection), $O_i$ automatically evaluates to `undefined` without throwing exceptions or generating `NaN`.

## Edge Cases
1. Multiple intersections: Line-circle and circle-circle intersections have 2 solutions; indexed deterministically (index 0 = lowest $x$ or $y$).
2. Self-referential loop: Point defined as midpoint of itself and another point throws cycle error.
3. Rapid continuous drag: 1000 dependent objects must recompute within one frame (< 16 ms) to sustain 60 FPS.

## Test Vectors (Ours)
- Midpoint $M$ of $A(0,0)$ and $B(10,10)$ is $(5,5)$. When $A$ moves to $(4,8)$, $M$ immediately updates to $(7,9)$.
- 1000 chained midpoints benchmarked in `@ai-classroom/construction-core` at < 5 ms.

## Gaps vs Our Implementation
- Handled in `@ai-classroom/construction-core` (`dag.ts` & `engine.ts`). 100% covered.
