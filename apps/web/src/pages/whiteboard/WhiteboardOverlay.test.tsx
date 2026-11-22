import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ViewportController } from "@/lib/viewport";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../components/math/SolidViewer.js", () => ({
  SolidViewer: ({ params }: { params: { type?: string } }) =>
    React.createElement("div", { "data-testid": "solid-viewer-mock", "data-solid": params?.type ?? "" }),
}));

vi.mock("../../components/math/GraphViewer.js", () => ({
  GraphViewer: () => React.createElement("div", { "data-testid": "graph-viewer-mock" }),
}));

vi.mock("mafs/core.css", () => ({}));

// ─── Import under test ────────────────────────────────────────────────────────

import { WhiteboardOverlay } from "./WhiteboardOverlay.js";
import type { WhiteboardOverlayProps } from "./WhiteboardOverlay.js";
import { createInitialBoardState } from "@ai-classroom/whiteboard-core";

// ─── Test helpers ─────────────────────────────────────────────────────────────

const DEFAULT_VIEW = { x: 0, y: 0, scale: 1 };

function makeProps(override?: Partial<WhiteboardOverlayProps>): WhiteboardOverlayProps {
  const bs = createInitialBoardState("room-1");
  return {
    boardState: bs,
    view: DEFAULT_VIEW,
    width: 800,
    height: 600,
    ...override,
  };
}

/** Add a viz_solid object to boardState's active scene */
function addVizSolid(
  props: WhiteboardOverlayProps,
  id: string,
  overrideProps: Record<string, unknown> = {}
): WhiteboardOverlayProps {
  const bs = props.boardState;
  const sceneId = bs.active_scene_id;
  const scene = bs.scenes[sceneId];
  const now = Date.now();
  return {
    ...props,
    boardState: {
      ...bs,
      scenes: {
        ...bs.scenes,
        [sceneId]: {
          ...scene,
          objects: {
            ...scene.objects,
            [id]: {
              id,
              object_type: "viz_solid",
              props: { solid_type: "cube", params: {}, x: 100, y: 100, ...overrideProps },
              created_at: now,
              updated_at: now,
            },
          },
          order: [...(scene.order ?? []), id],
        },
      },
    },
  };
}

function addVizGraph(
  props: WhiteboardOverlayProps,
  id: string,
  expressions: string[] = ["sin(x)"]
): WhiteboardOverlayProps {
  const bs = props.boardState;
  const sceneId = bs.active_scene_id;
  const scene = bs.scenes[sceneId];
  const now = Date.now();
  return {
    ...props,
    boardState: {
      ...bs,
      scenes: {
        ...bs.scenes,
        [sceneId]: {
          ...scene,
          objects: {
            ...scene.objects,
            [id]: {
              id,
              object_type: "viz_graph",
              props: { expressions, x: 200, y: 50 },
              created_at: now,
              updated_at: now,
            },
          },
          order: [...(scene.order ?? []), id],
        },
      },
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WhiteboardOverlay", () => {
  it("returns null when no viz objects exist", () => {
    const { container } = render(React.createElement(WhiteboardOverlay, makeProps()));
    expect(container.firstChild).toBeNull();
  });

  it("renders overlay container when viz objects exist", () => {
    const props = addVizSolid(makeProps(), "s1");
    render(React.createElement(WhiteboardOverlay, props));
    expect(screen.getByTestId("whiteboard-overlay")).toBeTruthy();
  });

  it("renders viz-solid overlay div for viz_solid object", () => {
    const props = addVizSolid(makeProps(), "s1");
    render(React.createElement(WhiteboardOverlay, props));
    expect(screen.getByTestId("viz-solid-s1")).toBeTruthy();
  });

  it("renders SolidViewer inside viz-solid overlay", () => {
    const props = addVizSolid(makeProps(), "s1");
    render(React.createElement(WhiteboardOverlay, props));
    expect(screen.getByTestId("solid-viewer-mock")).toBeTruthy();
  });

  it("passes solid_type from props to SolidViewer", () => {
    const props = addVizSolid(makeProps(), "s1", { solid_type: "sphere", params: {} });
    render(React.createElement(WhiteboardOverlay, props));
    expect(screen.getByTestId("solid-viewer-mock").getAttribute("data-solid")).toBe("sphere");
  });

  it("renders viz-graph overlay div for viz_graph object", () => {
    const props = addVizGraph(makeProps(), "g1");
    render(React.createElement(WhiteboardOverlay, props));
    expect(screen.getByTestId("viz-graph-g1")).toBeTruthy();
  });

  it("renders GraphViewer inside viz-graph overlay", () => {
    const props = addVizGraph(makeProps(), "g1");
    render(React.createElement(WhiteboardOverlay, props));
    expect(screen.getByTestId("graph-viewer-mock")).toBeTruthy();
  });

  it("renders both solid and graph overlays together", () => {
    let props = addVizSolid(makeProps(), "s1");
    props = addVizGraph(props, "g1");
    render(React.createElement(WhiteboardOverlay, props));
    expect(screen.getByTestId("viz-solid-s1")).toBeTruthy();
    expect(screen.getByTestId("viz-graph-g1")).toBeTruthy();
  });

  it("positions overlay at top:0 left:0 with correct width/height", () => {
    const props = addVizSolid(makeProps(), "s1");
    render(React.createElement(WhiteboardOverlay, props));
    const overlay = screen.getByTestId("whiteboard-overlay");
    expect(overlay.style.width).toBe("800px");
    expect(overlay.style.height).toBe("600px");
  });

  it("scales widget size with view.scale", () => {
    const props = addVizSolid(makeProps({ view: { x: 0, y: 0, scale: 2 }, defaultWidgetSize: 100 }), "s1");
    render(React.createElement(WhiteboardOverlay, props));
    const solidDiv = screen.getByTestId("viz-solid-s1");
    // At scale=2, widgetSize=100 → width=200px
    expect(solidDiv.style.width).toBe("200px");
  });

  it("translates world position to screen position with view offset", () => {
    // Object at world (100, 100), view offset (50, 50), scale 1
    const view = { x: 50, y: 50, scale: 1 };
    const props = addVizSolid(makeProps({ view }), "s1", { x: 100, y: 100 });
    render(React.createElement(WhiteboardOverlay, props));
    const solidDiv = screen.getByTestId("viz-solid-s1");
    // sx = 100*1 + 50 = 150, sy = 100*1 + 50 = 150
    expect(solidDiv.style.left).toBe("150px");
    expect(solidDiv.style.top).toBe("150px");
  });

  it("limits active live 3D canvases to at most 3", () => {
    let props = addVizSolid(makeProps(), "s1", { x: 0, y: 0 });
    props = addVizSolid(props, "s2", { x: 100, y: 0 });
    props = addVizSolid(props, "s3", { x: 200, y: 0 });
    props = addVizSolid(props, "s4", { x: 300, y: 0 });

    render(React.createElement(WhiteboardOverlay, props));

    // First 3 should be live SolidViewers
    expect(screen.queryByTestId("viz-solid-placeholder-s1")).toBeNull();
    expect(screen.queryByTestId("viz-solid-placeholder-s2")).toBeNull();
    expect(screen.queryByTestId("viz-solid-placeholder-s3")).toBeNull();
    // 4th should be inactive placeholder
    const p4 = screen.getByTestId("viz-solid-placeholder-s4");
    expect(p4).toBeTruthy();

    // Clicking placeholder activates s4
    fireEvent.click(p4);
    // Now s4 is active, and s1 is deactivated (max 3 kept)
    expect(screen.queryByTestId("viz-solid-placeholder-s4")).toBeNull();
    expect(screen.getByTestId("viz-solid-placeholder-s1")).toBeTruthy();
  });

  it("updates overlay position imperatively via ViewportController", () => {
    const vc = new ViewportController({ initial: { x: 10, y: 20, scale: 1 } });
    const props = addVizSolid(makeProps({ viewportController: vc }), "s1", { x: 50, y: 50 });

    render(React.createElement(WhiteboardOverlay, props));
    const solidDiv = screen.getByTestId("viz-solid-s1");
    // Initial: 50*1 + 10 = 60, 50*1 + 20 = 70
    expect(solidDiv.style.left).toBe("60px");
    expect(solidDiv.style.top).toBe("70px");

    // Pan viewport imperatively
    vc.panBy(40, 30);
    vc.apply();

    // New: 50*1 + 50 = 100, 50*1 + 50 = 100
    expect(solidDiv.style.left).toBe("100px");
    expect(solidDiv.style.top).toBe("100px");
  });

  it("unmounts live canvas when solid is far outside viewport (>800px margin)", () => {
    // Solid placed at x=4000, y=4000 (well outside 800x600 viewport + 800px margin)
    const props = addVizSolid(makeProps(), "s-far", { x: 4000, y: 4000 });
    render(React.createElement(WhiteboardOverlay, props));

    expect(screen.getByTestId("viz-solid-placeholder-s-far")).toBeTruthy();
  });
});
