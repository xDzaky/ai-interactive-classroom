/**
 * Corpus test runner for synthetic and human samples (P10-T10)
 */
import { describe, it, expect } from 'vitest';
import { generateSyntheticShape, generateSyntheticNegative, type NegativeKind } from './generate.js';
import { recognizeShape } from '../recognizer.js';
import type { ShapeKind } from '../types.js';

const SHAPE_CLASSES: ShapeKind[] = [
  'line',
  'circle',
  'ellipse',
  'triangle',
  'right_triangle',
  'rect',
  'square',
  'rhombus',
  'pentagon',
  'hexagon',
  'star',
];

const NEGATIVE_CLASSES: NegativeKind[] = [
  'scribble',
  'letter_S',
  'letter_8',
  'heart',
  'spiral',
  'zigzag',
  'wave',
  'blob',
  'hook',
  'open_arc',
];

describe('Shape Recognizer Corpus Test', () => {
  it('evaluates synthetic corpus across all classes and prints performance table', () => {
    const samplesPerClass = 15;
    const stats: Record<string, { correct: number; snap: number; suggest: number; keep: number; total: number }> = {};

    for (const shape of SHAPE_CLASSES) {
      stats[shape] = { correct: 0, snap: 0, suggest: 0, keep: 0, total: samplesPerClass };
      for (let i = 0; i < samplesPerClass; i++) {
        const stroke = generateSyntheticShape(shape, { seed: 1000 + i * 17 });
        const res = recognizeShape(stroke);
        if (res.best?.kind === shape || (shape === 'right_triangle' && res.best?.kind === 'triangle')) {
          stats[shape].correct++;
        }
        stats[shape][res.decision]++;
      }
    }

    const negativeStats: Record<string, { rejectedAsKeep: number; falsePositive: number; total: number }> = {};
    for (const neg of NEGATIVE_CLASSES) {
      negativeStats[neg] = { rejectedAsKeep: 0, falsePositive: 0, total: samplesPerClass };
      for (let i = 0; i < samplesPerClass; i++) {
        const stroke = generateSyntheticNegative(neg, { seed: 5000 + i * 23 });
        const res = recognizeShape(stroke);
        if (res.decision === 'keep') {
          negativeStats[neg].rejectedAsKeep++;
        } else {
          negativeStats[neg].falsePositive++;
        }
      }
    }

    // Print benchmark report
    console.log('\n===== SYNTHETIC SHAPE RECOGNITION BENCHMARK =====');
    console.log('| Class | Correct / Total | Accuracy | Snap | Suggest | Keep |');
    console.log('|---|---|---|---|---|---|');
    let totalCorrect = 0;
    let totalSamples = 0;
    for (const shape of SHAPE_CLASSES) {
      const s = stats[shape];
      totalCorrect += s.correct;
      totalSamples += s.total;
      const acc = ((s.correct / s.total) * 100).toFixed(1);
      console.log(`| ${shape.padEnd(14)} | ${s.correct}/${s.total} | ${acc}% | ${s.snap} | ${s.suggest} | ${s.keep} |`);
    }
    const overallAcc = ((totalCorrect / totalSamples) * 100).toFixed(1);
    console.log(`| **OVERALL**    | ${totalCorrect}/${totalSamples} | **${overallAcc}%** | | | |`);

    console.log('\n===== NEGATIVE REJECTION BENCHMARK =====');
    console.log('| Negative Class | Rejected (Keep) | False Positive (Snap/Suggest) | Rejection Rate |');
    console.log('|---|---|---|---|');
    let totalNegRejected = 0;
    let totalNegSamples = 0;
    for (const neg of NEGATIVE_CLASSES) {
      const s = negativeStats[neg];
      totalNegRejected += s.rejectedAsKeep;
      totalNegSamples += s.total;
      const rate = ((s.rejectedAsKeep / s.total) * 100).toFixed(1);
      console.log(`| ${neg.padEnd(14)} | ${s.rejectedAsKeep}/${s.total} | ${s.falsePositive} | ${rate}% |`);
    }
    const overallNegRate = ((totalNegRejected / totalNegSamples) * 100).toFixed(1);
    console.log(`| **TOTAL REJECTION** | ${totalNegRejected}/${totalNegSamples} | | **${overallNegRate}%** |`);

    // Basic sanity assertion for test runner
    expect(totalCorrect).toBeGreaterThan(totalSamples * 0.70);
    expect(totalNegRejected).toBeGreaterThan(totalNegSamples * 0.70);
  });
});
