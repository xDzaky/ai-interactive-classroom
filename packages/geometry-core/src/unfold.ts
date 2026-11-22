/**
 * 3D Polyhedron & Curved Solid Unfolding (Jaring-Jaring) — @ai-classroom/geometry-core (P11-T09)
 * Generates unfold spanning trees and rotational hinge plans from 3D solids to 2D nets.
 */

import type { Polyhedron, Vec3 } from './polyhedron.js';
import {
  vecSub,
  vecCross,
  vecDot,
  vecLength,
  computeFaceNormal,
} from './polyhedron.js';

export interface UnfoldStep {
  face: number;
  parent: number;
  hinge: [number, number]; // [vertexU, vertexV]
  foldAngle: number;       // Angle to rotate around hinge from solid to flat (radians)
}

export interface UnfoldPlan {
  rootFace: number;
  steps: UnfoldStep[];
}

export interface CurvedSolidNet {
  type: 'cylinder' | 'cone';
  parts: Array<{
    kind: 'rect' | 'circle' | 'sector';
    dimensions: Record<string, number>;
    area: number;
  }>;
  totalArea: number;
}

/** Compute face area of a polygon */
export function computeFaceArea(face: number[], vertices: Vec3[]): number {
  let area = 0;
  const v0 = vertices[face[0]];
  for (let i = 1; i < face.length - 1; i++) {
    const v1 = vertices[face[i]];
    const v2 = vertices[face[i + 1]];
    const e1 = vecSub(v1, v0);
    const e2 = vecSub(v2, v0);
    area += 0.5 * vecLength(vecCross(e1, e2));
  }
  return area;
}

/** Check if two faces share an edge */
function findSharedEdge(faceA: number[], faceB: number[]): [number, number] | null {
  const setA = new Set(faceA);
  const common: number[] = [];
  for (const v of faceB) {
    if (setA.has(v)) common.push(v);
  }
  if (common.length === 2) {
    return [Math.min(common[0], common[1]), Math.max(common[0], common[1])];
  }
  return null;
}

/**
 * Builds an unfolding plan (BFS spanning tree with hinge fold angles) for a polyhedron.
 */
export function unfoldPlan(poly: Polyhedron): UnfoldPlan {
  const { faces, vertices } = poly;
  const numFaces = faces.length;

  // 1. Choose root face (largest area; tie -> smallest index)
  let rootFace = 0;
  let maxArea = -1;
  for (let i = 0; i < numFaces; i++) {
    const a = computeFaceArea(faces[i], vertices);
    if (a > maxArea) {
      maxArea = a;
      rootFace = i;
    }
  }

  // 2. Build face adjacency graph
  const adj: Map<number, Array<{ neighbor: number; hinge: [number, number] }>> = new Map();
  for (let i = 0; i < numFaces; i++) adj.set(i, []);

  for (let i = 0; i < numFaces; i++) {
    for (let j = i + 1; j < numFaces; j++) {
      const edge = findSharedEdge(faces[i], faces[j]);
      if (edge) {
        adj.get(i)!.push({ neighbor: j, hinge: edge });
        adj.get(j)!.push({ neighbor: i, hinge: edge });
      }
    }
  }

  // 3. BFS Spanning Tree from rootFace
  const visited = new Set<number>([rootFace]);
  const queue: number[] = [rootFace];
  const steps: UnfoldStep[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adj.get(curr) || [];

    for (const { neighbor, hinge } of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);

        // Compute dihedral angle between parent face and child face
        const nParent = computeFaceNormal(faces[curr], vertices);
        const nChild = computeFaceNormal(faces[neighbor], vertices);
        const dot = Math.max(-1, Math.min(1, vecDot(nParent, nChild)));
        const dihedral = Math.acos(dot);
        // Fold angle: rotation required to flatten child onto parent plane
        const foldAngle = Math.PI - dihedral;

        steps.push({
          face: neighbor,
          parent: curr,
          hinge,
          foldAngle,
        });

        queue.push(neighbor);
      }
    }
  }

  return { rootFace, steps };
}

/**
 * Calculates net components and total surface area for curved solids (cylinder, cone).
 */
export function curvedSolidNet(
  solid: { type: 'cylinder'; r: number; h: number } | { type: 'cone'; r: number; h: number }
): CurvedSolidNet {
  const PI = Math.PI;

  if (solid.type === 'cylinder') {
    const { r, h } = solid;
    const rectArea = 2 * PI * r * h;
    const circleArea = PI * r * r;
    const totalArea = rectArea + 2 * circleArea;

    return {
      type: 'cylinder',
      parts: [
        { kind: 'rect', dimensions: { width: 2 * PI * r, height: h }, area: rectArea },
        { kind: 'circle', dimensions: { radius: r }, area: circleArea },
        { kind: 'circle', dimensions: { radius: r }, area: circleArea },
      ],
      totalArea,
    };
  } else {
    // Cone: slant height s = sqrt(r^2 + h^2)
    const { r, h } = solid;
    const s = Math.hypot(r, h);
    const sectorAngleDeg = (360 * r) / s;
    const sectorArea = PI * r * s;
    const circleArea = PI * r * r;
    const totalArea = sectorArea + circleArea;

    return {
      type: 'cone',
      parts: [
        { kind: 'sector', dimensions: { slantHeight: s, angleDeg: sectorAngleDeg }, area: sectorArea },
        { kind: 'circle', dimensions: { radius: r }, area: circleArea },
      ],
      totalArea,
    };
  }
}
