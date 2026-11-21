# CONTRACTS-REFS-ADDENDUM.md — merge into `ai-plan/CONTRACTS.md` (section A) and `ai-plan/REFERENCES.md` (section B)

Rule: everything here is ADDITIVE. Check the real names in `packages/whiteboard-core/src/index.ts` and `ai-plan/AUDIT-P11.md` first; if an existing field has the same meaning under a different name, KEEP THE EXISTING NAME and adapt this addendum.

## A. Contracts

### A1. New optional fields on the existing `viz_solid` BoardObject
```ts
interface VizSolidExt {
  display?: {
    labels: boolean;                 // show A,B,C… (default true)
    hiddenEdges: boolean;            // dashed hidden edges (default true)
    faces: boolean;                  // translucent faces (default true)
    faceOpacity: number;             // 0..1 (default 0.08)
    projection: 'perspective' | 'orthographic';
  };
  section?:
    | { mode: 'vertices'; vertexIds: [string, string, string] }   // labels such as 'A','C','G'
    | { mode: 'parallel'; axis: 'x' | 'y' | 'z'; offset: number }
    | null;
  cutAway?: boolean;                 // hide one side of the section plane
  unfoldT?: number;                  // 0 = solid … 1 = flat net
  measures?: Array<{ id: string; kind: 'distance' | 'angle'; vertexIds: string[] }>;
}
```
Defaults apply when a field is missing, so old snapshots/replays keep working. Changes travel through the EXISTING viz patch event (do not add a new event type unless CONTRACTS lacks one; then propose it in DECISIONS first). Never emit per-frame events for camera moves.

### A2. Sketch/shape recognizer (package `@ai-classroom/sketch-core`) — see P10-T09 for the exact signatures
- `recognizeShape(points, opts) → { decision: 'snap'|'suggest'|'keep', best, candidates, reason }`.
- Decision thresholds: snap ≥ 0.80 with margin ≥ 0.10; suggest ≥ 0.55; otherwise keep ink.
- Shape objects created from a snap use the current pen color/width and emit the SAME board events the manual shape tools emit.

### A3. Geometry conventions
- Math coordinates Z-up; Three.js conversion `(x,y,z) → (x, z, −y)` in `apps/web/src/lib/coords.ts` only.
- 1 grid cell = 20 world units = 1 cm. Angles in degrees at the UI boundary, radians internally.
- Indonesian vertex labels: cube/cuboid `ABCD.EFGH`, pyramid `T.ABCD`, triangular prism `ABC.DEF`; section points P,Q,R,S,T,U.

### A4. Shared test vectors (geometry-core ⇄ ai-service contract tests)
Unit cube `[0,1]³`: plane z=0.5 → 4 pts, area 1 · plane through (1,0,0),(0,1,0),(0,0,1) → 3 pts, area √3/2 · plane x+y+z=1.5 → 6 pts, area 3√3/4 · plane x=y → 4 pts, area √2 · dihedral(x+y+z=1, z=0) = 54.7356103° · angle(AC,AG) = 35.2643897° · dist(G, plane x+y+z=1) = 2/√3.
Surface areas / volumes: cube 5 → 150 / 125 · cuboid 3×4×5 → 94 / 60 · prism a3 b4 H10 → 132 / 60 · pyramid base 6 h 4 → 96 / 48 · cylinder r7 h10 → 238π / 490π · cone r3 h4 → 24π / 12π · sphere r3 → 36π / 36π.
Store them as `packages/geometry-core/fixtures/solids-p11.json` (new) so Python and TypeScript tests read the same file.

## B. References (use these; do not search for docs)

**Performance (Konva / React)**
- Konva all performance tips: https://konvajs.org/docs/performance/All_Performance_Tips.html
- Konva canvas performance guide: https://konvajs.org/docs/posts/canvas-performance.html
- Konva listening(false): https://konvajs.org/docs/performance/Listening_False.html
- react-konva free drawing (pattern): https://konvajs.org/docs/react/Free_Drawing.html
- react-konva release notes (React version coupling): https://raw.githubusercontent.com/konvajs/react-konva/HEAD/RELEASE_NOTES.md
- Konva FAQ (thousands of shapes, layers, caching): https://konvajs.org/docs/faq.html

**Shape recognition (ideas / reference implementations — read, do not copy blindly)**
- $1 unistroke recognizer (algorithm + paper): https://depts.washington.edu/acelab/proj/dollar/index.html
- OneDollar.js (npm, reference only): https://www.npmjs.com/package/OneDollar.js
- Shape-Detector whiteboard example (reference only): https://www.github.com/SDC-SVIT/Shape-Detector
- shape-detector (npm, evaluate before use; not on the allowlist): https://www.npmjs.org/package/shape-detector
- Whiteboard shape-correction thesis (chapter 3): https://ii.uni.wroc.pl/media/uploads/2023/11/16/skalski-switaa-uwr-28-inz-68629-225406-224964.pdf
- Douglas–Peucker reference (simplify.js, BSD): https://github.com/mourner/simplify-js/blob/master/simplify.js · demo https://mourner.github.io/simplify-js

**3D / geometry (canonical docs, stable URLs; not individually re-verified)**
- Three.js docs: https://threejs.org/docs/ (EdgesGeometry, Plane, Raycaster, material `depthFunc`, `clippingPlanes`)
- Three.js clipping example: https://threejs.org/examples/#webgl_clipping
- React Three Fiber: https://r3f.docs.pmnd.rs (see "Scaling performance" for on-demand rendering `frameloop="demand"`)
- drei (Html, OrbitControls, Edges, Line): https://drei.docs.pmnd.rs
- Mafs (2D graphs, already used): https://mafs.dev
- MathLive docs (getValue formats): https://cortexjs.io/mathlive/

**Product/UX references**
- OpenMAIC (AI classroom with whiteboard agents; reference only, check its license before reusing anything): https://github.com/ade-karya/OpenMAIC
- iFLYTEK "Tongchuang AI Blackboard" description came from an AI-written summary supplied by the human; only the screenshots (wireframe cube with vertex handles, blue section planes, angle labels, radial "AI" menu, floating toolbar) are treated as ground truth for the feature list.

**Datasets from the human's list (NOT verified by the planner; none are needed for the rule-based plan)**
- SolidGeo (3,113 solid-geometry problems) https://github.com/HarryYancy/SolidGeo — useful later to test the AI tutor/solver on bangun-ruang questions (P08 area). Check its license first.
- 3d-shapes, SyntheticShapesData, ModelNet, ShapeNet, ABC: image/point-cloud/CAD datasets for ML classification of rendered solids — not suitable for recognizing hand-drawn sketches; skip.

**Forbidden / careful**
- Do not embed GeoGebra, PhET, or tldraw SDK (licensing); borrowing UX ideas is fine.
- No new dependency without a DECISIONS entry. Planned in-house code (RDP, ellipse fit, polyhedron math) instead of libraries on purpose: small, typed, testable.
