import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TouchGestureEngine } from './touchGestureEngine';

describe('TouchGestureEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onSingleTap on 1x tap after double-tap window expires', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();
    const engine = new TouchGestureEngine({ onSingleTap, onDoubleTap });

    engine.handlePointerDown(1, 100, 120, 1000);
    engine.handlePointerUp(1, 102, 121, 1080);

    expect(onSingleTap).not.toHaveBeenCalled();
    vi.advanceTimersByTime(270);
    expect(onSingleTap).toHaveBeenCalledTimes(1);
    expect(onDoubleTap).not.toHaveBeenCalled();
  });

  it('fires onDoubleTap (and suppresses onSingleTap) on 2x tap within 300ms', () => {
    const onSingleTap = vi.fn();
    const onDoubleTap = vi.fn();
    const engine = new TouchGestureEngine({ onSingleTap, onDoubleTap });

    engine.handlePointerDown(1, 100, 120, 1000);
    engine.handlePointerUp(1, 101, 120, 1060);
    engine.handlePointerDown(1, 104, 123, 1180);
    engine.handlePointerUp(1, 104, 123, 1230);

    vi.advanceTimersByTime(350);
    expect(onDoubleTap).toHaveBeenCalledTimes(1);
    expect(onSingleTap).not.toHaveBeenCalled();
  });

  it('triggers long-press smooth drag after 200ms hold and subsequent move', () => {
    const onLongPressDragStart = vi.fn();
    const onLongPressDragMove = vi.fn();
    const onLongPressDragEnd = vi.fn();
    const engine = new TouchGestureEngine({
      onLongPressDragStart,
      onLongPressDragMove,
      onLongPressDragEnd,
    });

    engine.handlePointerDown(1, 200, 200, 1000);
    vi.advanceTimersByTime(210);
    expect(onLongPressDragStart).toHaveBeenCalledTimes(1);

    engine.handlePointerMove(1, 230, 240);
    expect(onLongPressDragMove).toHaveBeenCalledWith({ x: 230, y: 240 }, 30, 40);

    engine.handlePointerUp(1, 230, 240, 1300);
    expect(onLongPressDragEnd).toHaveBeenCalledTimes(1);
  });

  it('computes 2-finger pinch zoom scale factor and midpoint', () => {
    const onPinchZoom = vi.fn();
    const engine = new TouchGestureEngine({ onPinchZoom });

    engine.handlePointerDown(1, 100, 100, 1000);
    engine.handlePointerDown(2, 200, 100, 1010); // dist = 100, mid = (150, 100)
    expect(engine.getState()).toBe('pinching');

    engine.handlePointerMove(2, 300, 100); // dist = 200 -> scaleFactor = 2.0, mid = (200, 100)
    expect(onPinchZoom).toHaveBeenCalledTimes(1);
    const [midX, midY, scaleFactor, panDx, panDy] = onPinchZoom.mock.calls[0];
    expect(midX).toBe(200);
    expect(midY).toBe(100);
    expect(scaleFactor).toBeCloseTo(2.0, 4);
    expect(panDx).toBe(50);
    expect(panDy).toBe(0);
  });
});
