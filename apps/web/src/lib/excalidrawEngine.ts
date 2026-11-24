/**
 * excalidrawEngine.ts — Zero-Dependency Excalidraw Core Engine (V6)
 * Shared by BOTH /whiteboard and /notes!
 *
 * Implements:
 * 1. Deterministic seeded hand-drawn Roughness (0=Arsitek, 1=Seniman, 2=Kartun) & Hachure/Cross-Hatch fills
 * 2. Smart Alignment Guides & Grid Snapping
 * 3. Smart Arrow-to-Shape Binding (anchor perimeter calculation)
 * 4. Multi-element Align (L/C/R/T/M/B) & Distribute (H/V)
 * 5. Mermaid Flowchart -> Editable Canvas Elements Parser (zero eval)
 * 6. Vector SVG & JSON Scene (.excalidraw.json) Export/Import
 */

export type FillStyleKind = 'hachure' | 'cross-hatch' | 'solid';
export type StrokeStyleKind = 'solid' | 'dashed' | 'dotted';
export type RoughnessLevel = 0 | 1 | 2;
export type RoundnessKind = 'sharp' | 'round';
export type ArrowheadKind = 'none' | 'arrow' | 'triangle' | 'dot' | 'bar';
export type FontFamilyKind = 'hand' | 'sans' | 'mono';
export type TextAlignKind = 'left' | 'center' | 'right';

export interface ExcalidrawStyleState {
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyleKind;
  strokeWidth: number;
  strokeStyle: StrokeStyleKind;
  roughness: RoughnessLevel;
  roundness: RoundnessKind;
  opacity: number; // 0..100
  startArrowhead: ArrowheadKind;
  endArrowhead: ArrowheadKind;
  fontFamily: FontFamilyKind;
  fontSize: number;
  textAlign: TextAlignKind;
}

export const DEFAULT_EXCALIDRAW_STYLE: ExcalidrawStyleState = {
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  roundness: 'round',
  opacity: 100,
  startArrowhead: 'none',
  endArrowhead: 'arrow',
  fontFamily: 'hand',
  fontSize: 20,
  textAlign: 'left',
};

export const EXCALIDRAW_STROKE_COLORS = [
  '#1e1e1e',
  '#e03131',
  '#2f9e44',
  '#1971c2',
  '#f08c00',
  '#6741d9',
];

export const EXCALIDRAW_BG_COLORS = [
  'transparent',
  '#ffc9c9',
  '#b2f2bb',
  '#a5d8ff',
  '#ffec99',
  '#d0bfff',
];

export function resolveFontFamilyCss(family: FontFamilyKind): string {
  if (family === 'hand') return '"Segoe Print", "Comic Sans MS", "Bradley Hand", cursive';
  if (family === 'mono') return '"JetBrains Mono", "Fira Code", ui-monospace, monospace';
  return 'Inter, system-ui, -apple-system, sans-serif';
}

export function getStrokeDashArray(style: StrokeStyleKind, strokeWidth: number): number[] {
  if (style === 'dashed') return [Math.max(8, strokeWidth * 3.2), Math.max(6, strokeWidth * 2.4)];
  if (style === 'dotted') return [Math.max(1.5, strokeWidth * 0.7), Math.max(5, strokeWidth * 2.2)];
  return [];
}

// ---------------------------------------------------------------------------
// 1. Seeded PRNG & Hand-Drawn Roughness Engine (deterministic per element id)
// ---------------------------------------------------------------------------

export function hashSeed(id: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a single hand-drawn wobbly line (returns flat [x0,y0, x1,y1, ...] points) */
export function generateSketchyLinePoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  roughness: RoughnessLevel,
  seed: number,
): number[] {
  if (roughness === 0) return [x1, y1, x2, y2];
  const rand = mulberry32(seed);
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 2) return [x1, y1, x2, y2];
  const maxOffset = Math.min(roughness * 2.1, len * 0.035 + roughness * 0.9);
  const jitter = () => (rand() - 0.5) * 2 * maxOffset;

  const mx1 = x1 + (x2 - x1) * 0.33 + jitter();
  const my1 = y1 + (y2 - y1) * 0.33 + jitter();
  const mx2 = x1 + (x2 - x1) * 0.67 + jitter();
  const my2 = y1 + (y2 - y1) * 0.67 + jitter();
  return [
    x1 + jitter() * 0.4,
    y1 + jitter() * 0.4,
    mx1,
    my1,
    mx2,
    my2,
    x2 + jitter() * 0.4,
    y2 + jitter() * 0.4,
  ];
}

/** Generate Excalidraw-style double-pass sketchy rectangle strokes */
export function generateSketchyRectPaths(
  x: number,
  y: number,
  w: number,
  h: number,
  roughness: RoughnessLevel,
  seedStr: string,
): number[][] {
  const seed = hashSeed(seedStr);
  const passes = roughness === 0 ? 1 : 2;
  const out: number[][] = [];
  for (let p = 0; p < passes; p++) {
    const s = seed + p * 997;
    const top = generateSketchyLinePoints(x, y, x + w, y, roughness, s + 1);
    const right = generateSketchyLinePoints(x + w, y, x + w, y + h, roughness, s + 2);
    const bottom = generateSketchyLinePoints(x + w, y + h, x, y + h, roughness, s + 3);
    const left = generateSketchyLinePoints(x, y + h, x, y, roughness, s + 4);
    out.push(top, right, bottom, left);
  }
  return out;
}

/** Generate Excalidraw-style double-pass sketchy diamond strokes */
export function generateSketchyDiamondPaths(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  roughness: RoughnessLevel,
  seedStr: string,
): number[][] {
  const seed = hashSeed(seedStr);
  const passes = roughness === 0 ? 1 : 2;
  const pts: Array<[number, number]> = [
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
  ];
  const out: number[][] = [];
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < 4; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 4];
      out.push(generateSketchyLinePoints(a[0], a[1], b[0], b[1], roughness, seed + p * 997 + i * 13));
    }
  }
  return out;
}

/** Generate Excalidraw-style double-pass sketchy ellipse loop */
export function generateSketchyEllipsePaths(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  roughness: RoughnessLevel,
  seedStr: string,
): number[][] {
  const seed = hashSeed(seedStr);
  const passes = roughness === 0 ? 1 : 2;
  const steps = 32;
  const out: number[][] = [];
  for (let p = 0; p < passes; p++) {
    const rand = mulberry32(seed + p * 1013);
    const flat: number[] = [];
    const jScale = roughness * 1.4;
    for (let i = 0; i <= steps + (roughness > 0 ? 1 : 0); i++) {
      const a = (i / steps) * Math.PI * 2;
      const jx = roughness > 0 ? (rand() - 0.5) * jScale : 0;
      const jy = roughness > 0 ? (rand() - 0.5) * jScale : 0;
      flat.push(cx + rx * Math.cos(a) + jx, cy + ry * Math.sin(a) + jy);
    }
    out.push(flat);
  }
  return out;
}

/** Generate diagonal hachure or cross-hatch fill line segments inside a bounding box */
export function generateHachureSegments(
  x: number,
  y: number,
  w: number,
  h: number,
  fillStyle: FillStyleKind,
  gap = 10,
): Array<[number, number, number, number]> {
  if (fillStyle === 'solid' || w <= 2 || h <= 2) return [];
  const segs: Array<[number, number, number, number]> = [];
  const step = Math.max(6, gap);

  // 45° diagonal lines: x + y = c
  for (let d = step; d < w + h; d += step) {
    const x1 = x + Math.max(0, d - h);
    const y1 = y + Math.min(h, d);
    const x2 = x + Math.min(w, d);
    const y2 = y + Math.max(0, d - w);
    segs.push([x1, y1, x2, y2]);
  }

  if (fillStyle === 'cross-hatch') {
    // -45° opposite diagonal lines
    for (let d = step; d < w + h; d += step) {
      const x1 = x + Math.max(0, d - h);
      const y1 = y + h - Math.min(h, d);
      const x2 = x + Math.min(w, d);
      const y2 = y + h - Math.max(0, d - w);
      segs.push([x1, y1, x2, y2]);
    }
  }
  return segs;
}

// ---------------------------------------------------------------------------
// 2. Smart Alignment Guides & Grid Snap
// ---------------------------------------------------------------------------

export interface RectBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapGuideLine {
  orientation: 'v' | 'h';
  pos: number;
  start: number;
  end: number;
}

export function snapToGrid(val: number, gridSize = 20): number {
  return Math.round(val / gridSize) * gridSize;
}

export function computeSmartSnapGuides(
  moving: RectBox,
  others: RectBox[],
  threshold = 6,
): { snappedX: number; snappedY: number; guides: SnapGuideLine[] } {
  let snappedX = moving.x;
  let snappedY = moving.y;
  let bestDx = threshold + 1;
  let bestDy = threshold + 1;
  let bestVGuide: SnapGuideLine | null = null;
  let bestHGuide: SnapGuideLine | null = null;

  const mXs = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
  const mYs = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];

  for (const o of others) {
    if (o.id === moving.id) continue;
    const oXs = [o.x, o.x + o.w / 2, o.x + o.w];
    const oYs = [o.y, o.y + o.h / 2, o.y + o.h];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dx = oXs[j] - mXs[i];
        if (Math.abs(dx) < bestDx) {
          bestDx = Math.abs(dx);
          snappedX = moving.x + dx;
          bestVGuide = {
            orientation: 'v',
            pos: oXs[j],
            start: Math.min(moving.y, o.y) - 16,
            end: Math.max(moving.y + moving.h, o.y + o.h) + 16,
          };
        }
        const dy = oYs[j] - mYs[i];
        if (Math.abs(dy) < bestDy) {
          bestDy = Math.abs(dy);
          snappedY = moving.y + dy;
          bestHGuide = {
            orientation: 'h',
            pos: oYs[j],
            start: Math.min(moving.x, o.x) - 16,
            end: Math.max(moving.x + moving.w, o.x + o.w) + 16,
          };
        }
      }
    }
  }

  const guides: SnapGuideLine[] = [];
  if (bestVGuide && bestDx <= threshold) guides.push(bestVGuide);
  if (bestHGuide && bestDy <= threshold) guides.push(bestHGuide);
  return {
    snappedX: bestDx <= threshold ? snappedX : moving.x,
    snappedY: bestDy <= threshold ? snappedY : moving.y,
    guides,
  };
}

// ---------------------------------------------------------------------------
// 3. Smart Arrow-to-Shape Binding
// ---------------------------------------------------------------------------

export interface ArrowBindResult {
  targetId: string;
  anchorX: number;
  anchorY: number;
  side: 'top' | 'right' | 'bottom' | 'left';
}

export function findNearestBindTarget(
  pt: { x: number; y: number },
  candidates: RectBox[],
  maxDist = 28,
): ArrowBindResult | null {
  let best: ArrowBindResult | null = null;
  let bestDist = maxDist;

  for (const box of candidates) {
    const anchors: Array<{ side: 'top' | 'right' | 'bottom' | 'left'; x: number; y: number }> = [
      { side: 'top', x: box.x + box.w / 2, y: box.y },
      { side: 'right', x: box.x + box.w, y: box.y + box.h / 2 },
      { side: 'bottom', x: box.x + box.w / 2, y: box.y + box.h },
      { side: 'left', x: box.x, y: box.y + box.h / 2 },
    ];
    for (const a of anchors) {
      const d = Math.hypot(pt.x - a.x, pt.y - a.y);
      if (d <= bestDist) {
        bestDist = d;
        best = { targetId: box.id, anchorX: a.x, anchorY: a.y, side: a.side };
      }
    }
  }
  return best;
}

export function computeBoundArrowEndpoints(
  startBox: RectBox,
  endBox: RectBox,
  gap = 6,
): { x1: number; y1: number; x2: number; y2: number } {
  const scx = startBox.x + startBox.w / 2;
  const scy = startBox.y + startBox.h / 2;
  const ecx = endBox.x + endBox.w / 2;
  const ecy = endBox.y + endBox.h / 2;
  const dx = ecx - scx;
  const dy = ecy - scy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const dir = dx >= 0 ? 1 : -1;
    return {
      x1: dir > 0 ? startBox.x + startBox.w + gap : startBox.x - gap,
      y1: scy,
      x2: dir > 0 ? endBox.x - gap : endBox.x + endBox.w + gap,
      y2: ecy,
    };
  }
  const dir = dy >= 0 ? 1 : -1;
  return {
    x1: scx,
    y1: dir > 0 ? startBox.y + startBox.h + gap : startBox.y - gap,
    x2: ecx,
    y2: dir > 0 ? endBox.y - gap : endBox.y + endBox.h + gap,
  };
}

// ---------------------------------------------------------------------------
// 4. Multi-Select Align & Distribute
// ---------------------------------------------------------------------------

export type AlignAction = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributeAction = 'horizontal' | 'vertical';

export function computeAlignedDeltas(
  boxes: RectBox[],
  action: AlignAction,
): Record<string, { dx: number; dy: number }> {
  if (boxes.length < 2) return {};
  const minX = Math.min(...boxes.map((b) => b.x));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const out: Record<string, { dx: number; dy: number }> = {};
  for (const b of boxes) {
    let dx = 0;
    let dy = 0;
    if (action === 'left') dx = minX - b.x;
    else if (action === 'right') dx = maxX - (b.x + b.w);
    else if (action === 'center') dx = midX - (b.x + b.w / 2);
    else if (action === 'top') dy = minY - b.y;
    else if (action === 'bottom') dy = maxY - (b.y + b.h);
    else if (action === 'middle') dy = midY - (b.y + b.h / 2);
    out[b.id] = { dx, dy };
  }
  return out;
}

export function computeDistributedDeltas(
  boxes: RectBox[],
  axis: DistributeAction,
): Record<string, { dx: number; dy: number }> {
  if (boxes.length < 3) return {};
  const sorted = [...boxes].sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const out: Record<string, { dx: number; dy: number }> = {};

  if (axis === 'horizontal') {
    const totalW = sorted.reduce((s, b) => s + b.w, 0);
    const totalSpan = last.x + last.w - first.x;
    const gap = (totalSpan - totalW) / (sorted.length - 1);
    let cursor = first.x;
    for (const b of sorted) {
      out[b.id] = { dx: cursor - b.x, dy: 0 };
      cursor += b.w + gap;
    }
  } else {
    const totalH = sorted.reduce((s, b) => s + b.h, 0);
    const totalSpan = last.y + last.h - first.y;
    const gap = (totalSpan - totalH) / (sorted.length - 1);
    let cursor = first.y;
    for (const b of sorted) {
      out[b.id] = { dx: 0, dy: cursor - b.y };
      cursor += b.h + gap;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 5. Mermaid Flowchart -> Editable Excalidraw Canvas Elements (Zero eval)
// ---------------------------------------------------------------------------

export interface MermaidDiagramNode {
  id: string;
  label: string;
  shape: 'rect' | 'rhombus' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  bgColor: string;
}

export interface MermaidDiagramEdge {
  from: string;
  to: string;
  label?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface MermaidDiagramResult {
  direction: 'TD' | 'LR';
  nodes: MermaidDiagramNode[];
  edges: MermaidDiagramEdge[];
}

function parseNodeToken(token: string): { id: string; label: string; shape: 'rect' | 'rhombus' | 'ellipse' } {
  const t = token.trim();
  const circleM = t.match(/^([A-Za-z0-9_]+)\(\(([^)]+)\)\)$/);
  if (circleM) return { id: circleM[1], label: circleM[2].trim(), shape: 'ellipse' };
  const roundM = t.match(/^([A-Za-z0-9_]+)\(([^)]+)\)$/);
  if (roundM) return { id: roundM[1], label: roundM[2].trim(), shape: 'ellipse' };
  const diamondM = t.match(/^([A-Za-z0-9_]+)\{([^}]+)\}$/);
  if (diamondM) return { id: diamondM[1], label: diamondM[2].trim(), shape: 'rhombus' };
  const rectM = t.match(/^([A-Za-z0-9_]+)\[([^\]]+)\]$/);
  if (rectM) return { id: rectM[1], label: rectM[2].trim(), shape: 'rect' };
  const idOnly = t.replace(/[^A-Za-z0-9_]/g, '') || 'Node';
  return { id: idOnly, label: idOnly, shape: 'rect' };
}

export function parseMermaidToDiagram(
  source: string,
  originX = 160,
  originY = 120,
): MermaidDiagramResult {
  const lines = source
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));

  let direction: 'TD' | 'LR' = 'TD';
  const nodeMap = new Map<string, { id: string; label: string; shape: 'rect' | 'rhombus' | 'ellipse' }>();
  const rawEdges: Array<{ from: string; to: string; label?: string }> = [];

  for (const line of lines) {
    const dirM = line.match(/^(?:graph|flowchart)\s+(TD|TB|LR)/i);
    if (dirM) {
      direction = dirM[1].toUpperCase() === 'LR' ? 'LR' : 'TD';
      continue;
    }

    // Match edge: A[Start] -->|Label| B{Check} or A --> B
    const edgeM = line.match(/^(.+?)\s*(?:-->|---?>|==>)\s*(?:\|([^|]+)\|)?\s*(.+)$/);
    if (edgeM) {
      const left = parseNodeToken(edgeM[1]);
      const right = parseNodeToken(edgeM[3]);
      if (!nodeMap.has(left.id) || edgeM[1].length > left.id.length) nodeMap.set(left.id, left);
      if (!nodeMap.has(right.id) || edgeM[3].length > right.id.length) nodeMap.set(right.id, right);
      rawEdges.push({ from: left.id, to: right.id, label: edgeM[2]?.trim() });
    } else if (/^[A-Za-z0-9_]+[\[\(\{]/.test(line)) {
      const n = parseNodeToken(line);
      nodeMap.set(n.id, n);
    }
  }

  // Topological BFS layering for clean non-overlapping flowchart layout
  const ids = Array.from(nodeMap.keys());
  const inDegree = new Map<string, number>(ids.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const e of rawEdges) {
    adj.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  const level = new Map<string, number>();
  const queue = ids.filter((id) => (inDegree.get(id) ?? 0) === 0);
  if (queue.length === 0 && ids.length > 0) queue.push(ids[0]);
  queue.forEach((id) => level.set(id, 0));

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curL = level.get(cur) ?? 0;
    for (const nxt of adj.get(cur) ?? []) {
      if (!level.has(nxt)) {
        level.set(nxt, curL + 1);
        queue.push(nxt);
      }
    }
  }
  ids.forEach((id) => {
    if (!level.has(id)) level.set(id, 0);
  });

  const byLevel = new Map<number, string[]>();
  for (const id of ids) {
    const l = level.get(id) ?? 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(id);
  }

  const NODE_BG: Record<'rect' | 'rhombus' | 'ellipse', string> = {
    rect: '#a5d8ff',
    rhombus: '#ffec99',
    ellipse: '#b2f2bb',
  };

  const placedMap = new Map<string, MermaidDiagramNode>();
  const nodes: MermaidDiagramNode[] = [];
  for (const [lvl, row] of Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0])) {
    row.forEach((id, colIdx) => {
      const spec = nodeMap.get(id)!;
      const w = spec.shape === 'rhombus' ? 140 : Math.max(130, spec.label.length * 9 + 36);
      const h = spec.shape === 'rhombus' ? 92 : 58;
      const x = direction === 'TD' ? originX + colIdx * 210 : originX + lvl * 220;
      const y = direction === 'TD' ? originY + lvl * 135 : originY + colIdx * 125;
      const node: MermaidDiagramNode = {
        id,
        label: spec.label,
        shape: spec.shape,
        x,
        y,
        w,
        h,
        bgColor: NODE_BG[spec.shape],
      };
      placedMap.set(id, node);
      nodes.push(node);
    });
  }

  const edges: MermaidDiagramEdge[] = [];
  for (const e of rawEdges) {
    const a = placedMap.get(e.from);
    const b = placedMap.get(e.to);
    if (!a || !b) continue;
    const pts = computeBoundArrowEndpoints(
      { id: a.id, x: a.x, y: a.y, w: a.w, h: a.h },
      { id: b.id, x: b.x, y: b.y, w: b.w, h: b.h },
      4,
    );
    edges.push({ from: e.from, to: e.to, ...(e.label !== undefined ? { label: e.label } : {}), ...pts });
  }

  return { direction, nodes, edges };
}

// ---------------------------------------------------------------------------
// 6. Clean Vector SVG Export
// ---------------------------------------------------------------------------

export function exportBasicSceneToSvg(
  items: Array<{
    type: string;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    r?: number;
    cx?: number;
    cy?: number;
    rx?: number;
    ry?: number;
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
    text?: string;
    points?: Array<[number, number, number]>;
  }>,
  width = 1280,
  height = 800,
  bgColor = '#ffffff',
): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const body: string[] = [
    `<rect width="100%" height="100%" fill="${esc(bgColor)}" />`,
  ];

  for (const it of items) {
    const stroke = esc(it.stroke || '#1e1e1e');
    const fill = esc(it.fill || 'none');
    const sw = it.strokeWidth ?? 2;

    if (it.type === 'rect' || it.type === 'frame') {
      body.push(
        `<rect x="${it.x ?? 0}" y="${it.y ?? 0}" width="${it.w ?? 100}" height="${it.h ?? 60}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`,
      );
    } else if (it.type === 'circle') {
      body.push(
        `<circle cx="${it.x ?? 0}" cy="${it.y ?? 0}" r="${it.r ?? 40}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`,
      );
    } else if (it.type === 'ellipse') {
      body.push(
        `<ellipse cx="${it.cx ?? it.x ?? 0}" cy="${it.cy ?? it.y ?? 0}" rx="${it.rx ?? 50}" ry="${it.ry ?? 35}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`,
      );
    } else if (it.type === 'rhombus') {
      const cx = it.cx ?? 0;
      const cy = it.cy ?? 0;
      const rx = it.rx ?? (it.w ?? 80) / 2;
      const ry = it.ry ?? (it.h ?? 80) / 2;
      body.push(
        `<polygon points="${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`,
      );
    } else if (it.type === 'line' || it.type === 'arrow') {
      body.push(
        `<line x1="${it.x1 ?? 0}" y1="${it.y1 ?? 0}" x2="${it.x2 ?? 100}" y2="${it.y2 ?? 100}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" />`,
      );
    } else if (it.type === 'text' && it.text) {
      body.push(
        `<text x="${it.x ?? 0}" y="${(it.y ?? 0) + 18}" fill="${stroke}" font-size="18" font-family="sans-serif">${esc(it.text)}</text>`,
      );
    } else if (it.type === 'stroke' && it.points && it.points.length > 1) {
      const pts = it.points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
      body.push(
        `<polyline fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n  ${body.join('\n  ')}\n</svg>`;
}
