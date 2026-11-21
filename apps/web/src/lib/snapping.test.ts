/**
 * snapping.test.ts — P02-T05
 */
import { describe, it, expect } from "vitest";
import { snapToGrid, snapSize, constrainToAxis, snapToAnchors } from "./snapping";

describe("snapToGrid", () => {
  it("snaps to nearest grid cell", () => {
    expect(snapToGrid({ x: 42, y: 61 }, 40)).toEqual({ x: 40, y: 80 });
  });
  it("already-on-grid point stays", () => {
    expect(snapToGrid({ x: 80, y: 120 }, 40)).toEqual({ x: 80, y: 120 });
  });
  it("midpoint rounds to nearest", () => {
    // 20 is exactly half of 40 — rounds to 0 (round half-to-even or half-up)
    const result = snapToGrid({ x: 20, y: 20 }, 40);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });
  it("negative coordinates snap correctly", () => {
    const result = snapToGrid({ x: -15, y: -25 }, 40);
    expect(result.x === 0 || result.x === -0).toBe(true); // -15 rounds to 0 or -0
    expect(result.y).toBe(-40);
  });
});

describe("snapSize", () => {
  it("rounds up to minimum grid size", () => {
    expect(snapSize(10, 10, 40)).toEqual({ w: 40, h: 40 });
  });
  it("rounds to nearest grid multiple", () => {
    expect(snapSize(55, 85, 40)).toEqual({ w: 40, h: 80 });
  });
});

describe("constrainToAxis", () => {
  it("horizontal drag stays horizontal", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 5 }; // nearly horizontal
    const result = constrainToAxis(start, end);
    expect(result.y).toBe(start.y);
    expect(result.x).toBe(end.x);
  });
  it("vertical drag stays vertical", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 3, y: 100 }; // nearly vertical
    const result = constrainToAxis(start, end);
    expect(result.x).toBe(start.x);
    expect(result.y).toBe(end.y);
  });
  it("45-degree drag stays diagonal", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 90 }; // near-diagonal
    const result = constrainToAxis(start, end);
    expect(Math.abs(result.x)).toBe(Math.abs(result.y));
  });
});

describe("snapToAnchors", () => {
  const anchors = [
    { x: 100, y: 100, kind: "corner" as const },
    { x: 200, y: 200, kind: "center" as const },
  ];

  it("snaps to nearby anchor", () => {
    const result = snapToAnchors({ x: 105, y: 95 }, anchors, 15);
    expect(result).toEqual({ x: 100, y: 100, kind: "corner" });
  });

  it("returns original point when no anchor in range", () => {
    const pt = { x: 500, y: 500 };
    const result = snapToAnchors(pt, anchors, 10);
    expect(result).toBe(pt);
  });

  it("snaps to closest anchor when multiple in range", () => {
    const closeAnchors = [
      { x: 10, y: 10, kind: "corner" as const },
      { x: 15, y: 10, kind: "edge" as const },
    ];
    const result = snapToAnchors({ x: 11, y: 10 }, closeAnchors, 20);
    // result may be an AnchorPoint (with kind) or a plain Point
    const kind = (result as { kind?: string }).kind;
    expect(kind).toBe("corner");
  });
});
