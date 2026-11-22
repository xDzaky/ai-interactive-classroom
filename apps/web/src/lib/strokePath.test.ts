/**
 * strokePath.test.ts — P10-T06
 */
import { describe, it, expect } from "vitest";
import { reducePoints, getCachedStrokePoints } from "./strokePath";
import type { BoardStroke } from "@ai-classroom/whiteboard-core";

describe("reducePoints", () => {
  it("straight 1000-pt line collapses to <= 3 points", () => {
    const points: [number, number, number][] = [];
    for (let i = 0; i < 1000; i++) {
      // Points along y = 2x
      const x = i * 0.5;
      const y = i * 1.0;
      const p = 0.5;
      points.push([x, y, p]);
    }

    const reduced = reducePoints(points);
    expect(reduced.length).toBeLessThanOrEqual(3);
    expect(reduced[0]).toEqual(points[0]);
    expect(reduced[reduced.length - 1]).toEqual(points[points.length - 1]);
  });

  it("circle keeps >= 20 points", () => {
    const points: [number, number, number][] = [];
    const count = 300;
    const radius = 100;
    for (let i = 0; i <= count; i++) {
      const theta = (i / count) * 2 * Math.PI;
      const x = 200 + radius * Math.cos(theta);
      const y = 200 + radius * Math.sin(theta);
      points.push([x, y, 0.6]);
    }

    const reduced = reducePoints(points);
    expect(reduced.length).toBeGreaterThanOrEqual(20);
    expect(reduced.length).toBeLessThan(count);
  });

  it("preserves start and end point and pressure alignment", () => {
    const points: [number, number, number][] = [
      [10, 10, 0.2],
      [10.1, 10.1, 0.3], // should filter out by distance
      [50, 100, 0.8],
      [100, 200, 0.5],
    ];

    const reduced = reducePoints(points);
    expect(reduced[0]).toEqual([10, 10, 0.2]);
    expect(reduced[reduced.length - 1]).toEqual([100, 200, 0.5]);
    // Pressure is retained in 3rd component
    for (const pt of reduced) {
      expect(pt.length).toBe(3);
      expect(pt[2]).toBeGreaterThanOrEqual(0);
    }
  });

  it("enforces hard cap of 400 points", () => {
    const points: [number, number, number][] = [];
    for (let i = 0; i < 1000; i++) {
      // High frequency zigzag
      points.push([i * 2, (i % 2 === 0 ? 0 : 50), 0.5]);
    }
    const reduced = reducePoints(points, { maxPoints: 400 });
    expect(reduced.length).toBeLessThanOrEqual(400);
  });
});

describe("getCachedStrokePoints", () => {
  it("computes outline and caches result via WeakMap", () => {
    const stroke: BoardStroke = {
      id: "s1",
      points: [
        [0, 0, 0.5],
        [10, 10, 0.5],
        [20, 20, 0.5],
      ],
      color: "#ffffff",
      width: 4,
      tool: "pen",
    };

    const out1 = getCachedStrokePoints(stroke);
    expect(out1.length).toBeGreaterThan(0);

    const out2 = getCachedStrokePoints(stroke);
    // Identity equality: must return the exact same cached reference!
    expect(out2).toBe(out1);
  });
});
