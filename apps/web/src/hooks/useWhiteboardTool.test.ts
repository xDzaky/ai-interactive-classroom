/**
 * useWhiteboardTool tests (P02-T04)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWhiteboardTool } from "./useWhiteboardTool";

// Mock perfect-freehand (not needed for hook unit tests)
vi.mock("perfect-freehand", () => ({ getStroke: (p: unknown[]) => p }));

const ROOM = "room-1";
const ACTOR = "user-1";
const pt = (x: number, y: number, pressure = 0.5) => ({ x, y, pressure });
const makeSeq = () => ({ current: 0 });

describe("useWhiteboardTool — initial state", () => {
  it("defaults to pen tool", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    expect(result.current.toolState.activeTool).toBe("pen");
  });

  it("setTool changes active tool", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("select"));
    expect(result.current.toolState.activeTool).toBe("select");
  });

  it("setColor updates color", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setColor("#ff0000"));
    expect(result.current.toolState.color).toBe("#ff0000");
  });

  it("setStrokeWidth updates width", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setStrokeWidth(8));
    expect(result.current.toolState.strokeWidth).toBe(8);
  });
});

describe("useWhiteboardTool — pen tool", () => {
  it("emits stroke.committed on pointerUp", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    // Ensure pen is active
    act(() => result.current.setTool("pen"));
    act(() => result.current.onPointerDown(pt(0, 0), ROOM, ACTOR));
    act(() => result.current.onPointerMove(pt(10, 10), ROOM, ACTOR));
    act(() => result.current.onPointerMove(pt(20, 20), ROOM, ACTOR));
    let committed: ReturnType<typeof result.current.onPointerUp>;
    act(() => { committed = result.current.onPointerUp(pt(30, 30), ROOM, ACTOR); });
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "stroke.committed" })
    );
    expect(committed!).not.toBeNull();
    expect(committed!.event_type).toBe("stroke.committed");
  });

  it("stroke payload has correct tool and color", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("pen"));
    act(() => result.current.setColor("#0000ff"));
    act(() => result.current.onPointerDown(pt(0, 0), ROOM, ACTOR));
    act(() => result.current.onPointerMove(pt(5, 5), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(10, 10), ROOM, ACTOR));
    const payload = onEvent.mock.calls[0][0].payload;
    expect(payload.color).toBe("#0000ff");
    expect(payload.tool).toBe("pen");
  });
});

describe("useWhiteboardTool — highlighter", () => {
  it("emits stroke.committed with tool=highlighter", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("highlighter"));
    act(() => result.current.onPointerDown(pt(0, 0), ROOM, ACTOR));
    act(() => result.current.onPointerMove(pt(10, 10), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(20, 20), ROOM, ACTOR));
    const payload = onEvent.mock.calls[0][0].payload;
    expect(payload.tool).toBe("highlighter");
  });
});

describe("useWhiteboardTool — eraser", () => {
  it("emits stroke.committed with tool=eraser and white color", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("eraser"));
    act(() => result.current.onPointerDown(pt(0, 0), ROOM, ACTOR));
    act(() => result.current.onPointerMove(pt(10, 0), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(20, 0), ROOM, ACTOR));
    const payload = onEvent.mock.calls[0][0].payload;
    expect(payload.tool).toBe("eraser");
    expect(payload.color).toBe("#ffffff");
  });
});

describe("useWhiteboardTool — line tool", () => {
  it("emits object.created with line type", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("line"));
    act(() => result.current.onPointerDown(pt(0, 0), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(100, 50), ROOM, ACTOR));
    const ev = onEvent.mock.calls[0][0];
    expect(ev.event_type).toBe("object.created");
    expect(ev.payload.object_type).toBe("line");
    expect(ev.payload.props.x2).toBe(100);
    expect(ev.payload.props.y2).toBe(50);
  });
});

describe("useWhiteboardTool — rect tool", () => {
  it("emits object.created with rect and normalized dimensions", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("rect"));
    act(() => result.current.onPointerDown(pt(100, 100), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(200, 150), ROOM, ACTOR));
    const payload = onEvent.mock.calls[0][0].payload;
    expect(payload.object_type).toBe("rect");
    expect(payload.props.x).toBe(100);
    expect(payload.props.w).toBe(100);
    expect(payload.props.h).toBe(50);
  });

  it("handles reverse drag (start > end)", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("rect"));
    act(() => result.current.onPointerDown(pt(200, 200), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(100, 100), ROOM, ACTOR));
    const payload = onEvent.mock.calls[0][0].payload;
    expect(payload.props.x).toBe(100);
    expect(payload.props.y).toBe(100);
    expect(payload.props.w).toBe(100);
  });
});

describe("useWhiteboardTool — circle tool", () => {
  it("emits object.created with circle type", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("circle"));
    act(() => result.current.onPointerDown(pt(0, 0), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(100, 0), ROOM, ACTOR));
    const payload = onEvent.mock.calls[0][0].payload;
    expect(payload.object_type).toBe("circle");
    expect(payload.props.r).toBeGreaterThan(0);
  });
});

describe("useWhiteboardTool — text tool", () => {
  it("emits object.created with text type", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("text"));
    act(() => result.current.onPointerDown(pt(50, 80), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(50, 80), ROOM, ACTOR));
    const payload = onEvent.mock.calls[0][0].payload;
    expect(payload.object_type).toBe("text");
    expect(payload.props.x).toBe(50);
    expect(payload.props.y).toBe(80);
    expect(payload.props.text).toBe("");
  });
});

describe("useWhiteboardTool — select tool", () => {
  it("select tool does not emit on pointerUp", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.setTool("select"));
    act(() => result.current.onPointerDown(pt(10, 10), ROOM, ACTOR));
    act(() => result.current.onPointerUp(pt(20, 20), ROOM, ACTOR));
    // select doesn't emit on pointerUp — only cursor events on move
    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ event_type: expect.stringMatching(/^(stroke|object)/) })
    );
  });
});

describe("useWhiteboardTool — pointer move while not drawing", () => {
  it("emits device.pointer.moved when not drawing", () => {
    const onEvent = vi.fn();
    const { result } = renderHook(() => useWhiteboardTool(onEvent, makeSeq()));
    act(() => result.current.onPointerMove(pt(5, 5), ROOM, ACTOR));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "device.pointer.moved" })
    );
  });
});
