/**
 * pptxExporter.ts — Browser-Native Whiteboard -> .PPTX Exporter (V8)
 *
 * Adapted from Seewo EasiNote 5 (`EasiNote.OfficeDocumentConverter.exe`):
 * Uses `pptxgenjs` to generate standard 16:9 OOXML .pptx slides with editable text,
 * vector shapes, and optional high-DPI canvas snapshot layer.
 */
import PptxGenJS from 'pptxgenjs';
import type { BoardState } from '@ai-classroom/whiteboard-core';

export async function exportBoardStateToPptx(
  boardState: BoardState,
  stageDataUrl?: string | null,
  filename = 'ai-classroom-materi.pptx',
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'AI Interactive Classroom';
  pptx.title = 'Materi Papan Tulis Interaktif';

  const scenes = Object.values(boardState.scenes);
  const scaleX = 10 / 1280;
  const scaleY = 5.625 / 720;

  scenes.forEach((scene, idx) => {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };

    if (idx === 0 && stageDataUrl) {
      slide.addImage({
        data: stageDataUrl,
        x: 0,
        y: 0,
        w: 10,
        h: 5.625,
      });
    }

    for (const objId of scene.order ?? []) {
      const obj = scene.objects[objId];
      if (!obj) continue;
      const p = obj.props as Record<string, unknown>;
      const x = Math.max(0.1, Math.min(9.2, Number(p.x ?? p.cx ?? 100) * scaleX));
      const y = Math.max(0.1, Math.min(5.0, Number(p.y ?? p.cy ?? 80) * scaleY));
      const w = Math.max(0.8, Math.min(9.5 - x, Number(p.w ?? p.width ?? 220) * scaleX));
      const h = Math.max(0.4, Math.min(5.4 - y, Number(p.h ?? p.height ?? 100) * scaleY));

      if (obj.object_type === 'text' || obj.object_type === 'math_block') {
        const text = String(p.text ?? p.latex ?? p.label ?? '');
        if (text) {
          slide.addText(text, {
            x,
            y,
            w,
            h,
            fontSize: Math.max(12, Math.min(32, Number(p.fontSize ?? 18))),
            color: '0F172A',
            bold: obj.object_type === 'math_block',
          });
        }
      } else if (obj.object_type === 'rect') {
        slide.addShape(pptx.ShapeType.rect, {
          x,
          y,
          w,
          h,
          line: { color: String(p.stroke ?? '1E293B').replace('#', ''), width: 1.5 },
          fill: p.fill && p.fill !== 'transparent' ? { color: String(p.fill).replace('#', '') } : undefined,
        });
      } else if (obj.object_type === 'circle' || obj.object_type === 'ellipse') {
        slide.addShape(pptx.ShapeType.ellipse, {
          x,
          y,
          w,
          h,
          line: { color: String(p.stroke ?? '1E293B').replace('#', ''), width: 1.5 },
        });
      }
    }
  });

  await pptx.writeFile({ fileName: filename });
}
