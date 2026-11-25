import { describe, expect, it } from 'vitest';
import { getCapabilitiesForSelection } from './ExcalidrawPropertiesPanel';
import { validateManimGxSourceClient } from '@/workers/manimgx.worker';
import { recognizeStrokesHeuristic } from '@/hooks/useHandwritingToLatex';

describe('ExcalidrawPropertiesPanel capability filtering', () => {
  it('hides unsupported controls for freehand strokes', () => {
    const caps = getCapabilitiesForSelection(['stroke']);
    expect(caps.hasAny).toBe(true);
    expect(caps.strokeColor).toBe(true);
    expect(caps.strokeWidth).toBe(true);
    expect(caps.backgroundColor).toBe(false);
    expect(caps.fillStyle).toBe(false);
    expect(caps.roughness).toBe(false);
    expect(caps.roundness).toBe(false);
    expect(caps.fontFamily).toBe(false);
  });

  it('hides fill/roughness/roundness for line and arrow', () => {
    const caps = getCapabilitiesForSelection(['arrow']);
    expect(caps.hasAny).toBe(true);
    expect(caps.strokeColor).toBe(true);
    expect(caps.strokeWidth).toBe(true);
    expect(caps.strokeStyle).toBe(true);
    expect(caps.opacity).toBe(true);
    expect(caps.backgroundColor).toBe(false);
    expect(caps.fillStyle).toBe(false);
    expect(caps.roughness).toBe(false);
    expect(caps.roundness).toBe(false);
  });

  it('hides panel completely for non-Excalidraw DOM widgets', () => {
    for (const widgetType of ['viz_solid', 'image', 'math_block', 'viz_manimgx', 'simulation']) {
      expect(getCapabilitiesForSelection([widgetType]).hasAny).toBe(false);
    }
  });

  it('enables full capabilities for rect', () => {
    const caps = getCapabilitiesForSelection(['rect']);
    expect(caps.hasAny).toBe(true);
    expect(caps.backgroundColor).toBe(true);
    expect(caps.fillStyle).toBe(true);
    expect(caps.roughness).toBe(true);
    expect(caps.roundness).toBe(true);
  });
});

describe('ManimGX client validator & Handwriting-to-LaTeX heuristic', () => {
  it('blocks unsafe imports/builtins and allows valid Scene', () => {
    const bad = validateManimGxSourceClient('import os\nclass A(Scene):\n  def construct(self): eval("1")');
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThanOrEqual(2);

    const good = validateManimGxSourceClient('from manimgx import Scene\nclass A(Scene):\n  def construct(self): pass');
    expect(good.valid).toBe(true);
  });

  it('recognizes multi-stroke handwritten clusters into LaTeX', () => {
    const res = recognizeStrokesHeuristic([
      { id: 's1', points: [[10, 20, 0.5], [50, 20, 0.5]] },
      { id: 's2', points: [[10, 40, 0.5], [80, 40, 0.5]] },
      { id: 's3', points: [[20, 60, 0.5], [40, 75, 0.5]] },
    ]);
    expect(res.latex.length).toBeGreaterThan(0);
    expect(res.confidence).toBeGreaterThan(0.7);
  });
});
