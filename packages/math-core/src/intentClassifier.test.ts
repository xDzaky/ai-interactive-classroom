import { describe, it, expect } from 'vitest';
import { latexToPlainMath, classifyMathIntent } from './intentClassifier.js';

describe('Math Intent Classifier & Safe LaTeX Evaluator', () => {
  it('converts LaTeX powers, fractions, and roots cleanly', () => {
    expect(latexToPlainMath('8^{2}')).toBe('8^(2)');
    expect(latexToPlainMath('\\frac{3}{4}+\\frac{1}{2}')).toBe('((3)/(4))+((1)/(2))');
    expect(latexToPlainMath('\\sqrt{144}')).toBe('sqrt(144)');
  });

  it('evaluates arithmetic expressions safely with exact rational display', () => {
    const pow = classifyMathIntent('8^{2}');
    expect(pow?.kind).toBe('arithmetic');
    if (pow?.kind === 'arithmetic') {
      expect(pow.result).toBe(64);
      expect(pow.exactLabel).toBe('64');
    }

    const frac = classifyMathIntent('\\frac{3}{4}+\\frac{1}{2}');
    expect(frac?.kind).toBe('arithmetic');
    if (frac?.kind === 'arithmetic') {
      expect(frac.result).toBeCloseTo(1.25, 6);
      expect(frac.exactLabel).toContain('5/4');
    }
  });

  it('classifies 2D functions and 3D surfaces automatically', () => {
    const fn2d = classifyMathIntent('y = x^2 - 3');
    expect(fn2d).toEqual({ kind: 'function_2d', plain: 'y = x^2 - 3', expression: 'x^2 - 3' });

    const surf3d = classifyMathIntent('z = sin(x)*cos(y)');
    expect(surf3d).toEqual({
      kind: 'surface_3d',
      plain: 'z = sin(x)*cos(y)',
      formula3d: 'sin(x)*cos(y)',
    });
  });

  it('parses natural 3D solid commands', () => {
    const solid = classifyMathIntent('Tabung r=4 t=10');
    expect(solid?.kind).toBe('solid_3d');
    if (solid?.kind === 'solid_3d') {
      expect(solid.solidType).toBe('cylinder');
      expect(solid.params).toEqual({ type: 'cylinder', r: 4, h: 10 });
    }
  });
});
