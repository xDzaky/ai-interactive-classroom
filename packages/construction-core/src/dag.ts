/**
 * @ai-classroom/construction-core — dag.ts
 * Dependency Directed Acyclic Graph (DAG) for dynamic geometric constructions.
 */

import type { ConstructionObject } from "./types.js";

/**
 * Returns the immediate parent dependencies for a given construction object.
 */
export function getDependencies(obj: ConstructionObject): string[] {
  switch (obj.type) {
    case 'point':
      return [];
    case 'midpoint':
    case 'line':
    case 'segment':
    case 'ray':
      return [obj.p1Id, obj.p2Id];
    case 'perpendicular':
    case 'parallel':
      return [obj.pointId, obj.lineId];
    case 'circle_cp':
      return [obj.centerId, obj.pointId];
    case 'circle_3p':
      return [obj.p1Id, obj.p2Id, obj.p3Id];
    case 'intersection_ll':
      return [obj.line1Id, obj.line2Id];
    case 'intersection_lc':
      return [obj.lineId, obj.circleId];
    case 'intersection_cc':
      return [obj.circle1Id, obj.circle2Id];
    case 'polygon':
      return [...obj.pointIds];
    case 'angle':
      return [obj.p1Id, obj.vertexId, obj.p2Id];
    default:
      return [];
  }
}

/**
 * Checks whether adding or updating `targetId` to depend on `newDependencies` would introduce a cycle.
 */
export function wouldCreateCycle(
  objects: Record<string, ConstructionObject>,
  targetId: string,
  newDependencies: string[]
): boolean {
  if (newDependencies.includes(targetId)) return true;

  // Build adjacency list: child -> parents
  // Check if targetId is reachable from any of the new dependencies
  const visited = new Set<string>();
  const stack = [...newDependencies];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === targetId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const obj = objects[current];
    if (obj) {
      const parents = getDependencies(obj);
      for (const p of parents) {
        if (!visited.has(p)) {
          stack.push(p);
        }
      }
    }
  }

  return false;
}

/**
 * Computes topological ordering of objects using Kahn's algorithm.
 * Throws an Error if a cycle is detected.
 */
export function topologicalSort(objects: Record<string, ConstructionObject>): string[] {
  const inDegree: Record<string, number> = {};
  const childrenMap: Record<string, string[]> = {};
  const ids = Object.keys(objects);

  for (const id of ids) {
    inDegree[id] = 0;
    childrenMap[id] = [];
  }

  for (const id of ids) {
    const parents = getDependencies(objects[id]);
    for (const p of parents) {
      if (objects[p]) {
        inDegree[id]++;
        childrenMap[p].push(id);
      }
    }
  }

  const queue: string[] = [];
  for (const id of ids) {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    for (const child of childrenMap[node] || []) {
      inDegree[child]--;
      if (inDegree[child] === 0) {
        queue.push(child);
      }
    }
  }

  if (result.length !== ids.length) {
    throw new Error("Cycle detected in construction dependency graph");
  }

  return result;
}

/**
 * Returns all transitive descendant IDs that depend on `rootId`.
 */
export function getDescendants(
  objects: Record<string, ConstructionObject>,
  rootId: string
): Set<string> {
  const childrenMap: Record<string, string[]> = {};
  for (const id of Object.keys(objects)) {
    const parents = getDependencies(objects[id]);
    for (const p of parents) {
      if (!childrenMap[p]) childrenMap[p] = [];
      childrenMap[p].push(id);
    }
  }

  const descendants = new Set<string>();
  const queue = [...(childrenMap[rootId] || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!descendants.has(current)) {
      descendants.add(current);
      if (childrenMap[current]) {
        queue.push(...childrenMap[current]);
      }
    }
  }

  return descendants;
}
