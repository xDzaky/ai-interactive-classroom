/**
 * ViewportController tests (P10-T03)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ViewportController } from "./viewport";

describe("ViewportController", () => {
  it("initializes with default state or provided options", () => {
    const vc = new ViewportController();
    expect(vc.getState()).toEqual({ scale: 1, x: 0, y: 0 });

    const vc2 = new ViewportController({
      initial: { scale: 1.5, x: 50, y: -30 },
      minScale: 0.2,
      maxScale: 5,
    });
    expect(vc2.getState()).toEqual({ scale: 1.5, x: 50, y: -30 });
  });

  it("satisfies the zoom invariant: world point under cursor stays fixed", () => {
    // Vector specified in P10-T03:
    // scale 1, pos (0,0), zoomAt(100,50,2) → scale 2, pos (−100,−50)
    const vc = new ViewportController({
      initial: { scale: 1, x: 0, y: 0 },
    });

    const screenX = 100;
    const screenY = 50;
    const worldBefore = vc.toWorld(screenX, screenY);
    expect(worldBefore).toEqual({ x: 100, y: 50 });

    vc.zoomAt(screenX, screenY, 2);
    vc.apply(); // flush immediately

    const stateAfter = vc.getState();
    expect(stateAfter.scale).toBe(2);
    expect(stateAfter.x).toBe(-100);
    expect(stateAfter.y).toBe(-50);

    const worldAfter = vc.toWorld(screenX, screenY);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 6);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 6);
  });

  it("clamps scale within minScale and maxScale bounds", () => {
    const vc = new ViewportController({
      minScale: 0.1,
      maxScale: 8.0,
      initial: { scale: 1, x: 0, y: 0 },
    });

    // Zoom out aggressively
    vc.zoomAt(200, 200, 0.01);
    vc.apply();
    expect(vc.getState().scale).toBe(0.1);

    // Zoom in aggressively
    vc.zoomAt(200, 200, 200);
    vc.apply();
    expect(vc.getState().scale).toBe(8.0);
  });

  it("pans correctly with panBy", () => {
    const vc = new ViewportController();
    vc.panBy(25, -40);
    vc.apply();
    expect(vc.getState()).toEqual({ scale: 1, x: 25, y: -40 });

    vc.panBy(-10, 15);
    vc.apply();
    expect(vc.getState()).toEqual({ scale: 1, x: 15, y: -25 });
  });

  it("notifies subscribers when viewport changes", () => {
    const vc = new ViewportController();
    const subscriber = vi.fn();
    const unsub = vc.subscribe(subscriber);

    // Initial notification upon subscribe
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith({ scale: 1, x: 0, y: 0 });

    vc.panBy(50, 50);
    vc.apply();
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith({ scale: 1, x: 50, y: 50 });

    unsub();
    vc.panBy(10, 10);
    vc.apply();
    expect(subscriber).toHaveBeenCalledTimes(2);
  });

  it("synchronizes attached Konva stage imperatively", () => {
    const vc = new ViewportController();
    const mockStage = {
      scale: vi.fn(),
      position: vi.fn(),
      batchDraw: vi.fn(),
    } as any;

    vc.attachStage(mockStage);
    expect(mockStage.scale).toHaveBeenCalledWith({ x: 1, y: 1 });
    expect(mockStage.position).toHaveBeenCalledWith({ x: 0, y: 0 });
    expect(mockStage.batchDraw).toHaveBeenCalled();

    mockStage.scale.mockClear();
    mockStage.position.mockClear();
    mockStage.batchDraw.mockClear();

    vc.zoomAt(150, 150, 1.5);
    vc.apply();

    expect(mockStage.scale).toHaveBeenCalledWith({ x: 1.5, y: 1.5 });
    expect(mockStage.position).toHaveBeenCalled();
    expect(mockStage.batchDraw).toHaveBeenCalled();
  });

  it("registers nodes and toggles visibility via culling when count > 200", () => {
    const vc = new ViewportController();
    const mockStage = {
      scale: vi.fn(),
      position: vi.fn(),
      batchDraw: vi.fn(),
      width: () => 1000,
      height: () => 800,
    } as any;
    vc.attachStage(mockStage);

    // Register 201 nodes: 200 in-view, 1 far away
    const farNode = {
      _visible: true,
      visible: function (v?: boolean) {
        if (typeof v === "boolean") this._visible = v;
        return this._visible;
      },
    } as any;
    const inViewNode = {
      _visible: true,
      visible: function (v?: boolean) {
        if (typeof v === "boolean") this._visible = v;
        return this._visible;
      },
    } as any;

    for (let i = 0; i < 200; i++) {
      vc.registerNode(`node-${i}`, { ...inViewNode }, { x: 50, y: 50, w: 10, h: 10 });
    }
    vc.registerNode("far-node", farNode, { x: 50000, y: 50000, w: 50, h: 50 });
    expect(vc.getRegisteredNodeCount()).toBe(201);

    vc.apply();
    // farNode should be culled
    expect(farNode.visible()).toBe(false);

    // If node count drops <= 200, all nodes should become visible
    vc.registerNode("far-node", null);
    expect(vc.getRegisteredNodeCount()).toBe(200);
    farNode.visible(false);
    vc.registerNode("far-node-2", farNode, { x: 50000, y: 50000, w: 50, h: 50 });
    // Remove one to bring to 200
    vc.registerNode("node-0", null);
    expect(vc.getRegisteredNodeCount()).toBe(200);
    vc.apply();
    expect(farNode.visible()).toBe(true);
  });

  it("caches bbox in WeakMap", () => {
    const vc = new ViewportController();
    const dummyObj = { id: "test" };
    const compute = vi.fn(() => ({ x: 10, y: 20, w: 30, h: 40 }));

    const bbox1 = vc.getCachedBbox(dummyObj, compute);
    expect(bbox1).toEqual({ x: 10, y: 20, w: 30, h: 40 });
    expect(compute).toHaveBeenCalledTimes(1);

    const bbox2 = vc.getCachedBbox(dummyObj, compute);
    expect(bbox2).toBe(bbox1);
    expect(compute).toHaveBeenCalledTimes(1); // Cached, not recomputed!
  });
});
