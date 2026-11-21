/**
 * ToolBar + ShapePropertiesPanel tests (P02-T05)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToolBar, ShapePropertiesPanel } from "./ToolBar";

describe("ToolBar", () => {
  const defaults = {
    activeTool: "pen" as const,
    color: "#111827",
    strokeWidth: 3,
    onToolChange: vi.fn(),
    onColorChange: vi.fn(),
    onStrokeWidthChange: vi.fn(),
  };

  it("renders with toolbar role", () => {
    render(<ToolBar {...defaults} />);
    expect(screen.getByRole("toolbar")).toBeTruthy();
  });

  it("active tool button has aria-pressed=true", () => {
    render(<ToolBar {...defaults} activeTool="pen" />);
    const btn = screen.getByLabelText("Pena");
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("non-active tool has aria-pressed=false", () => {
    render(<ToolBar {...defaults} activeTool="pen" />);
    const btn = screen.getByLabelText("Kotak");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking a tool calls onToolChange", () => {
    const onToolChange = vi.fn();
    render(<ToolBar {...defaults} onToolChange={onToolChange} />);
    fireEvent.click(screen.getByLabelText("Kotak"));
    expect(onToolChange).toHaveBeenCalledWith("rect");
  });

  it("undo button is disabled when canUndo=false", () => {
    render(<ToolBar {...defaults} canUndo={false} />);
    const btn = screen.getByLabelText("Batalkan");
    expect(btn).toBeDisabled();
  });

  it("undo button enabled when canUndo=true", () => {
    const onUndo = vi.fn();
    render(<ToolBar {...defaults} canUndo onUndo={onUndo} />);
    const btn = screen.getByLabelText("Batalkan");
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onUndo).toHaveBeenCalled();
  });

  it("export button appears when onExportPng is provided", () => {
    render(<ToolBar {...defaults} onExportPng={vi.fn()} />);
    expect(screen.getByLabelText("Ekspor PNG")).toBeTruthy();
  });
});

describe("ShapePropertiesPanel", () => {
  it("returns null when objectType is null", () => {
    const { container } = render(
      <ShapePropertiesPanel
        objectType={null}
        values={{}}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog for rect", () => {
    render(
      <ShapePropertiesPanel
        objectType="rect"
        values={{ x: 10, y: 20, w: 100, h: 50 }}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByLabelText("Lebar")).toBeTruthy();
    expect(screen.getByLabelText("Tinggi")).toBeTruthy();
  });

  it("calls onChange when a numeric field changes", () => {
    const onChange = vi.fn();
    render(
      <ShapePropertiesPanel
        objectType="rect"
        values={{ x: 10, y: 20, w: 100, h: 50 }}
        onChange={onChange}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText("X"), { target: { value: "50" } });
    expect(onChange).toHaveBeenCalledWith({ x: 50 });
  });

  it("calls onClose when × button clicked", () => {
    const onClose = vi.fn();
    render(
      <ShapePropertiesPanel
        objectType="circle"
        values={{ x: 0, y: 0, r: 40 }}
        onChange={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText("Tutup panel properti"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows radius field for circle, not width/height", () => {
    render(
      <ShapePropertiesPanel
        objectType="circle"
        values={{ x: 0, y: 0, r: 40 }}
        onChange={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText("Radius")).toBeTruthy();
    expect(screen.queryByLabelText("Lebar")).toBeNull();
  });
});
