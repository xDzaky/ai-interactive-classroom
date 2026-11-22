/**
 * WhiteboardCanvas tests (P02-T03)
 * Konva requires a real canvas context; we mock react-konva components
 * so tests run in jsdom without the 'canvas' npm package.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock react-konva — replace all canvas primitives with no-op divs
// ---------------------------------------------------------------------------
vi.mock("react-konva", () => {
  const React = require("react");
  const makeEl =
    (tag: string) =>
    (props: Record<string, unknown>) =>
      React.createElement(tag, { "data-testid": props.id ?? undefined });

  return {
    Stage: ({ children, onWheel, onDragEnd, ...props }: Record<string, unknown>) =>
      React.createElement("div", { "data-testid": "konva-stage", onWheel, ...props }, children),
    Layer: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "konva-layer" }, children),
    Line: makeEl("line-mock"),
    Rect: makeEl("rect-mock"),
    Circle: makeEl("circle-mock"),
    Arrow: makeEl("arrow-mock"),
    Text: makeEl("text-mock"),
    Group: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
  };
});

// Mock konva default import
vi.mock("konva", () => ({
  default: {
    Line: class { addTo() {} },
    Rect: class { addTo() {} },
    Circle: class { addTo() {} },
    Arrow: class { addTo() {} },
  },
}));

// Mock perfect-freehand
vi.mock("perfect-freehand", () => ({
  getStroke: (points: number[][]) => points,
}));

// Now safe to import
import { WhiteboardCanvas } from "./WhiteboardCanvas";
import { createInitialBoardState } from "@ai-classroom/whiteboard-core";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WhiteboardCanvas", () => {
  const state = createInitialBoardState("room-1");
  const noop = vi.fn();

  it("renders without crashing", () => {
    const { container } = render(
      <WhiteboardCanvas boardState={state} onBoardStateChange={noop} width={400} height={300} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("shows zoom percentage indicator at 100% initially", () => {
    render(
      <WhiteboardCanvas boardState={state} onBoardStateChange={noop} width={400} height={300} />
    );
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("renders zoom in and zoom out buttons with aria-labels", () => {
    render(
      <WhiteboardCanvas boardState={state} onBoardStateChange={noop} width={400} height={300} />
    );
    expect(screen.getByLabelText("Zoom in")).toBeTruthy();
    expect(screen.getByLabelText("Zoom out")).toBeTruthy();
    expect(screen.getByLabelText("Reset zoom")).toBeTruthy();
  });

  it("zoom in button increments zoom level", () => {
    render(
      <WhiteboardCanvas boardState={state} onBoardStateChange={noop} width={400} height={300} />
    );
    const zoomIn = screen.getByLabelText("Zoom in");
    fireEvent.click(zoomIn);
    const pct = screen.getByText(/\d+%/);
    const val = parseInt(pct.textContent ?? "0", 10);
    expect(val).toBeGreaterThan(100);
  });

  it("zoom out button decrements zoom level after zoom in", () => {
    render(
      <WhiteboardCanvas boardState={state} onBoardStateChange={noop} width={400} height={300} />
    );
    fireEvent.click(screen.getByLabelText("Zoom in"));
    fireEvent.click(screen.getByLabelText("Zoom in"));
    fireEvent.click(screen.getByLabelText("Zoom out"));
    // Should be between 100% and 130%
    const val = parseInt(screen.getByText(/\d+%/).textContent ?? "0", 10);
    expect(val).toBeGreaterThan(100);
    expect(val).toBeLessThan(130);
  });

  it("reset button returns to 100%", () => {
    render(
      <WhiteboardCanvas boardState={state} onBoardStateChange={noop} width={400} height={300} />
    );
    fireEvent.click(screen.getByLabelText("Zoom in"));
    fireEvent.click(screen.getByLabelText("Zoom in"));
    fireEvent.click(screen.getByLabelText("Reset zoom"));
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("renders konva stage div", () => {
    render(
      <WhiteboardCanvas boardState={state} onBoardStateChange={noop} width={400} height={300} />
    );
    expect(screen.getByTestId("konva-stage")).toBeTruthy();
  });

  // Legacy API: onEvent prop still works for read-only views
  it("accepts legacy onEvent prop without crashing", () => {
    const { container } = render(
      <WhiteboardCanvas boardState={state} onEvent={noop} width={400} height={300} readOnly />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders math shapes (ellipse, rhombus, pentagon, hexagon, star) without error", () => {
    const stateWithShapes = {
      ...state,
      scenes: {
        ...state.scenes,
        "scene-1": {
          ...state.scenes["scene-1"],
          order: ["obj-1", "obj-2", "obj-3", "obj-4", "obj-5"],
          objects: {
            "obj-1": {
              id: "obj-1",
              object_type: "ellipse" as const,
              props: { cx: 50, cy: 50, rx: 30, ry: 20 },
              created_at: Date.now(),
              updated_at: Date.now(),
            },
            "obj-2": {
              id: "obj-2",
              object_type: "rhombus" as const,
              props: { cx: 100, cy: 100, rx: 25, ry: 35 },
              created_at: Date.now(),
              updated_at: Date.now(),
            },
            "obj-3": {
              id: "obj-3",
              object_type: "pentagon" as const,
              props: { cx: 150, cy: 150, r: 30 },
              created_at: Date.now(),
              updated_at: Date.now(),
            },
            "obj-4": {
              id: "obj-4",
              object_type: "hexagon" as const,
              props: { cx: 200, cy: 200, r: 30 },
              created_at: Date.now(),
              updated_at: Date.now(),
            },
            "obj-5": {
              id: "obj-5",
              object_type: "star" as const,
              props: { cx: 250, cy: 250, outerR: 30, innerR: 15 },
              created_at: Date.now(),
              updated_at: Date.now(),
            },
          },
        },
      },
    };

    const { container } = render(
      <WhiteboardCanvas boardState={stateWithShapes} onBoardStateChange={noop} width={400} height={300} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("accepts autoShapeMode prop without crashing", () => {
    const { rerender, container } = render(
      <WhiteboardCanvas
        boardState={state}
        onBoardStateChange={noop}
        width={400}
        height={300}
        autoShapeMode="auto"
      />
    );
    expect(container.firstChild).toBeTruthy();

    rerender(
      <WhiteboardCanvas
        boardState={state}
        onBoardStateChange={noop}
        width={400}
        height={300}
        autoShapeMode="hold"
      />
    );
    expect(container.firstChild).toBeTruthy();

    rerender(
      <WhiteboardCanvas
        boardState={state}
        onBoardStateChange={noop}
        width={400}
        height={300}
        autoShapeMode="off"
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("opens context menu on right click (onContextMenu)", () => {
    const { container } = render(
      <WhiteboardCanvas
        boardState={state}
        onBoardStateChange={noop}
        width={400}
        height={300}
        activeTool="select"
      />
    );

    const canvasRoot = container.firstChild as HTMLElement;
    fireEvent.contextMenu(canvasRoot, { clientX: 150, clientY: 150 });

    expect(screen.getByTestId("whiteboard-context-menu")).toBeInTheDocument();
  });

  it("closes context menu on Escape key", () => {
    const { container } = render(
      <WhiteboardCanvas
        boardState={state}
        onBoardStateChange={noop}
        width={400}
        height={300}
        activeTool="select"
      />
    );

    const canvasRoot = container.firstChild as HTMLElement;
    fireEvent.contextMenu(canvasRoot, { clientX: 150, clientY: 150 });
    expect(screen.getByTestId("whiteboard-context-menu")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("whiteboard-context-menu")).not.toBeInTheDocument();
  });
});
