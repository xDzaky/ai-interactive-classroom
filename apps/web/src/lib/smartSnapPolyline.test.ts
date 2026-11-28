import { describe, it, expect } from 'vitest';
import type { SceneState } from '@ai-classroom/whiteboard-core';
import {
  beautifyFreehandToSnappedPolyline,
  buildAutoConnectedPolylineEvent,
} from './smartSnapPolyline';

function makeCubeFrontScene(): SceneState {
  return {
    id: 's1',
    name: 'Test',
    strokes: {},
    objects: {
      frontRect: {
        id: 'frontRect',
        object_type: 'rect',
        props: { x: 100, y: 150, w: 180, h: 180, stroke: '#0f172a', strokeWidth: 2, fill: 'transparent' },
        created_at: 1,
        updated_at: 1,
      },
    },
    order: ['frontRect'],
  };
}

/** Generate slightly wobbly freehand points along a polyline path */
function makeWobblyStroke(corners: Array<[number, number]>): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let s = 0; s < corners.length - 1; s++) {
    const [x0, y0] = corners[s];
    const [x1, y1] = corners[s + 1];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wobble = Math.sin(t * Math.PI) * 2.5;
      out.push([x0 + (x1 - x0) * t + wobble, y0 + (y1 - y0) * t - wobble * 0.5, 0.5]);
    }
  }
  return out;
}

describe('smartSnapPolyline — Auto-Straighten, Vertex-Snap & Auto-Connect', () => {
  it('straightens a wobbly 4-segment outer cube wall, snaps to front square corners, and auto-merges into 1 connected object', () => {
    const scene = makeCubeFrontScene();
    // User starts near top-left (100,150) with 6px error, draws top-back, right-back, and ends near bottom-right (280,330)
    const wobblyWall = makeWobblyStroke([
      [96, 154],   // near (100, 150)
      [155, 92],   // top-back-left
      [335, 96],   // top-back-right (slightly tilted -> snaps horizontal!)
      [339, 275],  // bottom-back-right (slightly tilted -> snaps vertical!)
      [285, 326],  // near (280, 330)
    ]);

    const res = beautifyFreehandToSnappedPolyline(wobblyWall, scene);
    expect(res).not.toBeNull();
    expect(res!.segmentCount).toBe(4);
    // Start & end snapped cleanly to the exact front square corners!
    expect(res!.vertices[0]).toEqual({ x: 100, y: 150 });
    expect(res!.vertices[4]).toEqual({ x: 280, y: 330 });
    // Top-back edge straightened horizontally & right-back edge straightened vertically!
    expect(res!.vertices[1].y).toBe(res!.vertices[2].y);
    expect(res!.vertices[2].x).toBe(res!.vertices[3].x);
    expect(res!.touchedObjectIds).toEqual(['frontRect']);

    // Auto-connect merges frontRect + new cube wall into ONE atomic batch event
    const built = buildAutoConnectedPolylineEvent('wall-1', res!, scene, {
      stroke: '#0f172a',
      strokeWidth: 2,
    });
    expect(built.autoMerged).toBe(true);
    expect(built.event.event_type).toBe('batch');
  });

  it('ignores curved handwriting loops so normal writing is never distorted', () => {
    const scene = makeCubeFrontScene();
    // Draw a wavy S-curve / handwriting stroke
    const curve: Array<[number, number, number]> = [];
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      curve.push([420 + Math.sin(t) * 25, 180 + i * 1.8, 0.5]);
    }
    const res = beautifyFreehandToSnappedPolyline(curve, scene);
    expect(res).toBeNull();
  });
});
