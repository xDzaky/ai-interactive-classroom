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
});
