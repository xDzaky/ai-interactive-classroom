# AUDIT-P11: Audit Existing 3D Codebase & Solid Viewer

Generated as part of task **P11-T01** on 2026-11-22.

---

## 1. File Map & Architectural Roles

| File Path | Role | Key Exports / Components |
|---|---|---|
| `packages/geometry-core/src/index.ts` | Deterministic geometry calculation engine (pure TS) | `computeGeometry`, `SolidType`, `SolidParams`, `GeometryResult` |
| `packages/whiteboard-core/src/index.ts` | Whiteboard domain schemas & types | `BoardObjectSchema`, `BoardObject`, `Transform` |
| `packages/whiteboard-core/src/reducer.ts` | Immutable whiteboard state reducer | `applyEvent`, `whiteboardReducer` |
| `apps/web/src/lib/threeGeometry.ts` | Three.js BufferGeometry builders | `buildThreeGeometry`, `ThreeGeometryResult` |
| `apps/web/src/components/math/SolidViewer.tsx` | React Three Fiber interactive 3D viewer | `SolidViewer`, `SolidMesh` |
| `apps/web/src/pages/whiteboard/WhiteboardOverlay.tsx` | HTML/DOM overlay synchronizing 3D Canvas with Konva viewport | `WhiteboardOverlay`, `VizSolidOverlay` |
| `apps/web/src/lib/coords.ts` | Mathematical to Three.js coordinate mapping ($Z$-up to $Y$-up) | `toThree`, `fromThree` |

---

## 2. Exact `viz_solid` Data Model & Event Contracts

### `BoardObject` Props for `object_type: "viz_solid"`
```ts
{
  id: string;
  object_type: "viz_solid";
  props: {
    x: number;                    // World X coordinate on canvas
    y: number;                    // World Y coordinate on canvas
    solid_type: SolidType;        // Solid discriminator
    params: SolidParams;          // Numerical parameters
    // Proposed P11 extensions:
    active_vertices?: string[];   // Selected vertex handles (e.g. ["A", "C", "H"])
    section_plane?: PlaneSpec;    // Defined cross-section plane
    unfold_progress?: number;     // 0.0 (closed solid) to 1.0 (flat net)
  };
  created_at: number;
  updated_at: number;
}
```

### Supported Solid Types & Parameters
```ts
export type SolidType =
  | "cube"        // params: { type: "cube", s: number }
  | "cuboid"      // params: { type: "cuboid", l: number, w: number, h: number }
  | "sphere"      // params: { type: "sphere", r: number }
  | "cylinder"    // params: { type: "cylinder", r: number, h: number }
  | "cone"        // params: { type: "cone", r: number, h: number }
  | "pyramid"     // params: { type: "pyramid", b: number, h: number }
  | "prism"       // params: { type: "prism", a: number, b: number, c: number, h: number }
  | "torus";      // params: { type: "torus", R: number, r: number }
```

### Events Used for Mutation & Student Broadcast
- `object.created` $\implies$ Teacher creates 3D solid on board. Broadcasts to students via Laravel Reverb channel `room.{roomId}`.
- `object.updated` $\implies$ Updates parameters (e.g. changing cube side $s$ or selecting vertices for cross-section).
- `object.transform` $\implies$ Drags or repositions the 3D solid container on the whiteboard.
- `object.deleted` $\implies$ Removes the 3D solid.

---

## 3. Current Viewer State vs P11 Target Capabilities

| Feature | Current State (P03/P10) | P11 Target (Bangun Ruang) |
|---|---|---|
| **Mesh Rendering** | Basic Three.js geometry with standard material & wireframe toggle | Semi-transparent faces with distinct hidden dashed edges |
| **Vertex Handles & Labels** | None (only single HTML dimension box `w × h × d`) | Interactive clickable vertex handles labeled `A, B, C, D, E, F, G, H` (or `T.ABCD`) |
| **Cross-Section (Irisan Bidang)** | Single horizontal clipping plane toggle | 3-point cross-section plane calculation, highlighted intersection polygon, interior angle labels |
| **Net Unfolding (Jaring-Jaring)** | Not implemented | Smooth slider animation from 3D solid to 2D net layout |
| **Measurements** | Static formulas in panel | Interactive distance between 2 vertices, diagonal ruang, diagonal bidang |
| **2D $\to$ 3D Conversion** | None | Recognize drawn 2D shape $\to$ extrude into 3D solid |
