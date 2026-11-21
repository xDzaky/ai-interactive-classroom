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
});
