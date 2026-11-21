/**
 * usePointerEvents tests (P02-T06)
 * Tests pure logic: world-space conversion, palm rejection, pinch state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePointerEvents } from "./usePointerEvents";
import type { ViewTransform } from "./usePointerEvents";

// ---------------------------------------------------------------------------
// Helpers to build fake PointerEvents
// ---------------------------------------------------------------------------

function makePointerEvent(overrides: Partial<React.PointerEvent> = {}): React.PointerEvent {
  return {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    pressure: 0.5,
    pointerType: "mouse",
    button: 0,
    buttons: 1,
    nativeEvent: { clientX: 100, clientY: 100 } as PointerEvent,
    currentTarget: {
      setPointerCapture: vi.fn(),
    } as unknown as EventTarget,
    ...overrides,
  } as unknown as React.PointerEvent;
}

const DEFAULT_VIEW: ViewTransform = { x: 0, y: 0, scale: 1 };

describe("usePointerEvents — basic setup", () => {
  it("returns four handler functions", () => {
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart: vi.fn(),
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      })
    );
    expect(typeof result.current.onPointerDown).toBe("function");
    expect(typeof result.current.onPointerMove).toBe("function");
    expect(typeof result.current.onPointerUp).toBe("function");
    expect(typeof result.current.onPointerCancel).toBe("function");
  });
});

describe("usePointerEvents — mouse drawing", () => {
  it("calls onDrawStart on mouse left-button down", () => {
    const onDrawStart = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart,
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      })
    );
    act(() => result.current.onPointerDown(makePointerEvent({ pointerType: "mouse", button: 0 })));
    expect(onDrawStart).toHaveBeenCalledWith(
      expect.objectContaining({ x: 100, y: 100 }),
      "mouse"
    );
  });

  it("calls onDrawMove during move while drawing", () => {
    const onDrawMove = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart: vi.fn(),
        onDrawMove,
        onDrawEnd: vi.fn(),
      })
    );
    act(() => result.current.onPointerDown(makePointerEvent({ button: 0 })));
    act(() => result.current.onPointerMove(makePointerEvent({ clientX: 150, clientY: 200, nativeEvent: { clientX: 150, clientY: 200 } as PointerEvent })));
    expect(onDrawMove).toHaveBeenCalled();
  });

  it("calls onDrawEnd on pointer up", () => {
    const onDrawEnd = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart: vi.fn(),
        onDrawMove: vi.fn(),
        onDrawEnd,
      })
    );
    act(() => result.current.onPointerDown(makePointerEvent({ button: 0 })));
    act(() => result.current.onPointerUp(makePointerEvent({ clientX: 200, clientY: 200, nativeEvent: { clientX: 200, clientY: 200 } as PointerEvent })));
    expect(onDrawEnd).toHaveBeenCalled();
  });

  it("does not draw when readOnly=true", () => {
    const onDrawStart = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart,
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
        readOnly: true,
      })
    );
    act(() => result.current.onPointerDown(makePointerEvent({ button: 0 })));
    expect(onDrawStart).not.toHaveBeenCalled();
  });

  it("middle mouse button does not start drawing", () => {
    const onDrawStart = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart,
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      })
    );
    act(() => result.current.onPointerDown(makePointerEvent({ button: 1 })));
    expect(onDrawStart).not.toHaveBeenCalled();
  });
});

describe("usePointerEvents — world-space transform", () => {
  it("applies view offset to screen coordinates", () => {
    const onDrawStart = vi.fn();
    const view: ViewTransform = { x: 50, y: 100, scale: 1 };
    const { result } = renderHook(() =>
      usePointerEvents({
        view,
        onViewChange: vi.fn(),
        onDrawStart,
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      })
    );
    act(() =>
      result.current.onPointerDown(
        makePointerEvent({ clientX: 150, clientY: 200, nativeEvent: { clientX: 150, clientY: 200 } as PointerEvent })
      )
    );
    expect(onDrawStart).toHaveBeenCalledWith(
      expect.objectContaining({ x: 100, y: 100 }), // 150-50=100, 200-100=100
      "mouse"
    );
  });

  it("applies scale to world coordinates", () => {
    const onDrawStart = vi.fn();
    const view: ViewTransform = { x: 0, y: 0, scale: 2 };
    const { result } = renderHook(() =>
      usePointerEvents({
        view,
        onViewChange: vi.fn(),
        onDrawStart,
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      })
    );
    act(() =>
      result.current.onPointerDown(
        makePointerEvent({ clientX: 100, clientY: 100, nativeEvent: { clientX: 100, clientY: 100 } as PointerEvent })
      )
    );
    expect(onDrawStart).toHaveBeenCalledWith(
      expect.objectContaining({ x: 50, y: 50 }), // 100/2=50
      "mouse"
    );
  });
});

describe("usePointerEvents — pen drawing", () => {
  it("calls onDrawStart with 'pen' type for stylus", () => {
    const onDrawStart = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart,
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      })
    );
    act(() =>
      result.current.onPointerDown(makePointerEvent({ pointerType: "pen", button: 0 }))
    );
    expect(onDrawStart).toHaveBeenCalledWith(expect.anything(), "pen");
  });
});

describe("usePointerEvents — palm rejection", () => {
  it("ignores touch event within cooldown after pen contact", () => {
    const onDrawStart = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart,
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      })
    );
    // Pen down sets rejection timer
    act(() =>
      result.current.onPointerDown(makePointerEvent({ pointerId: 1, pointerType: "pen", button: 0 }))
    );
    // Immediately after: touch should be rejected
    act(() =>
      result.current.onPointerDown(
        makePointerEvent({ pointerId: 2, pointerType: "touch", button: 0 })
      )
    );
    // onDrawStart called once (pen) but not again for touch
    expect(onDrawStart).toHaveBeenCalledTimes(1);
  });
});

describe("usePointerEvents — pointer cancel", () => {
  it("cancelling clears drawing state", () => {
    const onDrawEnd = vi.fn();
    const { result } = renderHook(() =>
      usePointerEvents({
        view: DEFAULT_VIEW,
        onViewChange: vi.fn(),
        onDrawStart: vi.fn(),
        onDrawMove: vi.fn(),
        onDrawEnd,
      })
    );
    act(() => result.current.onPointerDown(makePointerEvent({ button: 0 })));
    act(() => result.current.onPointerCancel(makePointerEvent()));
    // After cancel, another up should not emit draw end
    act(() => result.current.onPointerUp(makePointerEvent()));
    expect(onDrawEnd).not.toHaveBeenCalled();
  });
});
