/**
 * AiExplainModal.test.tsx
 * Tests for AiExplainModal Socratic explanation component.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiExplainModal } from './AiExplainModal';
import type { BoardObject } from '@ai-classroom/whiteboard-core';

describe('AiExplainModal', () => {
  it('renders cube math facts and formulas when a 3D cube is passed', () => {
    const cubeObj: BoardObject = {
      id: 'cube-1',
      object_type: 'viz_solid',
      props: { solidType: 'cube' },
      created_at: 1,
      updated_at: 1,
    };

    render(<AiExplainModal target={cubeObj} onClose={vi.fn()} />);

    expect(screen.getByTestId('ai-explain-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Kubus/i })).toBeInTheDocument();
    expect(screen.getByText(/V = s³/i)).toBeInTheDocument();
    expect(screen.getByText(/Pertanyaan Sokrates/i)).toBeInTheDocument();
  });

  it('renders 2D shape properties for rectangle', () => {
    const rectObj: BoardObject = {
      id: 'rect-1',
      object_type: 'rect',
      props: { x: 0, y: 0, w: 100, h: 50 },
      created_at: 1,
      updated_at: 1,
    };

    render(<AiExplainModal target={rectObj} onClose={vi.fn()} />);
    expect(screen.getByText(/Persegi/i)).toBeInTheDocument();
    expect(screen.getByText(/Luas = p × l/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const rectObj: BoardObject = {
      id: 'rect-1',
      object_type: 'rect',
      props: { x: 0, y: 0 },
      created_at: 1,
      updated_at: 1,
    };

    render(<AiExplainModal target={rectObj} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('Tutup');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
