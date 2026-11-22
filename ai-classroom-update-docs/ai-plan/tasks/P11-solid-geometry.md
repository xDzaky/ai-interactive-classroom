# P11 — Solid geometry / bangun ruang

## Header (read once)
- Same authorization rules as P10 (LOCKED files editable only when listed in `Allowed paths`; tests stay green).
- Target experience (from the demo screenshots): a transparent wireframe solid with **labeled vertex handles**, hidden edges dashed, **tap 3 vertices → a blue cross-section polygon** with angle labels (e.g. "83°"), rotate/zoom freely, floating toolbar under the object, and 2D→3D conversion of a drawn shape.
- Existing code to reuse (verify paths via AUDIT-P11): `packages/geometry-core` (formulas), `apps/web/src/lib/geometry.ts` (`computeGeometry`), `viz_solid` BoardObject + `WhiteboardOverlay`, existing 3D viewer, `packages/sketch-core` (from P10).
- **Coordinate system:** geometry-core uses math coordinates with **Z up** (x right, y depth, z up). The viewer converts to Three.js (Y up) with `(x, y, z) → (x, z, −y)`. One place only: `apps/web/src/lib/coords.ts` (`toThree`, `fromThree`).
- **Indonesian labeling:** kubus/balok `ABCD.EFGH` (alas ABCD, atas EFGH, E above A, F above B, G above C, H above D); limas `T.ABCD`; prisma segitiga `ABC.DEF`. Section points are named P, Q, R, S, T, U.
- **Scale convention:** 1 grid cell = 20 world units = 1 cm (set in P10-T04).
- Never use `eval`/`Function`. Numbers shown to users use `Intl.NumberFormat('id-ID')` (decimal comma).

---

### P11-T01 — Audit existing 3D code   [tier: MID] [deps: P10-T08]
Allowed paths: `ai-plan/AUDIT-P11.md` (new). No code changes.
Steps:
- [x] 1. Find: `grep -rniE "viz_solid|SolidViewer|computeGeometry|OrbitControls" apps/web/src packages --include=*.ts --include=*.tsx --exclude-dir=node_modules -l`
- [x] 2. Write `AUDIT-P11.md`: table of files → role; list the exact `viz_solid` field names (solid type strings, params, view/camera fields), the event(s) used to change them, and how students receive them. List which solids exist today and what the viewer already shows (labels? clip plane? unwrapping?).
Verify: AUDIT-P11.md exists and lists exact field names (copy from types, do not guess).

### P11-T02 — Polyhedron model   [tier: HIGH] [deps: T01]
Allowed paths: `packages/geometry-core/src/polyhedron.ts` (+ `polyhedron.test.ts`) (new), `packages/geometry-core/src/index.ts` (additive export).
API:
```ts
export type Vec3 = [number, number, number];
export type PolyKind = 'cube' | 'cuboid' | 'prism' | 'pyramid';
export interface Polyhedron { kind: PolyKind; labels: string[]; vertices: Vec3[]; faces: number[][]; edges: [number, number][] }
export function buildPolyhedron(kind: PolyKind, p: Record<string, number>): Polyhedron;
```
Exact definitions (faces are CCW seen from OUTSIDE; indices refer to `labels` order):
- **cube/cuboid** (`cube: {side}`, `cuboid: {length, width, height}`; l=length (x), w=width (y), h=height (z); cube l=w=h=side). Labels `A B C D E F G H`; vertices A(0,0,0) B(l,0,0) C(l,w,0) D(0,w,0) E(0,0,h) F(l,0,h) G(l,w,h) H(0,w,h). Faces: bottom `[A,D,C,B]`, top `[E,F,G,H]`, front `[A,B,F,E]`, right `[B,C,G,F]`, back `[C,D,H,G]`, left `[D,A,E,H]`.
- **prism** (right triangular prism `{a, b, height}`, right angle at A): labels `A B C D E F`; A(0,0,0) B(a,0,0) C(0,b,0) D(0,0,H) E(a,0,H) F(0,b,H). Faces: bottom `[A,C,B]`, top `[D,E,F]`, `[A,B,E,D]`, `[A,D,F,C]`, `[B,C,F,E]`.
- **pyramid** (square base `{base, height}`): labels `T A B C D`; A(0,0,0) B(s,0,0) C(s,s,0) D(0,s,0) T(s/2,s/2,h). Faces: base `[A,D,C,B]`, sides `[A,B,T]`, `[B,C,T]`, `[C,D,T]`, `[D,A,T]`.
- `edges` = unique edges derived from faces (sorted pairs).
Steps:
- [x] 1. Implement the builders exactly as above.
- [x] 2. Tests (all kinds): every face normal (cross product of first two edges) points away from the centroid (`dot(n, faceCentroid − polyCentroid) > 0`); every edge belongs to exactly 2 faces; Euler `V − E + F = 2` (cube 8−12+6, prism 6−9+5, pyramid 5−8+5).
- [x] 3. Consistency with existing formulas: sum of face areas equals the existing surface area. Vectors: cube side 5 → 150; cuboid 3×4×5 → 94; prism a3 b4 H10 → 132; pyramid base 6, h 4 → 96. Polyhedron volume via divergence (sum over faces of `dot(v0, cross(v1,v2))/6` over a fan triangulation) equals: 125, 60, 60, 48 respectively.
- [x] 4. OPTIONAL: `regularPrism(n, side, height)` / `regularPyramid(n, side, height)` for n = 5, 6 (same tests).
Verify: `pnpm --filter @ai-classroom/geometry-core exec vitest run` pass (adjust the package name to the real one in package.json).

### P11-T03 — Plane/line math and cross-section   [tier: HIGH] [deps: T02]
Allowed paths: `packages/geometry-core/src/section.ts`, `section.test.ts`, `index.ts` (additive).
Steps:
- [x] 1. Implement planeFrom3Points, intersectSegmentPlane, intersectPolyhedronPlane, pointLineDistance, lineLineDistance, dihedralAngleDeg.
- [x] 2. Order section points cyclically around their centroid via orthonormal basis (uAxis, vAxis).
- [x] 3. Compute area via fan triangulation, perimeter, and interior angles in degrees.
- [x] 4. Unit tests with known mathematical answers (horizontal plane z=1 on cube side 2, 3-vertex plane A-C-H, line-point, skew lines).
Verify: all tests pass.
export interface Plane { n: Vec3; d: number }               // n unit normal, points x satisfy n·x = d
export function planeFromPoints(a: Vec3, b: Vec3, c: Vec3): Plane | null;  // null if collinear
export interface SectionResult { points: Vec3[]; area: number; perimeter: number; kind: 'triangle'|'quadrilateral'|'pentagon'|'hexagon' }
export function sectionConvex(poly: Polyhedron, plane: Plane): SectionResult | null;
export function dihedralAngleDeg(p1: Plane, p2: Plane): number;           // acute, [0,90]
export function angleBetweenLinesDeg(d1: Vec3, d2: Vec3): number;         // acute, [0,90]
export function angleLinePlaneDeg(dir: Vec3, plane: Plane): number;       // [0,90]
export function distancePointPlane(p: Vec3, plane: Plane): number;
export function distancePointLine(p: Vec3, a: Vec3, b: Vec3): number;
export function angleAtVertexDeg(a: Vec3, v: Vec3, b: Vec3): number;      // angle a-v-b, [0,180]
```
`sectionConvex` algorithm: `s_i = n·v_i − d`; for every edge (i,j): if `|s_i| < 1e-9` add `v_i`; if `s_i·s_j < 0` add `v_i + t(v_j − v_i)` with `t = s_i/(s_i − s_j)`; dedupe points within 1e-7; fewer than 3 points → `null` (touching or missing). If the plane coincides with a face (all face vertices on the plane and the section equals that face) return that face's polygon too — keep it simple: allowed to return it. Order points: centroid c, basis `u = normalize(p0 − c)`, `w = n × u`, sort by `atan2((p−c)·w, (p−c)·u)`. Area = shoelace in (u,w) coordinates; perimeter = sum of consecutive distances.
Test vectors (UNIT cube from `buildPolyhedron('cube',{side:1})`, tolerance 1e-9 unless stated):
- plane z = 0.5 → 4 points, area 1, perimeter 4, kind quadrilateral.
- plane through (1,0,0),(0,1,0),(0,0,1) → 3 points (equilateral, side √2), area √3/2 ≈ 0.8660254.
- plane x+y+z = 1.5 → 6 points (regular hexagon, side √2/2), area 3√3/4 ≈ 1.2990381, kind hexagon.
- plane through A(0,0,0), C(1,1,0), G(1,1,1) (x = y) → 4 points, area √2 ≈ 1.4142136 (rectangle 1×√2).
- plane z = 2 (outside) → `null`.
- `dihedralAngleDeg(plane x+y+z=1, plane z=0)` = acos(1/√3) ≈ 54.7356103°.
- `angleBetweenLinesDeg(AC=(1,1,0), AG=(1,1,1))` ≈ 35.2643897°; `angleLinePlaneDeg(AG, z=0)` ≈ 35.2643897°.
- `distancePointPlane(G(1,1,1), x+y+z=1)` = 2/√3 ≈ 1.1547005; `distancePointLine(G, A, B)` = √2 ≈ 1.4142136; `|AG|` = √3.
Steps:
- [ ] 1. Implement + all vectors above as tests.
- [ ] 2. Also a prism and a pyramid test: plane through apex T and diagonal AC of a pyramid (base 6, h 4) → triangle with area ½·|AC|·h = ½·(6√2)·4 ≈ 16.9705627.
Verify: geometry-core tests pass.

### P11-T04 — PolyhedronViewer   [tier: MID] [deps: T02]
Allowed paths: `apps/web/src/components/math/PolyhedronViewer.tsx` (+test), `apps/web/src/lib/coords.ts` (+test).
Props: `{ poly, showLabels, showHidden, faceOpacity, selectedVertexIds, onVertexClick, section?: SectionResult | null, cutAway?: Plane | null, quality: 'low'|'high' }`.
Rendering recipe (this gives the textbook look):
1. Occluder pass (renderOrder 0): the faces as a mesh with `colorWrite=false`, `depthWrite=true`, `polygonOffset` (factor 1, units 1) — invisible but fills the depth buffer.
2. Visible edges (renderOrder 1): `LineSegments` with solid material, normal depth test.
3. Hidden edges (renderOrder 2): same segments with a dashed line material, `depthFunc = THREE.GreaterDepth` (draws only where occluded); call `computeLineDistances()`.
4. Translucent faces (renderOrder 3): opacity `faceOpacity` (default 0.08), `side = DoubleSide`, `depthWrite=false`.
5. Vertices: small spheres + a larger INVISIBLE hit sphere (touch-friendly) → `onVertexClick(label)`; selected = blue. Labels: drei `<Html>` offset outward from the centroid by 8% of the solid size; letters from `poly.labels`.
6. Canvas: `frameloop="demand"`, `dpr` capped (1 on weak devices), OrbitControls with `onChange={invalidate}`. `quality:'low'` → no hit spheres animation, no label fades.
Steps:
- [ ] 1. `coords.ts` + tests: `toThree([x,y,z]) = [x, z, −y]`, `fromThree` inverse; round-trip property test.
- [ ] 2. Component + tests (jsdom: mock R3F/`Canvas` like the existing viewer tests do; test that labels are rendered, that `onVertexClick` fires with the right label, and that `showHidden=false` omits the dashed pass).
- [ ] 3. Manual check (document in PROGRESS-LOG): cube rotates smoothly; hidden edges dashed; labels readable at 100% zoom.
Refs: Three.js docs (EdgesGeometry, depthFunc), drei `Html`, R3F on-demand rendering — see REFERENCES addendum.

### P11-T05 — Section (irisan) tool   [tier: HIGH] [deps: T03, T04]
Allowed paths: `apps/web/src/components/math/SectionTool.tsx` (+test), `PolyhedronViewer.tsx` (additive), `apps/web/src/components/math/SectionInfoCard.tsx` (new).
Behavior:
- Mode A "3 titik": the user taps 3 vertices (selection order shown 1-2-3); collinear → friendly error. Plane from `planeFromPoints`; section from `sectionConvex`.
- Mode B "Sejajar alas": slider `0 < offset < height` (plane `z = offset`).
- Mode C presets for cube/cuboid: "Bidang diagonal" (A,C,G,E).
- Render the section as a filled polygon (blue, ~45% opacity) + outline, with points named P, Q, R, … placed at the intersection points.
- "Potong" (cut-away): hide the part on the positive side using a Three clipping plane. In Three, geometry on the NEGATIVE side of `plane.distanceToPoint` is clipped, so pass `Plane(−n, d)` to hide `n·x > d`; set `localClippingEnabled` on the renderer; verify visually.
- Info card (Indonesian): shape name (segitiga/segiempat/segilima/segienam), area, perimeter, and angle between the section plane and the base (`dihedralAngleDeg` with z=0), formatted `id-ID`. Show the angle as an on-canvas label like "54,7°".
- Persisted state shape (used by T07): `section: { mode:'vertices', vertexIds:[a,b,c] } | { mode:'parallel', axis:'z', offset:number } | null`, `cutAway: boolean`.
Steps:
- [ ] 1. SectionTool logic (pure hook) + tests with the unit-cube vectors (A,C,G → rectangle area √2; B,D,E → equilateral triangle … compute with the same helper and assert 3 points).
- [ ] 2. Rendering + clipping.
- [ ] 3. SectionInfoCard + i18n keys + a11y (`aria-live="polite"` for results).
Verify: vitest pass; manual screenshot checklist in PROGRESS-LOG: cube + 3 vertices → blue triangle; plane x+y+z=1.5 → hexagon; cut-away shows the remaining part.

### P11-T06 — Measure tool   [tier: MID] [deps: T03, T04]
Allowed paths: `apps/web/src/components/math/MeasureTool.tsx` (+test), `packages/geometry-core/src/measure.ts` (+test).
Behavior: pick 2 vertices → segment length label (cm); pick 3 → angle at the middle vertex with an arc and degree label; one-tap shortcuts for cube/cuboid: "Diagonal bidang AC", "Diagonal ruang AG" showing formulas `s√2`, `s√3` (cuboid `√(p²+l²+t²)`).
Test vectors: unit cube `|AC| = √2`, `|AG| = √3`; `angleAtVertexDeg(B, A, D)` = 90; `angleAtVertexDeg(C, A, G)` ≈ 35.2643897.
Steps:
- [ ] 1. `measure.ts` helpers + tests. 2. Tool UI + labels via `Html`. 3. Tests for formula strings in Indonesian.
Verify: vitest pass.

### P11-T07 — Sync viz state   [tier: MID] [deps: T05]
Allowed paths: `packages/whiteboard-core/src/index.ts` and `reducer.ts` (additive), `packages/shared-types` (additive), reducer/overlay tests (additive).
Steps:
- [ ] 1. Read `ai-plan/CONTRACTS.md` for the existing viz event (likely `visualization.parameter.changed`) and the `viz_solid` field names from AUDIT-P11. Extend the object with the OPTIONAL fields in `CONTRACTS-REFS-ADDENDUM.md` (`display`, `section`, `cutAway`, `unfoldT`, `measures`). Do NOT rename existing fields.
- [ ] 2. Reducer: apply patches for the new fields (one-level merge into `display`); unknown/missing fields must not crash old replays/snapshots (default values). Add inverse support so undo/redo works.
- [ ] 3. Camera rotation by the teacher: commit ONLY on pointer release (or throttled ephemeral signal if one already exists); never one event per frame.
- [ ] 4. Tests: round-trip patch → inverse → original; replay of a pre-P11 snapshot still loads.
Verify: whiteboard-core + shared-types + web vitest pass; contract tests (`geometry.contract.test.ts`) still pass.

### P11-T08 — Datar → Ruang (flat shape to solid)   [tier: MID] [deps: T04, P10-T12]
Goal: the reliable path to "2D → 3D": select a recognized shape → choose what solid it becomes.
Allowed paths: `apps/web/src/components/whiteboard/ShapeToSolidMenu.tsx` (+test), `apps/web/src/lib/shapeToSolid.ts` (+test), `ToolBar.tsx` / selection UI (additive).
Mapping (offer only solids that exist): `square` → Kubus (side from the shape), Balok; `rect` → Balok (l, w from the shape; height default = min(l,w)), Prisma segiempat (if available); `right_triangle` → Prisma segitiga siku-siku (a, b from legs; height default = max(a,b)); `triangle` → Limas segitiga (only if supported by T02 option) ; `circle` → Tabung, Kerucut, Bola (r from the circle); `pentagon`/`hexagon` → only if the optional regular builders exist.
Dimensions: world units ÷ 20 = cm (grid convention). The new `viz_solid` is created at the shape's center; the shape is kept faded as the "alas" or replaced (user toggle, default replace via normal events so undo works).
Steps:
- [ ] 1. `shapeToSolid.ts`: pure function `(shape) → SolidProposal[]` with tests (e.g., rect 200×120 world units → balok 10 × 6 cm).
- [ ] 2. Menu component (appears next to the selected shape; keyboard accessible).
- [ ] 3. Event emission through the existing whiteboard event pipeline.
Verify: vitest pass; manual: draw a square → snap → "Jadikan bangun ruang" → Kubus appears with side 10 for a 200-unit square.

### P11-T09 — Jaring-jaring (unfold/fold)   [tier: HIGH] [deps: T03]
Allowed paths: `packages/geometry-core/src/unfold.ts` (+test), `apps/web/src/components/math/UnfoldAnimation.tsx` (+test).
Design:
- General convex polyhedra: build the face adjacency graph; choose the base face (largest area, tie → first); BFS spanning tree; for each child face the hinge is the shared edge and the fold angle is `π − dihedral(parent, child)` (dihedral measured inside the solid). API `unfoldPlan(poly) → { rootFace: number; steps: { face: number; parent: number; hinge: [number, number]; foldAngle: number }[] }`. The viewer animates parameter `t ∈ [0,1]` by rotating each child face around its hinge by `foldAngle·t` (t=1 flat net, t=0 solid) — play "fold" (2D→solid) and "unfold" (solid→net).
- Invariants (tests): net area = surface area (cube side 5 → 150; cuboid 3×4×5 → 94; prism 3,4,10 → 132; pyramid 6,4 → 96); at t=1 all faces are coplanar (|z| < 1e-9 after transforms); at t=0 vertices equal the original solid.
- Curved solids: cylinder net = rectangle (2πr × h) + 2 circles (r); cone net = circle sector with radius `s = √(r²+h²)` and angle `360°·r/s` + base circle (r). Test: cylinder r7 h10 → rect area 2π·7·10 = 140π; total = 238π (matches the existing surface area 747.699…); cone r3 h4 → s = 5, sector angle 216°, total 24π.
Steps:
- [ ] 1. `unfoldPlan` + invariant tests. 2. Animation component driven by `t` (slider + play button). 3. Curved-solid nets. 4. Persist `unfoldT` via T07 fields.
Verify: geometry-core + web tests pass.

### P11-T10 — OPTIONAL: wireframe sketch → solid   [tier: HIGH] [deps: T08, P10-T12]
Goal: draw a textbook cube/pyramid/prism/cylinder/cone by hand → get the 3D solid (the demo's headline feature). Do this only after T08 works in class.
Allowed paths: `packages/sketch-core/src/solid/**` (new), `packages/sketch-core/src/testing/projectSolid.ts` (new), tests.
Design:
- Test data without hand-collecting: `projectSolid(poly, 'cabinet')` renders a Polyhedron into 2D strokes with the cabinet projection `x' = x + 0.5·y·cos45°`, `y' = z + 0.5·y·sin45°` (hidden edges dashed or omitted), then add the P10 noise model.
- Pipeline: recognize each stroke with `recognizeShape` (line/polygon/ellipse) → merge endpoints within 0.04×diagonal → build a vertex/edge graph → match signatures: opaque cube/cuboid (7 vertices, 9 edges: 2 parallelograms/rectangles + 3 connectors, hidden edges omitted) or full wireframe (8, 12); square pyramid (5, 8); triangular prism (6, 9); cylinder (2 ellipses + 2 verticals); cone (1 ellipse + 2 lines meeting at an apex); sphere (circle ± equator ellipse).
- Parameters from the drawing: front face width/height; depth ≈ `|d|/0.5`; cube if |w−h|<10% and depth≈w within 20%.
- Output: ranked candidates with confidence; UI shows top-3 thumbnails; the user confirms (never auto-create below 0.8).
- Optional fallback: vision LLM through ai-service (`/ai/sketch/classify`), teacher-triggered only.
Steps: [ ] 1. projector + generator tests; [ ] 2. graph build + signatures; [ ] 3. parameter estimation; [ ] 4. confirm UI.
Gate: on synthetic noisy cabinet drawings of the 5 solids: correct top-1 ≥ 0.85, wrong auto-create ≤ 0.03.

### P11-T11 — i18n glossary + a11y   [tier: LOW] [deps: T06]
Allowed paths: `apps/web/src/i18n/locales/id.json` (additive), `docs/glossary-id.md` (new).
Terms: kubus, balok, prisma, limas, tabung, kerucut, bola, rusuk, titik sudut, bidang sisi, alas, tinggi, diagonal bidang, diagonal ruang, bidang diagonal, irisan, jaring-jaring, luas permukaan, volume, sudut antara dua bidang, sudut antara garis dan bidang, jarak titik ke bidang, jarak titik ke garis.
Steps: [ ] add keys for every UI string introduced in P11 (no hard-coded text); [ ] `aria-label` for vertex handles ("Titik A"), tools, and result regions; [ ] keyboard: arrow keys rotate, `+/−` zoom, `Tab` cycles vertices, `Enter` selects.
Verify: i18n test (no missing keys) and vitest pass.

### P11-RV — Phase review   [tier: HIGH]
Follow `ai-plan/REVIEW.md`. Extra checks: all test vectors above pass; no per-frame events; replay of old snapshots OK; perf gate from P10 still met with 3 live solids; lock files; update CODEMAP + KNOWLEDGE.
