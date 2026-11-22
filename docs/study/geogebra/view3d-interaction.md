# Study Spec S3: 3D View Interaction & Picking (Interaksi Tampilan 3D)

## Behavioral Description
The 3D graphics view provides smooth orbit rotation, pinch zoom, and pan via pointer drag. Vertices, edges, and cutting planes must be pickable with generous hit-testing thresholds (e.g. 12-16px tolerance on touch screens).

## Interaction Rules
- **Orbit Rotation:** Single-finger drag or left mouse drag rotates around the center of the solid bounding box.
- **Pan:** Two-finger drag or middle-mouse drag translates the view in screen space.
- **Pinch Zoom:** Two-finger pinch or scroll wheel zooms continuously without discrete steps.
- **Hidden Lines:** Edges facing away from the camera are rendered with dashed lines (`strokeDasharray = [4, 4]`) or lowered opacity (0.35).
- **Label Anti-collision:** Vertex labels ($A, B, C, \dots$) are projected outward along their vertex normal vector to avoid overlapping geometry.

## Edge Cases
1. Gimbal lock: prevented by using unit quaternion rotations or polar spherical coordinate clamping ($[-89^\circ, 89^\circ]$ pitch).
2. Extremely large or small zoom levels: clamped to $[0.1\times, 10\times]$.
3. Finger occluding target point on touch: vertex snap circle displays an offset halo.

## Test Vectors (Ours)
- Isometric default camera angle: Azimuth $45^\circ$, Elevation $30^\circ$.
- Projection of vertex $(5, 5, 5)$ to screen coordinates under standard perspective camera.

## Gaps vs Our Implementation
- Implemented in Three.js overlay (`SolidViewer.tsx` & `WhiteboardOverlay.tsx`). 100% covered.
