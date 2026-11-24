import { describe, it, expect } from 'vitest';
import {
  generateSketchyRectPaths,
  generateHachureSegments,
  computeSmartSnapGuides,
  findNearestBindTarget,
  computeBoundArrowEndpoints,
  computeAlignedDeltas,
  computeDistributedDeltas,
  parseMermaidToDiagram,
  exportBasicSceneToSvg,
} from './excalidrawEngine';

describe('V6 Excalidraw Core Engine', () => {
  it('generates deterministic seeded sketchy paths (zero flicker) and hachure/cross-hatch fills', () => {
    const p1 = generateSketchyRectPaths(10, 20, 120, 80, 1, 'obj-abc');
    const p2 = generateSketchyRectPaths(10, 20, 120, 80, 1, 'obj-abc');
    expect(p1).toEqual(p2);
    expect(p1.length).toBe(8); // 2 passes * 4 edges

    const clean = generateSketchyRectPaths(10, 20, 120, 80, 0, 'obj-abc');
    expect(clean.length).toBe(4); // 1 crisp pass

    const hachure = generateHachureSegments(0, 0, 100, 60, 'hachure', 10);
    const cross = generateHachureSegments(0, 0, 100, 60, 'cross-hatch', 10);
    expect(hachure.length).toBeGreaterThan(5);
    expect(cross.length).toBe(hachure.length * 2);
  });

  it('computes smart alignment snap guides within 6px threshold', () => {
    const moving = { id: 'a', x: 103, y: 200, w: 80, h: 50 };
    const target = { id: 'b', x: 100, y: 40, w: 80, h: 50 };
    const res = computeSmartSnapGuides(moving, [target], 6);
    expect(res.snappedX).toBe(100);
    expect(res.guides.some((g) => g.orientation === 'v' && g.pos === 100)).toBe(true);
  });

  it('binds arrows to nearest shape anchor and computes clean boundary endpoints', () => {
    const boxA = { id: 'A', x: 100, y: 100, w: 120, h: 60 };
    const boxB = { id: 'B', x: 320, y: 100, w: 120, h: 60 };
    const near = findNearestBindTarget({ x: 225, y: 132 }, [boxA, boxB], 28);
    expect(near?.targetId).toBe('A');
    expect(near?.side).toBe('right');

    const ep = computeBoundArrowEndpoints(boxA, boxB, 6);
    expect(ep.x1).toBe(226);
    expect(ep.x2).toBe(314);
    expect(ep.y1).toBe(130);
    expect(ep.y2).toBe(130);
  });

  it('aligns and distributes multiple selected shapes accurately', () => {
    const boxes = [
      { id: '1', x: 10, y: 20, w: 40, h: 40 },
      { id: '2', x: 70, y: 50, w: 40, h: 40 },
      { id: '3', x: 210, y: 80, w: 40, h: 40 },
    ];
    const aligned = computeAlignedDeltas(boxes, 'left');
    expect(aligned['2'].dx).toBe(-60);
    expect(aligned['3'].dx).toBe(-200);

    const dist = computeDistributedDeltas(boxes, 'horizontal');
    // Middle box should move to x = 110 (equal 60px gaps)
    expect(dist['2'].dx).toBe(40);
  });

  it('parses Mermaid flowchart into positioned rect, diamond, ellipse & bound arrows', () => {
    const res = parseMermaidToDiagram(`
      flowchart TD
        A[Mulai Belajar] --> B{Paham Materi?}
        B -->|Ya| C((Lanjut Kuis))
        B -->|Belum| D[Ulangi Contoh]
    `);
    expect(res.direction).toBe('TD');
    expect(res.nodes.length).toBe(4);
    expect(res.nodes.find((n) => n.id === 'A')?.shape).toBe('rect');
    expect(res.nodes.find((n) => n.id === 'B')?.shape).toBe('rhombus');
    expect(res.nodes.find((n) => n.id === 'C')?.shape).toBe('ellipse');
    expect(res.edges.length).toBe(3);
    expect(res.edges[1].label).toBe('Ya');
  });

  it('exports valid vector SVG markup', () => {
    const svg = exportBasicSceneToSvg([
      { type: 'rect', x: 10, y: 10, w: 100, h: 60, stroke: '#1e1e1e', fill: '#a5d8ff' },
      { type: 'text', x: 20, y: 30, text: 'Halo Excalidraw' },
    ]);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('<rect x="10"');
    expect(svg).toContain('Halo Excalidraw');
  });
});
