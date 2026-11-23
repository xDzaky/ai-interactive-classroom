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
  /** Optional DOM root containing WebGL 3D overlay canvases to composite onto the PNG */
  overlayRoot?: HTMLElement | null;
}

/**
 * Export the Konva stage to PNG and trigger browser download.
 * Composites any live WebGL overlay canvases (e.g. 3D solids) when overlayRoot is provided.
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
    overlayRoot,
  } = options;

  // Reset view transform temporarily for clean export
  const prevX = stage.x();
  const prevY = stage.y();
  const prevScaleX = stage.scaleX();
  const prevScaleY = stage.scaleY();

  stage.x(0).y(0).scaleX(1).scaleY(1);

  let dataUrl = stage.toDataURL({ pixelRatio, mimeType, quality });

  // Restore view
  stage.x(prevX).y(prevY).scaleX(prevScaleX).scaleY(prevScaleY);

  // Composite WebGL 3D overlay canvases if present (P12-T06)
  if (overlayRoot && typeof document !== "undefined") {
    const webglCanvases = overlayRoot.querySelectorAll("canvas");
    if (webglCanvases.length > 0 && typeof stage.container === "function") {
      try {
        const stageRect = stage.container().getBoundingClientRect();
        const composite = document.createElement("canvas");
        composite.width = Math.max(1, Math.round(stage.width() * pixelRatio));
        composite.height = Math.max(1, Math.round(stage.height() * pixelRatio));
        const ctx = composite.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, composite.width, composite.height);
          const stageCanvas = stage.toCanvas({ pixelRatio });
          ctx.drawImage(stageCanvas, 0, 0);
          webglCanvases.forEach((wc) => {
            const r = wc.getBoundingClientRect();
            const dx = (r.left - stageRect.left) * pixelRatio;
            const dy = (r.top - stageRect.top) * pixelRatio;
            const dw = r.width * pixelRatio;
            const dh = r.height * pixelRatio;
            if (dw > 0 && dh > 0) {
              ctx.drawImage(wc, dx, dy, dw, dh);
            }
          });
          dataUrl = composite.toDataURL(mimeType, quality);
        }
      } catch {
        // Fallback to plain stage dataUrl if WebGL preserveDrawingBuffer is unavailable
      }
    }
  }

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
