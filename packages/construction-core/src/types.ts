/**
 * @ai-classroom/construction-core — types.ts
 * Clean-room 2D dynamic geometry types (P13-T06).
 */

export interface Point2D {
  x: number;
  y: number;
}

export type ConstructionObjectType =
  | 'point'
  | 'midpoint'
  | 'line'
  | 'segment'
  | 'ray'
  | 'perpendicular'
  | 'parallel'
  | 'circle_cp'
  | 'circle_3p'
  | 'intersection_ll'
  | 'intersection_lc'
  | 'intersection_cc'
  | 'polygon'
  | 'angle';

export interface BaseConstructionObject {
  id: string;
  type: ConstructionObjectType;
  label?: string;
  color?: string;
  hidden?: boolean;
}

export interface FreePointObject extends BaseConstructionObject {
  type: 'point';
  x: number;
  y: number;
}

export interface MidpointObject extends BaseConstructionObject {
  type: 'midpoint';
  p1Id: string;
  p2Id: string;
}

export interface LineObject extends BaseConstructionObject {
  type: 'line';
  p1Id: string;
  p2Id: string;
}

export interface SegmentObject extends BaseConstructionObject {
  type: 'segment';
  p1Id: string;
  p2Id: string;
}

export interface RayObject extends BaseConstructionObject {
  type: 'ray';
  p1Id: string;
  p2Id: string;
}

export interface PerpendicularLineObject extends BaseConstructionObject {
  type: 'perpendicular';
  pointId: string;
  lineId: string;
}

export interface ParallelLineObject extends BaseConstructionObject {
  type: 'parallel';
  pointId: string;
  lineId: string;
}

export interface CircleCPObject extends BaseConstructionObject {
  type: 'circle_cp';
  centerId: string;
  pointId: string;
}

export interface Circle3PObject extends BaseConstructionObject {
  type: 'circle_3p';
  p1Id: string;
  p2Id: string;
  p3Id: string;
}

export interface IntersectionLLObject extends BaseConstructionObject {
  type: 'intersection_ll';
  line1Id: string;
  line2Id: string;
}

export interface IntersectionLCObject extends BaseConstructionObject {
  type: 'intersection_lc';
  lineId: string;
  circleId: string;
  index: 0 | 1;
}

export interface IntersectionCCObject extends BaseConstructionObject {
  type: 'intersection_cc';
  circle1Id: string;
  circle2Id: string;
  index: 0 | 1;
}

export interface PolygonObject extends BaseConstructionObject {
  type: 'polygon';
  pointIds: string[];
}

export interface AngleObject extends BaseConstructionObject {
  type: 'angle';
  p1Id: string;
  vertexId: string;
  p2Id: string;
}

export type ConstructionObject =
  | FreePointObject
  | MidpointObject
  | LineObject
  | SegmentObject
  | RayObject
  | PerpendicularLineObject
  | ParallelLineObject
  | CircleCPObject
  | Circle3PObject
  | IntersectionLLObject
  | IntersectionLCObject
  | IntersectionCCObject
  | PolygonObject
  | AngleObject;

export interface ComputedPoint {
  kind: 'point';
  x: number;
  y: number;
}

export interface ComputedLine {
  kind: 'line';
  p1: Point2D;
  p2: Point2D;
  a: number; // ax + by + c = 0
  b: number;
  c: number;
  length?: number;
}

export interface ComputedCircle {
  kind: 'circle';
  center: Point2D;
  radius: number;
}

export interface ComputedPolygon {
  kind: 'polygon';
  vertices: Point2D[];
  area: number;
  perimeter: number;
}

export interface ComputedAngle {
  kind: 'angle';
  degrees: number;
  radians: number;
}

export type ComputedValue =
  | ComputedPoint
  | ComputedLine
  | ComputedCircle
  | ComputedPolygon
  | ComputedAngle;

export interface ConstructionSceneData {
  objects: Record<string, ConstructionObject>;
  order: string[];
}
