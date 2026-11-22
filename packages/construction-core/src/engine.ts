/**
 * @ai-classroom/construction-core — engine.ts
 * Main ConstructionEngine orchestrating DAG recomputation and analytical geometry.
 */

import type {
  ConstructionObject,
  ComputedValue,
  ComputedPoint,
  ComputedLine,
  ComputedCircle,
  ConstructionSceneData,
  Point2D,
} from "./types.js";
import {
  getDependencies,
  topologicalSort,
  wouldCreateCycle,
  getDescendants,
} from "./dag.js";
import {
  computeMidpoint,
  computeLine,
  computePerpendicularLine,
  computeParallelLine,
  computeCircleCP,
  computeCircle3P,
  computeLineLineIntersection,
  computeLineCircleIntersection,
  computeCircleCircleIntersection,
  computePolygon,
  computeAngle,
} from "./geometry.js";

export class ConstructionEngine {
  private objects: Map<string, ConstructionObject> = new Map();
  private order: string[] = [];
  private computed: Map<string, ComputedValue | undefined> = new Map();

  constructor(initialData?: ConstructionSceneData) {
    if (initialData) {
      this.fromJSON(initialData);
    }
  }

  /**
   * Adds an object to the construction scene.
   * Throws if the object id already exists or if it would introduce a cycle.
   */
  public addObject(obj: ConstructionObject): void {
    if (this.objects.has(obj.id)) {
      throw new Error(`Object with id "${obj.id}" already exists`);
    }

    const currentMap = Object.fromEntries(this.objects);
    const deps = getDependencies(obj);

    // Ensure all referenced parents exist
    for (const dep of deps) {
      if (!this.objects.has(dep)) {
        throw new Error(`Dependency "${dep}" does not exist`);
      }
    }

    if (wouldCreateCycle(currentMap, obj.id, deps)) {
      throw new Error(`Adding object "${obj.id}" would create a dependency cycle`);
    }

    this.objects.set(obj.id, obj);
    this.order.push(obj.id);
    this.recompute();
  }

  /**
   * Updates a free point's coordinates and immediately recomputes all dependents.
   */
  public updatePoint(id: string, x: number, y: number): void {
    const obj = this.objects.get(id);
    if (!obj) {
      throw new Error(`Object with id "${id}" not found`);
    }
    if (obj.type !== 'point') {
      throw new Error(`Object with id "${id}" is not a free point`);
    }

    obj.x = x;
    obj.y = y;
    this.recompute();
  }

  /**
   * Updates an existing object.
   */
  public updateObject(obj: ConstructionObject): void {
    if (!this.objects.has(obj.id)) {
      throw new Error(`Object with id "${obj.id}" not found`);
    }

    const currentMap = Object.fromEntries(this.objects);
    const deps = getDependencies(obj);

    for (const dep of deps) {
      if (!this.objects.has(dep)) {
        throw new Error(`Dependency "${dep}" does not exist`);
      }
    }

    if (wouldCreateCycle(currentMap, obj.id, deps)) {
      throw new Error(`Updating object "${obj.id}" would create a dependency cycle`);
    }

    this.objects.set(obj.id, obj);
    this.recompute();
  }

  /**
   * Removes an object and all its dependent objects.
   */
  public removeObject(id: string): void {
    if (!this.objects.has(id)) return;

    const currentMap = Object.fromEntries(this.objects);
    const toRemove = getDescendants(currentMap, id);
    toRemove.add(id);

    for (const removeId of toRemove) {
      this.objects.delete(removeId);
      this.computed.delete(removeId);
    }

    this.order = this.order.filter((oId) => !toRemove.has(oId));
    this.recompute();
  }

  public getObject(id: string): ConstructionObject | undefined {
    return this.objects.get(id);
  }

  public getAllObjects(): ConstructionObject[] {
    return this.order.map((id) => this.objects.get(id)!).filter(Boolean);
  }

  public getComputed(id: string): ComputedValue | undefined {
    return this.computed.get(id);
  }

  public getPointCoords(id: string): Point2D | undefined {
    const val = this.computed.get(id);
    if (val && val.kind === 'point') {
      return { x: val.x, y: val.y };
    }
    return undefined;
  }

  /**
   * Recomputes all objects in topological dependency order.
   * Undefined dependencies gracefully propagate as undefined without throwing.
   */
  public recompute(): void {
    const currentMap = Object.fromEntries(this.objects);
    if (Object.keys(currentMap).length === 0) return;

    const sortedIds = topologicalSort(currentMap);

    for (const id of sortedIds) {
      const obj = this.objects.get(id)!;
      this.computed.set(id, this.evaluateObject(obj));
    }
  }

  private evaluateObject(obj: ConstructionObject): ComputedValue | undefined {
    switch (obj.type) {
      case 'point':
        return { kind: 'point', x: obj.x, y: obj.y };

      case 'midpoint': {
        const p1 = this.getPointCoords(obj.p1Id);
        const p2 = this.getPointCoords(obj.p2Id);
        if (!p1 || !p2) return undefined;
        return computeMidpoint(p1, p2);
      }

      case 'line':
      case 'segment':
      case 'ray': {
        const p1 = this.getPointCoords(obj.p1Id);
        const p2 = this.getPointCoords(obj.p2Id);
        if (!p1 || !p2) return undefined;
        return computeLine(p1, p2);
      }

      case 'perpendicular': {
        const pt = this.getPointCoords(obj.pointId);
        const line = this.getComputed(obj.lineId);
        if (!pt || !line || line.kind !== 'line') return undefined;
        return computePerpendicularLine(pt, line as ComputedLine);
      }

      case 'parallel': {
        const pt = this.getPointCoords(obj.pointId);
        const line = this.getComputed(obj.lineId);
        if (!pt || !line || line.kind !== 'line') return undefined;
        return computeParallelLine(pt, line as ComputedLine);
      }

      case 'circle_cp': {
        const center = this.getPointCoords(obj.centerId);
        const perimeterPt = this.getPointCoords(obj.pointId);
        if (!center || !perimeterPt) return undefined;
        return computeCircleCP(center, perimeterPt);
      }

      case 'circle_3p': {
        const p1 = this.getPointCoords(obj.p1Id);
        const p2 = this.getPointCoords(obj.p2Id);
        const p3 = this.getPointCoords(obj.p3Id);
        if (!p1 || !p2 || !p3) return undefined;
        return computeCircle3P(p1, p2, p3);
      }

      case 'intersection_ll': {
        const l1 = this.getComputed(obj.line1Id);
        const l2 = this.getComputed(obj.line2Id);
        if (!l1 || !l2 || l1.kind !== 'line' || l2.kind !== 'line') return undefined;
        return computeLineLineIntersection(l1 as ComputedLine, l2 as ComputedLine);
      }

      case 'intersection_lc': {
        const l = this.getComputed(obj.lineId);
        const c = this.getComputed(obj.circleId);
        if (!l || !c || l.kind !== 'line' || c.kind !== 'circle') return undefined;
        return computeLineCircleIntersection(l as ComputedLine, c as ComputedCircle, obj.index);
      }

      case 'intersection_cc': {
        const c1 = this.getComputed(obj.circle1Id);
        const c2 = this.getComputed(obj.circle2Id);
        if (!c1 || !c2 || c1.kind !== 'circle' || c2.kind !== 'circle') return undefined;
        return computeCircleCircleIntersection(c1 as ComputedCircle, c2 as ComputedCircle, obj.index);
      }

      case 'polygon': {
        const vertices: Point2D[] = [];
        for (const pId of obj.pointIds) {
          const pt = this.getPointCoords(pId);
          if (!pt) return undefined;
          vertices.push(pt);
        }
        return computePolygon(vertices);
      }

      case 'angle': {
        const p1 = this.getPointCoords(obj.p1Id);
        const vertex = this.getPointCoords(obj.vertexId);
        const p2 = this.getPointCoords(obj.p2Id);
        if (!p1 || !vertex || !p2) return undefined;
        return computeAngle(p1, vertex, p2);
      }

      default:
        return undefined;
    }
  }

  public toJSON(): ConstructionSceneData {
    return {
      objects: Object.fromEntries(this.objects),
      order: [...this.order],
    };
  }

  public fromJSON(data: ConstructionSceneData): void {
    this.objects.clear();
    this.computed.clear();
    this.order = [];

    for (const id of data.order || Object.keys(data.objects || {})) {
      if (data.objects[id]) {
        this.objects.set(id, data.objects[id]);
        this.order.push(id);
      }
    }

    this.recompute();
  }
}
