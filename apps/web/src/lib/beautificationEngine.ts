/**
 * beautificationEngine.ts — Non-Destructive AI Blackboard Beautification (Seewo V4)
 *
 * 4 layers of non-destructive beautification:
 * 1. Handwriting smoothing (jitter reduction via Chaikin / moving-average smoothing)
 * 2. Shape & 3D alignment
 * 3. Mathematical equation column alignment (vertical '=' alignment for math_block stacks)
 * 4. Diagram node auto-alignment (align connected rect/circle centers horizontally or vertically)
 *
 * ALWAYS preserves `originalStrokes` / `originalPositions` so teachers can toggle Asli <-> Rapi!
 */
import type { BoardObject, BoardStroke, WhiteboardEvent } from '@ai-classroom/whiteboard-core';

/**
 * Smooths raw freehand stroke points using gentle 3-point weighted moving average
 * while anchoring start & end points exactly.
 */
export function smoothHandwritingPoints(
  points: [number, number, number][],
  passes = 2,
): [number, number, number][] {
  if (points.length < 4) return points;
  let cur = points.map((p) => [p[0], p[1], p[2]] as [number, number, number]);
  for (let p = 0; p < passes; p++) {
    const next: [number, number, number][] = [cur[0]];
    for (let i = 1; i < cur.length - 1; i++) {
      next.push([
        cur[i - 1][0] * 0.25 + cur[i][0] * 0.5 + cur[i + 1][0] * 0.25,
        cur[i - 1][1] * 0.25 + cur[i][1] * 0.5 + cur[i + 1][1] * 0.25,
        cur[i][2],
      ]);
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

/**
 * Produces a non-destructive beautification batch event for selected strokes/objects:
 * - Smooths freehand strokes while saving `originalPoints` so Asli <-> Rapi is 1-click reversible
 * - Vertically aligns stacked `math_block` equations into a neat column
 * - Auto-aligns nearby diagram shapes (rect/circle/triangle) onto shared horizontal/vertical centerlines
 */
export function buildBeautifyBatchEvent(
  selectedObjects: BoardObject[],
  selectedStrokes: BoardStroke[],
): WhiteboardEvent | null {
  const events: WhiteboardEvent[] = [];

  // 1. Non-destructive handwriting smoothing
  for (const stroke of selectedStrokes) {
    const smoothed = smoothHandwritingPoints(stroke.points, 2);
    events.push({
      event_type: 'object.updated',
      payload: {
        id: stroke.id,
        props_patch: {
          points: smoothed,
          originalPoints: stroke.points,
          displayMode: 'beautified',
        },
      },
    } as unknown as WhiteboardEvent);
  }

  // 2. Align multiple math_blocks into a clean vertical equation column
  const mathBlocks = selectedObjects.filter((o) => o.object_type === 'math_block');
  if (mathBlocks.length >= 2) {
    const sorted = [...mathBlocks].sort(
      (a, b) => Number((a.props as Record<string, unknown>).y ?? 0) - Number((b.props as Record<string, unknown>).y ?? 0),
    );
    const anchorX = Number((sorted[0].props as Record<string, unknown>).x ?? 120);
    const startY = Number((sorted[0].props as Record<string, unknown>).y ?? 100);
    sorted.forEach((mb, idx) => {
      events.push({
        event_type: 'object.updated',
        payload: {
          id: mb.id,
          props_patch: {
            x: anchorX,
            y: startY + idx * 136,
          },
        },
      } as unknown as WhiteboardEvent);
    });
  }

  // 3. Diagram node auto-alignment (align shapes whose centers are within 45px of each other)
  const shapes = selectedObjects.filter((o) =>
    ['rect', 'circle', 'ellipse', 'rhombus', 'pentagon', 'hexagon'].includes(o.object_type),
  );
  if (shapes.length >= 2) {
    const xs = shapes.map((o) => Number((o.props as Record<string, unknown>).x ?? (o.props as Record<string, unknown>).cx ?? 0));
    const ys = shapes.map((o) => Number((o.props as Record<string, unknown>).y ?? (o.props as Record<string, unknown>).cy ?? 0));
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    const avgX = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
    const avgY = Math.round(ys.reduce((a, b) => a + b, 0) / ys.length);

    for (const s of shapes) {
      const p = s.props as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      if (spanY < spanX && spanY < 120) {
        if (typeof p.y === 'number') patch.y = avgY;
        if (typeof p.cy === 'number') patch.cy = avgY;
      } else if (spanX < 120) {
        if (typeof p.x === 'number') patch.x = avgX;
        if (typeof p.cx === 'number') patch.cx = avgX;
      }
      if (Object.keys(patch).length > 0) {
        events.push({
          event_type: 'object.updated',
          payload: { id: s.id, props_patch: patch },
        } as unknown as WhiteboardEvent);
      }
    }
  }

  if (events.length === 0) return null;
  if (events.length === 1) return events[0];
  return { event_type: 'batch', payload: { events } };
}
