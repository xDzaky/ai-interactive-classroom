/**
 * @ai-classroom/geometry-core — 2D Intelligent Folding
 * Detects face adjacency among 2D polygons on the whiteboard (e.g., 6 squares arranged
 * as a cube net) and builds a hinge spanning tree that folds smoothly into a 3D solid.
 */

export interface FlatFace2D {
  id: string;
  /** Flat vertices [x0, y0, x1, y1, ...] */
  vertices: number[];
}

export interface FoldHinge {
  parentId: string;
  childId: string;
  edgeStart: [number, number];
  edgeEnd: [number, number];
  targetAngleRad: number;
}

export interface DetectedNet2D {
  recognizedSolid: 'cube' | 'cuboid' | 'pyramid' | 'prism' | 'custom_net';
  rootId: string;
  hinges: FoldHinge[];
  faceCount: number;
}

function getEdges(flat: number[]): Array<[[number, number], [number, number]]> {
  const edges: Array<[[number, number], [number, number]]> = [];
  const n = Math.floor(flat.length / 2);
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    edges.push([
      [flat[i * 2], flat[i * 2 + 1]],
      [flat[next * 2], flat[next * 2 + 1]],
    ]);
  }
  return edges;
}

function edgesMatch(
  a: [[number, number], [number, number]],
  b: [[number, number], [number, number]],
  tol: number,
): boolean {
  const same =
    Math.hypot(a[0][0] - b[0][0], a[0][1] - b[0][1]) <= tol &&
    Math.hypot(a[1][0] - b[1][0], a[1][1] - b[1][1]) <= tol;
  const rev =
    Math.hypot(a[0][0] - b[1][0], a[0][1] - b[1][1]) <= tol &&
    Math.hypot(a[1][0] - b[0][0], a[1][1] - b[0][1]) <= tol;
  return same || rev;
}

/**
 * Detects whether a set of 2D faces forms a connected foldable net and builds
 * a BFS spanning tree of hinge edges rooted at the most central (highest-degree) face.
 */
export function detectFoldableNet2D(faces: FlatFace2D[], tolerance = 18): DetectedNet2D | null {
  if (faces.length < 3) return null;

  const adj = new Map<string, Array<{ to: string; edge: [[number, number], [number, number]] }>>();
  for (const f of faces) adj.set(f.id, []);

  for (let i = 0; i < faces.length; i++) {
    const edgesA = getEdges(faces[i].vertices);
    for (let j = i + 1; j < faces.length; j++) {
      const edgesB = getEdges(faces[j].vertices);
      for (const ea of edgesA) {
        for (const eb of edgesB) {
          if (edgesMatch(ea, eb, tolerance)) {
            adj.get(faces[i].id)!.push({ to: faces[j].id, edge: ea });
            adj.get(faces[j].id)!.push({ to: faces[i].id, edge: ea });
            break;
          }
        }
      }
    }
  }

  // Pick highest-degree face as base root
  let rootId = faces[0].id;
  let maxDeg = -1;
  for (const f of faces) {
    const deg = adj.get(f.id)?.length ?? 0;
    if (deg > maxDeg) {
      maxDeg = deg;
      rootId = f.id;
    }
  }
  if (maxDeg <= 0) return null;

  // BFS spanning tree
  const visited = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  const hinges: FoldHinge[] = [];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const neighbor of adj.get(curr) ?? []) {
      if (!visited.has(neighbor.to)) {
        visited.add(neighbor.to);
        queue.push(neighbor.to);
        hinges.push({
          parentId: curr,
          childId: neighbor.to,
          edgeStart: neighbor.edge[0],
          edgeEnd: neighbor.edge[1],
          targetAngleRad: Math.PI / 2,
        });
      }
    }
  }

  if (visited.size < 3) return null;

  const quadCount = faces.filter((f) => Math.floor(f.vertices.length / 2) === 4).length;
  const triCount = faces.filter((f) => Math.floor(f.vertices.length / 2) === 3).length;

  let recognizedSolid: DetectedNet2D['recognizedSolid'] = 'custom_net';
  if (visited.size === 6 && quadCount === 6) recognizedSolid = 'cube';
  else if (visited.size === 5 && quadCount === 1 && triCount === 4) recognizedSolid = 'pyramid';
  else if (visited.size === 5 && quadCount === 3 && triCount === 2) recognizedSolid = 'prism';

  return {
    recognizedSolid,
    rootId,
    hinges,
    faceCount: visited.size,
  };
}
