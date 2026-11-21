# AUDIT-P10: Whiteboard Code & Performance Audit

Generated as part of P10-T01.

| Concern | File | Line Range | How it works (≤3 lines) |
|---|---|---|---|
| Route `/whiteboard` | `apps/web/src/pages/room/PersonalRoomPage.tsx` | 42–257 | Sandbox room without login. Manages `boardState` + `history` via `useState` and passes them to `WhiteboardCanvas`. |
| Grid | `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx` | 327–396 | `GridLayer` computes grid lines & dots imperatively into Konva nodes (`Line`, `Circle`) in a dedicated `<Layer>`. Re-rendered on zoom. |
| Wheel/pinch zoom | `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx` | 1269–1363 | `handleWheel` updates React state `setView` on every wheel event. Triggers full component re-render of canvas and grid per event. |
| Stroke rendering | `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx` | 1373–1400 | Re-evaluates `strokeToPoints` (`getStroke` from perfect-freehand) for every stroke on render; renders closed Konva `Line`. |
| Shape rendering | `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx` | 400–566 | `RenderObject` switches on `object_type` to render Konva `Rect`, `Circle`, `Line`, `Arrow`, `Text`. |
| Auto-shape recognizer | `apps/web/src/pages/whiteboard/WhiteboardCanvas.tsx` | 170–322 | `recognizeShape` called on `handleStagePointerUp` for pen strokes; classifies to line/rect/circle/ellipse/polygon via RDP. |
| Autosave | `apps/web/src/lib/sceneManager.ts` | 26–48 | `saveBoardToLocal` persists board to `localStorage`. Not called per-frame during wheel zoom. |
| 3D overlay positioning | `apps/web/src/pages/whiteboard/WhiteboardOverlay.tsx` | 1–110 | Places HTML overlays over whiteboard items using world coordinates mapped to screen space. |

### Summary Note
- **Zoom updates React state**: YES. `const [view, setView] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });` is called in `handleWheel` and `handleTouchMove`, forcing React to re-render the entire component tree and recompute Konva node lists on every animation frame/scroll tick.
- **Grid overhead**: High at low zoom levels because `GridLayer` creates an array of Konva `<Line>` and `<Circle>` nodes based on world coordinates.
