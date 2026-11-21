/**
 * exportPng.test.ts — P02-T08
 */
import { describe, it, expect, vi } from "vitest";
import type Konva from "konva";
import { exportStageToPng, exportStageToBlob } from "./exportPng";

// Typed mock stage (non-null)
interface MockStage {
  x: ReturnType<typeof vi.fn>;
  y: ReturnType<typeof vi.fn>;
  scaleX: ReturnType<typeof vi.fn>;
  scaleY: ReturnType<typeof vi.fn>;
  toDataURL: ReturnType<typeof vi.fn>;
  toBlob: ReturnType<typeof vi.fn>;
}

function makeStage(dataUrl = "data:image/png;base64,abc123"): MockStage {
  const stage: MockStage = {
    x: vi.fn().mockReturnThis(),
    y: vi.fn().mockReturnThis(),
    scaleX: vi.fn().mockReturnThis(),
    scaleY: vi.fn().mockReturnThis(),
    toDataURL: vi.fn().mockReturnValue(dataUrl),
    toBlob: vi.fn(),
  };
  stage.x.mockImplementation((...args: unknown[]) => args.length ? stage : 0);
  stage.y.mockImplementation((...args: unknown[]) => args.length ? stage : 0);
  stage.scaleX.mockImplementation((...args: unknown[]) => args.length ? stage : 1);
  stage.scaleY.mockImplementation((...args: unknown[]) => args.length ? stage : 1);
  return stage;
}

// Mock createElement + click for download
const mockClick = vi.fn();
vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
  if (tag === "a") {
    return { download: "", href: "", click: mockClick } as unknown as HTMLElement;
  }
  return document.createElement.bind(document)(tag as "a");
});

describe("exportStageToPng", () => {
  it("returns null when stage is null", () => {
    expect(exportStageToPng(null)).toBeNull();
  });

  it("calls stage.toDataURL and returns data URL", () => {
    const stage = makeStage("data:image/png;base64,TEST");
    const result = exportStageToPng(stage as unknown as Parameters<typeof exportStageToPng>[0], { filename: "test.png" });
    expect(result).toBe("data:image/png;base64,TEST");
    expect(stage.toDataURL).toHaveBeenCalled();
  });

  it("resets stage position and scale before export", () => {
    const stage = makeStage();
    exportStageToPng(stage as unknown as Parameters<typeof exportStageToPng>[0]);
    expect(stage.x).toHaveBeenCalledWith(0);
    expect(stage.y).toHaveBeenCalledWith(0);
    expect(stage.scaleX).toHaveBeenCalledWith(1);
    expect(stage.scaleY).toHaveBeenCalledWith(1);
  });

  it("triggers browser download link click", () => {
    const stage = makeStage();
    exportStageToPng(stage as unknown as Parameters<typeof exportStageToPng>[0], { filename: "board.png" });
    expect(mockClick).toHaveBeenCalled();
  });
});

describe("exportStageToBlob", () => {
  it("calls callback with null when stage is null", () => {
    const cb = vi.fn();
    exportStageToBlob(null, cb);
    expect(cb).toHaveBeenCalledWith(null);
  });

  it("calls stage.toBlob with pixelRatio option", () => {
    const stage = makeStage();
    const cb = vi.fn();
    exportStageToBlob(stage as unknown as Parameters<typeof exportStageToPng>[0], cb, { pixelRatio: 3 });
    expect(stage.toBlob).toHaveBeenCalledWith(
      expect.objectContaining({ pixelRatio: 3 })
    );
  });
});
