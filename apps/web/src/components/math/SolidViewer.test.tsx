/**
 * SolidViewer tests (P03-T03)
 * R3F canvas is mocked — tests UI structure, panel, and WebGL fallback.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock R3F and drei — no WebGL in jsdom
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: React.ReactNode; [k: string]: unknown }) =>
    <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Environment: () => null,
  Grid: () => null,
}));
vi.mock("three", () => {
  const Plane = class { set = vi.fn(); };
  const Vector3 = class { constructor(public x=0,public y=0,public z=0){} };
  const MeshStandardMaterial = class { };
  const DoubleSide = 2;
  return { Plane, Vector3, MeshStandardMaterial, DoubleSide };
});
vi.mock("@/lib/threeGeometry", () => ({
  buildThreeGeometry: () => ({
    geometry: {},
    boundingBox: {},
    dimensions: { width: 4, height: 4, depth: 4 },
  }),
}));

import { SolidViewer } from "./SolidViewer";

const CUBE = { type: "cube" as const, s: 3 };

describe("SolidViewer", () => {
  it("renders canvas container", () => {
    render(<SolidViewer params={CUBE} />);
    expect(screen.getByTestId("r3f-canvas")).toBeTruthy();
  });

  it("renders clip and wireframe toggle buttons", () => {
    render(<SolidViewer params={CUBE} />);
    expect(screen.getByLabelText(/bidang potong/i)).toBeTruthy();
    expect(screen.getByLabelText(/wireframe/i)).toBeTruthy();
  });

  it("clip button toggles aria-pressed", () => {
    render(<SolidViewer params={CUBE} />);
    const btn = screen.getByLabelText("Aktifkan bidang potong");
    expect(btn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(btn);
    expect(screen.getByLabelText("Matikan bidang potong").getAttribute("aria-pressed")).toBe("true");
  });

  it("wireframe button toggles", () => {
    render(<SolidViewer params={CUBE} />);
    const btn = screen.getByLabelText("Mode wireframe");
    fireEvent.click(btn);
    expect(screen.getByLabelText("Mode solid")).toBeTruthy();
  });

  it("shows parameter panel by default", () => {
    render(<SolidViewer params={CUBE} />);
    expect(screen.getByLabelText("Sisi (s)")).toBeTruthy();
  });

  it("hides panel when showPanel=false", () => {
    render(<SolidViewer params={CUBE} showPanel={false} />);
    expect(screen.queryByLabelText("Sisi (s)")).toBeNull();
  });

  it("shows formula section", () => {
    render(<SolidViewer params={CUBE} />);
    expect(screen.getByText("Rumus")).toBeTruthy();
  });

  it("calls onParamsChange when slider changes", () => {
    const onChange = vi.fn();
    render(<SolidViewer params={CUBE} onParamsChange={onChange} />);
    const slider = screen.getByLabelText("Sisi (s)");
    fireEvent.change(slider, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: "cube", s: 5 }));
  });
});
