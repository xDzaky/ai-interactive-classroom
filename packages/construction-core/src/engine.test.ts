/**
 * @ai-classroom/construction-core — engine.test.ts
 * Rigorous tests for clean-room 2D construction engine (P13-T06).
 */

import { describe, it, expect } from "vitest";
import { ConstructionEngine } from "./engine.js";
import type {
  FreePointObject,
  MidpointObject,
  LineObject,
  IntersectionLLObject,
  Circle3PObject,
  PolygonObject,
  AngleObject,
  ComputedPoint,
  ComputedCircle,
  ComputedPolygon,
  ComputedAngle,
} from "./types.js";

describe("ConstructionEngine", () => {
  it("maintains midpoint invariant when moving parent point: midpoint(AB) = (A + B)/2", () => {
    const engine = new ConstructionEngine();

    const pA: FreePointObject = { id: "pA", type: "point", x: 0, y: 0 };
    const pB: FreePointObject = { id: "pB", type: "point", x: 10, y: 10 };
    const midM: MidpointObject = { id: "midM", type: "midpoint", p1Id: "pA", p2Id: "pB" };

    engine.addObject(pA);
    engine.addObject(pB);
    engine.addObject(midM);

    let compM = engine.getComputed("midM") as ComputedPoint;
    expect(compM).toBeDefined();
    expect(compM.x).toBeCloseTo(5);
    expect(compM.y).toBeCloseTo(5);

    // Drag point A to (4, 8)
    engine.updatePoint("pA", 4, 8);
    compM = engine.getComputed("midM") as ComputedPoint;
    expect(compM.x).toBeCloseTo(7); // (4 + 10) / 2
    expect(compM.y).toBeCloseTo(9); // (8 + 10) / 2
  });

  it("computes exact line-line intersection with known vector", () => {
    const engine = new ConstructionEngine();

    // Line 1: through (0, 0) and (4, 4) -> y = x
    engine.addObject({ id: "p1", type: "point", x: 0, y: 0 });
    engine.addObject({ id: "p2", type: "point", x: 4, y: 4 });
    engine.addObject({ id: "l1", type: "line", p1Id: "p1", p2Id: "p2" });

    // Line 2: through (0, 4) and (4, 0) -> y = -x + 4
    engine.addObject({ id: "p3", type: "point", x: 0, y: 4 });
    engine.addObject({ id: "p4", type: "point", x: 4, y: 0 });
    engine.addObject({ id: "l2", type: "line", p1Id: "p3", p2Id: "p4" });

    // Intersection
    engine.addObject({ id: "inter", type: "intersection_ll", line1Id: "l1", line2Id: "l2" });

    const inter = engine.getComputed("inter") as ComputedPoint;
    expect(inter).toBeDefined();
    expect(inter.x).toBeCloseTo(2);
    expect(inter.y).toBeCloseTo(2);
  });

  it("computes circumcircle of 3 points: A(0,0), B(2,0), C(0,2) -> center (1,1), radius sqrt(2)", () => {
    const engine = new ConstructionEngine();

    engine.addObject({ id: "A", type: "point", x: 0, y: 0 });
    engine.addObject({ id: "B", type: "point", x: 2, y: 0 });
    engine.addObject({ id: "C", type: "point", x: 0, y: 2 });
    engine.addObject({ id: "circle", type: "circle_3p", p1Id: "A", p2Id: "B", p3Id: "C" });

    const circle = engine.getComputed("circle") as ComputedCircle;
    expect(circle).toBeDefined();
    expect(circle.center.x).toBeCloseTo(1);
    expect(circle.center.y).toBeCloseTo(1);
    expect(circle.radius).toBeCloseTo(Math.SQRT2);
  });

  it("handles undefined states gracefully without NaN when lines are parallel", () => {
    const engine = new ConstructionEngine();

    // Two parallel horizontal lines: y = 0 and y = 5
    engine.addObject({ id: "p1", type: "point", x: 0, y: 0 });
    engine.addObject({ id: "p2", type: "point", x: 10, y: 0 });
    engine.addObject({ id: "l1", type: "line", p1Id: "p1", p2Id: "p2" });

    engine.addObject({ id: "p3", type: "point", x: 0, y: 5 });
    engine.addObject({ id: "p4", type: "point", x: 10, y: 5 });
    engine.addObject({ id: "l2", type: "line", p1Id: "p3", p2Id: "p4" });

    engine.addObject({ id: "inter", type: "intersection_ll", line1Id: "l1", line2Id: "l2" });

    // Intersection must be undefined, not NaN
    const inter = engine.getComputed("inter");
    expect(inter).toBeUndefined();

    // Dependent midpoint of the undefined intersection point and another point must also be undefined
    engine.addObject({ id: "p5", type: "point", x: 5, y: 5 });
    engine.addObject({ id: "depMid", type: "midpoint", p1Id: "inter", p2Id: "p5" });

    const depMid = engine.getComputed("depMid");
    expect(depMid).toBeUndefined();
  });

  it("rejects additions or edits that introduce dependency cycles", () => {
    const engine = new ConstructionEngine();

    engine.addObject({ id: "p1", type: "point", x: 1, y: 1 });
    engine.addObject({ id: "p2", type: "point", x: 3, y: 3 });
    engine.addObject({ id: "mid", type: "midpoint", p1Id: "p1", p2Id: "p2" });

    // Try to make a line between p1 and mid, then make p1 depend on mid
    engine.addObject({ id: "l1", type: "line", p1Id: "p1", p2Id: "mid" });

    // Attempting to update p1 to be a midpoint of mid and p2 should throw a cycle error
    expect(() => {
      engine.updateObject({
        id: "p1",
        type: "midpoint",
        p1Id: "mid",
        p2Id: "p2",
      } as unknown as MidpointObject);
    }).toThrow(/cycle/i);
  });

  it("calculates polygon area, perimeter and angles", () => {
    const engine = new ConstructionEngine();

    // Right triangle with vertices (0,0), (4,0), (0,3) -> area = 6, perimeter = 12, angle at (0,0) = 90 deg
    engine.addObject({ id: "O", type: "point", x: 0, y: 0 });
    engine.addObject({ id: "A", type: "point", x: 4, y: 0 });
    engine.addObject({ id: "B", type: "point", x: 0, y: 3 });

    engine.addObject({ id: "poly", type: "polygon", pointIds: ["O", "A", "B"] });
    engine.addObject({ id: "ang", type: "angle", p1Id: "A", vertexId: "O", p2Id: "B" });

    const poly = engine.getComputed("poly") as ComputedPolygon;
    expect(poly).toBeDefined();
    expect(poly.area).toBeCloseTo(6);
    expect(poly.perimeter).toBeCloseTo(12);

    const ang = engine.getComputed("ang") as ComputedAngle;
    expect(ang).toBeDefined();
    expect(ang.degrees).toBeCloseTo(90);
  });

  it("recomputes 1000 objects in < 16 ms", () => {
    const engine = new ConstructionEngine();

    // Create a base point
    engine.addObject({ id: "p0", type: "point", x: 0, y: 0 });
    engine.addObject({ id: "p_ref", type: "point", x: 100, y: 100 });

    // Create a long chain of 1000 midpoints
    for (let i = 1; i <= 1000; i++) {
      engine.addObject({
        id: `p${i}`,
        type: "midpoint",
        p1Id: `p${i - 1}`,
        p2Id: "p_ref",
      });
    }

    // Benchmark recompute on dragging p0
    const start = performance.now();
    engine.updatePoint("p0", 50, 50);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(16); // < 16ms gate (60 FPS budget)
    const p1000 = engine.getComputed("p1000") as ComputedPoint;
    expect(p1000).toBeDefined();
    expect(p1000.x).toBeCloseTo(100, 1);
  });

  it("serializes and deserializes accurately with toJSON and fromJSON", () => {
    const engine = new ConstructionEngine();

    engine.addObject({ id: "A", type: "point", x: 1, y: 2 });
    engine.addObject({ id: "B", type: "point", x: 5, y: 6 });
    engine.addObject({ id: "M", type: "midpoint", p1Id: "A", p2Id: "B" });

    const json = engine.toJSON();
    const restoredEngine = new ConstructionEngine(json);

    const mid = restoredEngine.getComputed("M") as ComputedPoint;
    expect(mid).toBeDefined();
    expect(mid.x).toBeCloseTo(3);
    expect(mid.y).toBeCloseTo(4);
  });
});
