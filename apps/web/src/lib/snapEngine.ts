/**
 * snapEngine.ts — Magnetic Edge & Center Alignment Snapping (V3)
 * Snaps dragged 2D shapes flush against edges or centers of nearby shapes (<= 12px)
 * and emits crisp alignment guide lines for the Konva UI layer.
 */

export interface SnapBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  pos: number;
  start: number;
  end: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

export function computeMagneticSnap(
  moving: SnapBBox,
  others: SnapBBox[],
  threshold = 12,
): SnapResult {
  let bestDx = 0;
  let bestDy = 0;
  let minAbsDx = threshold + 1;
  let minAbsDy = threshold + 1;
  let bestVGuide: SnapGuide | null = null;
  let bestHGuide: SnapGuide | null = null;

  const mLeft = moving.x;
  const mRight = moving.x + moving.w;
  const mCx = moving.x + moving.w / 2;
  const mTop = moving.y;
  const mBottom = moving.y + moving.h;
  const mCy = moving.y + moving.h / 2;

  for (const o of others) {
    const oLeft = o.x;
    const oRight = o.x + o.w;
    const oCx = o.x + o.w / 2;
    const oTop = o.y;
    const oBottom = o.y + o.h;
    const oCy = o.y + o.h / 2;

    const xPairs: Array<[number, number]> = [
      [mLeft, oLeft],
      [mRight, oRight],
      [mCx, oCx],
      [mLeft, oRight], // flush edge-to-edge!
      [mRight, oLeft],
    ];
    for (const [mVal, oVal] of xPairs) {
      const diff = oVal - mVal;
      if (Math.abs(diff) < minAbsDx) {
        minAbsDx = Math.abs(diff);
        bestDx = diff;
        bestVGuide = {
          orientation: 'vertical',
          pos: oVal,
          start: Math.min(mTop, oTop) - 16,
          end: Math.max(mBottom, oBottom) + 16,
        };
      }
    }

    const yPairs: Array<[number, number]> = [
      [mTop, oTop],
      [mBottom, oBottom],
      [mCy, oCy],
      [mBottom, oTop], // flush top-to-bottom (e.g. Triangle roof onto Square top!)
      [mTop, oBottom],
    ];
    for (const [mVal, oVal] of yPairs) {
      const diff = oVal - mVal;
      if (Math.abs(diff) < minAbsDy) {
        minAbsDy = Math.abs(diff);
        bestDy = diff;
        bestHGuide = {
          orientation: 'horizontal',
          pos: oVal,
          start: Math.min(mLeft, oLeft) - 16,
          end: Math.max(mRight, oRight) + 16,
        };
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (bestVGuide && minAbsDx <= threshold) guides.push(bestVGuide);
  if (bestHGuide && minAbsDy <= threshold) guides.push(bestHGuide);

  return {
    dx: minAbsDx <= threshold ? bestDx : 0,
    dy: minAbsDy <= threshold ? bestDy : 0,
    guides,
  };
}
