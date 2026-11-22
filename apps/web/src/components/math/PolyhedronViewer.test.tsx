import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PolyhedronViewer } from "./PolyhedronViewer";
import { buildPolyhedron } from "@ai-classroom/geometry-core";

// Mock @react-three/fiber and @react-three/drei
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
  useThree: () => ({ camera: {}, gl: {}, scene: {} }),
}));

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="r3f-html">{children}</div>
  ),
}));

describe("PolyhedronViewer Component (P11-T04 / P11-T05)", () => {
  const cube = buildPolyhedron("cube", { side: 4 });

  it("renders without crashing", () => {
    const { container } = render(<PolyhedronViewer polyhedron={cube} />);
    expect(screen.getByTestId("polyhedron-viewer")).toBeTruthy();
    expect(screen.getByText(/Kubus ABCD\.EFGH/)).toBeTruthy();
    expect(container.firstChild).toBeTruthy();
  });

  it("renders vertex labels for cube (A through H)", () => {
    render(<PolyhedronViewer polyhedron={cube} />);
    const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("displays cross-section info card when 3 vertices are selected", () => {
    // Select A, C, H on cube
    render(<PolyhedronViewer polyhedron={cube} selectedVertices={["A", "C", "H"]} />);
    expect(screen.getByTestId("section-info-card")).toBeTruthy();
    expect(screen.getByText(/Bidang Irisan: A - C - H/)).toBeTruthy();
    expect(screen.getByText(/Luas:/)).toBeTruthy();
  });
});
