/**
 * exportPng.ts — P02-T08, P10-T04
 * Export the active Konva stage to a PNG file download.
 * Pure function: takes a Konva Stage ref and triggers browser download.
 *
 * Note (P10-T04): The grid is rendered as a CSS background behind the Konva stage,
 * so exported PNG images do not include the grid lines or dots (clean artboard export).
 */
import type Konva from "konva";

export interface ExportPngOptions {
  filename?: string;
  /** Scale factor for export (default 2 = 2x resolution) */
  pixelRatio?: number;
  /** Export only the active scene bounding box; if false, export full stage */
  mimeType?: "image/png" | "image/jpeg";
  quality?: number;
}

/**
 * Export the Konva stage to PNG and trigger browser download.
 * Returns a data URL string (for testing), or null if stage unavailable.
 */
export function exportStageToPng(
  stage: Konva.Stage | null,
  options: ExportPngOptions = {}
): string | null {
  if (!stage) return null;

  const {
    filename = "whiteboard.png",
    pixelRatio = 2,
    mimeType = "image/png",
    quality = 1,
  } = options;

  // Reset view transform temporarily for clean export
  const prevX = stage.x();
  const prevY = stage.y();
  const prevScaleX = stage.scaleX();
  const prevScaleY = stage.scaleY();

  stage.x(0).y(0).scaleX(1).scaleY(1);

  const dataUrl = stage.toDataURL({ pixelRatio, mimeType, quality });

  // Restore view
  stage.x(prevX).y(prevY).scaleX(prevScaleX).scaleY(prevScaleY);

  // Trigger download
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();

  return dataUrl;
}

/**
 * Export stage as a Blob (for testing or upload scenarios).
 */
export function exportStageToBlob(
  stage: Konva.Stage | null,
  callback: (blob: Blob | null) => void,
  options: ExportPngOptions = {}
): void {
  if (!stage) {
    callback(null);
    return;
  }

  const { pixelRatio = 2, mimeType = "image/png", quality = 1 } = options;

  const prevX = stage.x();
  const prevY = stage.y();
  const prevScaleX = stage.scaleX();
  const prevScaleY = stage.scaleY();

  stage.x(0).y(0).scaleX(1).scaleY(1);

  stage.toBlob({
    pixelRatio,
    mimeType,
    quality,
    callback: (blob) => {
      stage.x(prevX).y(prevY).scaleX(prevScaleX).scaleY(prevScaleY);
      callback(blob);
    },
  });
}
