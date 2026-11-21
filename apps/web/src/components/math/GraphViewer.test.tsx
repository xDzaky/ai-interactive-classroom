import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock mafs — heavy canvas/SVG lib; replace with simple divs
vi.mock("mafs", () => ({
  Mafs: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "mafs-canvas" }, children),
  Coordinates: {
    Cartesian: () => React.createElement("div", { "data-testid": "mafs-cartesian" }),
    Polar: () => null,
  },
  Plot: {
    OfX: ({ y, color }: { y: (x: number) => number; color: string }) =>
      React.createElement("div", {
        "data-testid": "plot-ofx",
        "data-color": color,
        "data-sample": String(y(0)),
      }),
    OfY: () => null,
    Parametric: () => null,
    VectorField: () => null,
    Inequality: () => null,
  },
}));

// Mock mafs CSS imports
vi.mock("mafs/core.css", () => ({}));

// Mock @ai-classroom/math-core
vi.mock("@ai-classroom/math-core", () => ({
  safeEvaluate: (expr: string, scope: Record<string, number> = {}) => {
    // Simple stubs for testing
    if (expr === "sin(x)") return Math.sin(scope["x"] ?? 0);
    if (expr === "x^2") return Math.pow(scope["x"] ?? 0, 2);
    if (expr === "2+2") return 4;
    if (expr === "") throw new (class ParseError extends Error { constructor() { super("Empty expression"); } })();
    return 0;
  },
  ParseError: class ParseError extends Error {
    constructor(message = "parse error") { super(message); this.name = "ParseError"; }
  },
  EvaluationError: class EvaluationError extends Error {
    constructor(message = "eval error") { super(message); this.name = "EvaluationError"; }
  },
}));

// ─── Import under test ────────────────────────────────────────────────────────

import { GraphViewer, type ExpressionEntry } from "./GraphViewer.js";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GraphViewer — uncontrolled (default state)", () => {
  it("renders the main container", () => {
    render(React.createElement(GraphViewer));
    expect(screen.getByTestId("graph-viewer")).toBeTruthy();
  });

  it("renders Mafs canvas", () => {
    render(React.createElement(GraphViewer));
    expect(screen.getByTestId("mafs-canvas")).toBeTruthy();
  });

  it("renders expression panel", () => {
    render(React.createElement(GraphViewer));
    expect(screen.getByTestId("expression-panel")).toBeTruthy();
  });

  it("starts with one default expression (sin(x))", () => {
    render(React.createElement(GraphViewer));
    const inputs = screen.getAllByLabelText("Expression");
    expect(inputs.length).toBe(1);
    expect((inputs[0] as HTMLInputElement).value).toBe("sin(x)");
  });

  it("renders Plot.OfX for default expression", () => {
    render(React.createElement(GraphViewer));
    expect(screen.getAllByTestId("plot-ofx").length).toBeGreaterThan(0);
  });

  it("'Add expression' button is present", () => {
    render(React.createElement(GraphViewer));
    expect(screen.getByTestId("add-expression-btn")).toBeTruthy();
  });

  it("clicking 'Add expression' adds a new row", () => {
    render(React.createElement(GraphViewer));
    act(() => {
      fireEvent.click(screen.getByTestId("add-expression-btn"));
    });
    expect(screen.getAllByLabelText("Expression").length).toBe(2);
  });

  it("removing the first expression reduces count", () => {
    render(React.createElement(GraphViewer));
    act(() => {
      fireEvent.click(screen.getByTestId("add-expression-btn"));
    });
    const removeButtons = screen.getAllByLabelText("Remove expression");
    act(() => {
      fireEvent.click(removeButtons[0]);
    });
    expect(screen.getAllByLabelText("Expression").length).toBe(1);
  });

  it("toggling visibility changes button aria-label", () => {
    render(React.createElement(GraphViewer));
    const toggle = screen.getByLabelText("Hide expression");
    act(() => {
      fireEvent.click(toggle);
    });
    expect(screen.getByLabelText("Show expression")).toBeTruthy();
  });

  it("changing expression input updates the value", () => {
    render(React.createElement(GraphViewer));
    const input = screen.getByLabelText("Expression") as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "x^2" } });
    });
    expect(input.value).toBe("x^2");
  });
});

describe("GraphViewer — controlled mode", () => {
  const makeEntry = (id: string, expr: string): ExpressionEntry => ({
    id,
    expr,
    color: "#e63946",
    visible: true,
  });

  it("renders externally supplied expressions", () => {
    const entries = [makeEntry("e1", "2+2"), makeEntry("e2", "x^2")];
    render(
      React.createElement(GraphViewer, {
        controlled: true,
        expressions: entries,
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        onChange: vi.fn(),
      })
    );
    const inputs = screen.getAllByLabelText("Expression");
    expect(inputs.length).toBe(2);
  });

  it("calls onAdd when Add button clicked", () => {
    const onAdd = vi.fn();
    render(
      React.createElement(GraphViewer, {
        controlled: true,
        expressions: [],
        onAdd,
        onRemove: vi.fn(),
        onChange: vi.fn(),
      })
    );
    act(() => {
      fireEvent.click(screen.getByTestId("add-expression-btn"));
    });
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it("calls onRemove with correct id when remove clicked", () => {
    const onRemove = vi.fn();
    const entries = [makeEntry("e1", "sin(x)")];
    render(
      React.createElement(GraphViewer, {
        controlled: true,
        expressions: entries,
        onAdd: vi.fn(),
        onRemove,
        onChange: vi.fn(),
      })
    );
    act(() => {
      fireEvent.click(screen.getByLabelText("Remove expression"));
    });
    expect(onRemove).toHaveBeenCalledWith("e1");
  });

  it("calls onChange when expression input changes", () => {
    const onChange = vi.fn();
    const entries = [makeEntry("e1", "sin(x)")];
    render(
      React.createElement(GraphViewer, {
        controlled: true,
        expressions: entries,
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        onChange,
      })
    );
    act(() => {
      fireEvent.change(screen.getByLabelText("Expression"), { target: { value: "x^2" } });
    });
    expect(onChange).toHaveBeenCalledWith("e1", { expr: "x^2" });
  });

  it("calls onChange with { visible: false } when hide clicked", () => {
    const onChange = vi.fn();
    const entries = [makeEntry("e1", "sin(x)")];
    render(
      React.createElement(GraphViewer, {
        controlled: true,
        expressions: entries,
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        onChange,
      })
    );
    act(() => {
      fireEvent.click(screen.getByLabelText("Hide expression"));
    });
    expect(onChange).toHaveBeenCalledWith("e1", { visible: false });
  });

  it("hides Plot.OfX for invisible entries", () => {
    const entries = [{ ...makeEntry("e1", "sin(x)"), visible: false }];
    render(
      React.createElement(GraphViewer, {
        controlled: true,
        expressions: entries,
        onAdd: vi.fn(),
        onRemove: vi.fn(),
        onChange: vi.fn(),
      })
    );
    // No plot rendered for hidden entry
    expect(screen.queryAllByTestId("plot-ofx").length).toBe(0);
  });
});
