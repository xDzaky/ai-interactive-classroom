import { describe, expect, it } from "vitest";
import { executeCanvasMcpTool, McpCanvasToolRegistry } from "./index.js";

describe("packages/canvas-mcp — Seewo EasiNote MCP Bridge (V8)", () => {
  const sampleScene = {
    order: ["r1", "m1"],
    objects: {
      r1: { id: "r1", object_type: "rect", props: { x: 100, y: 80, w: 200, h: 120, label: "Persegi" } },
      m1: { id: "m1", object_type: "math_block", props: { x: 320, y: 120, latex: "y = sin(x)" } },
    },
  };

  it("inspects active whiteboard scene deterministically", () => {
    const res = executeCanvasMcpTool("canvas.inspect_scene", {}, sampleScene);
    expect(res.ok).toBe(true);
    const data = res.data as { count: number; items: Array<{ id: string; latex?: string }> };
    expect(data.count).toBe(2);
    expect(data.items[1].latex).toBe("y = sin(x)");
  });

  it("creates and updates elements wrapped in an atomic undo batch", () => {
    const created = executeCanvasMcpTool(
      "canvas.upsert_element",
      { objectType: "viz_solid", props: { solid_type: "cube", x: 200, y: 150, w: 320, h: 320 } },
      sampleScene,
    );
    expect(created.ok).toBe(true);
    expect(created.batchEvent?.event_type).toBe("batch");

    const updated = executeCanvasMcpTool(
      "canvas.upsert_element",
      { id: "r1", objectType: "rect", props: { stroke: "#dc2626" } },
      sampleScene,
    );
    expect(updated.ok).toBe(true);
    const evs = (updated.batchEvent?.payload.events as Array<{ event_type: string }>) ?? [];
    expect(evs[0].event_type).toBe("object.updated");
  });

  it("applies layout alignment and delta cleanly", () => {
    const res = executeCanvasMcpTool(
      "canvas.apply_layout_delta",
      { ids: ["r1", "m1"], dx: 20, dy: 10, align: "left" },
      sampleScene,
    );
    expect(res.ok).toBe(true);
    const evs = (res.batchEvent?.payload.events as Array<{ payload: { props_patch: { x: number } } }>) ?? [];
    expect(evs[0].payload.props_patch.x).toBe(120);
    expect(evs[1].payload.props_patch.x).toBe(120);
  });

  it("validates 7 classroom gamification activities with Zod", () => {
    const ok = executeCanvasMcpTool(
      "canvas.create_activity",
      {
        activityKind: "group_competition",
        title: "Adu Cepat Bangun Ruang",
        items: [{ q: "Volume kubus s=3?", answer: "27" }],
      },
      sampleScene,
    );
    expect(ok.ok).toBe(true);

    const invalid = executeCanvasMcpTool(
      "canvas.create_activity",
      { activityKind: "unknown_game", title: "", items: [] },
      sampleScene,
    );
    expect(invalid.ok).toBe(false);
    expect(Object.keys(McpCanvasToolRegistry)).toHaveLength(7);
  });

  it("creates V9 smart_table and subject_helper via MCP tools", () => {
    const tbl = executeCanvasMcpTool(
      "canvas.create_smart_table",
      {
        presetMode: "stat_grouped",
        title: "Nilai Matematika 40 Siswa",
      },
      sampleScene,
    );
    expect(tbl.ok).toBe(true);
    expect(tbl.batchEvent?.event_type).toBe("batch");

    const hlp = executeCanvasMcpTool(
      "canvas.create_subject_helper",
      {
        helperKind: "horner_scheme",
        title: "Skema Horner Polinomial",
        config: { k: 2, coeffs: [1, -3, 2, -5] },
      },
      sampleScene,
    );
    expect(hlp.ok).toBe(true);
  });
});
