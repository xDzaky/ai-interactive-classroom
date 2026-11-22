/**
 * GridBackground.test.tsx — P10-T04
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridBackground } from "./GridBackground";
import { ViewportController } from "@/lib/viewport";

describe("GridBackground", () => {
  it("renders grid-background container element", () => {
    const vc = new ViewportController();
    render(<GridBackground viewportController={vc} visible={true} />);
    const el = screen.getByTestId("grid-background");
    expect(el).toBeTruthy();
  });

  it("does not render when visible prop is false", () => {
    const vc = new ViewportController();
    render(<GridBackground viewportController={vc} visible={false} />);
    expect(screen.queryByTestId("grid-background")).toBeNull();
  });

  it("updates CSS variables when viewport changes", () => {
    const vc = new ViewportController();
    render(<GridBackground viewportController={vc} visible={true} />);
    const el = screen.getByTestId("grid-background");
    expect(el.style.getPropertyValue("--gs")).toBe("20px");

    // Pan & flush rAF via apply
    vc.panBy(10, 15);
    vc.apply();
    expect(el.style.getPropertyValue("--gx")).toBe("10px");
    expect(el.style.getPropertyValue("--gy")).toBe("15px");
  });
});
