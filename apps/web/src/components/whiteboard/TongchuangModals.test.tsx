import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormulaToGraphModal } from './FormulaToGraphModal';
import { LessonSummaryModal } from './LessonSummaryModal';
import { createInitialBoardState, createHistory, pushHistory } from '@ai-classroom/whiteboard-core';

describe('FormulaToGraphModal (P14) & LessonSummaryModal (P16)', () => {
  it('normalizes y= prefix and confirms formula to graph', () => {
    const onConfirm = vi.fn();
    render(<FormulaToGraphModal initialExpression="y = x^2 - 3" onConfirm={onConfirm} onClose={vi.fn()} />);

    fireEvent.click(screen.getByTestId('confirm-formula-graph-btn'));
    expect(onConfirm).toHaveBeenCalledWith(['x^2 - 3']);
  });

  it('generates deterministic micro-lesson summary from board state and history', () => {
    let state = createInitialBoardState('room-1');
    let hist = createHistory(50);

    const res1 = pushHistory(state, hist, {
      event_type: 'batch',
      payload: {
        events: [
          { event_type: 'object.created', payload: { id: 'r1', object_type: 'rect', props: { x: 0, y: 0, w: 100, h: 100 } } },
          { event_type: 'object.deleted', payload: { id: 'r1' } },
          { event_type: 'object.created', payload: { id: 's1', object_type: 'viz_solid', props: { solid_type: 'cube', label: 'Kubus' } } },
        ],
      },
    });
    state = res1.state;
    hist = res1.history;

    render(<LessonSummaryModal boardState={state} history={hist} onClose={vi.fn()} />);
    expect(screen.getByTestId('lesson-summary-modal')).toHaveTextContent('Konversi Sketsa 2D → Bangun Ruang 3D');
    expect(screen.getByTestId('lesson-summary-modal')).toHaveTextContent('1 total aksi');
  });
});
