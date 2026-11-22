import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnfoldAnimation } from './UnfoldAnimation';
import { buildPolyhedron } from '@ai-classroom/geometry-core';

describe('UnfoldAnimation Component (P11-T09)', () => {
  it('renders correctly for polyhedron solid', () => {
    const cube = buildPolyhedron('cube', { side: 5 });
    render(
      <UnfoldAnimation
        solid={{ kind: 'polyhedron', polyhedron: cube, name: 'Kubus ABCD.EFGH' }}
      />
    );

    expect(screen.getByText('Jaring-Jaring (Unfold Net)')).toBeInTheDocument();
    expect(screen.getByText('Kubus ABCD.EFGH')).toBeInTheDocument();
    expect(screen.getByLabelText('Tingkat Pembukaan Jaring-Jaring')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mulai Animasi' })).toBeInTheDocument();
  });

  it('renders correctly for cylinder curved solid', () => {
    render(<UnfoldAnimation solid={{ kind: 'cylinder', r: 7, h: 10 }} />);

    expect(screen.getByText('Tipe Lengkung:')).toBeInTheDocument();
    expect(screen.getByText('cylinder')).toBeInTheDocument();
    // 238 * pi ~= 747.70
    expect(screen.getByText(/747.70 cm²/)).toBeInTheDocument();
  });

  it('handles slider change and button clicks', () => {
    const onClose = vi.fn();
    render(
      <UnfoldAnimation
        solid={{ kind: 'cone', r: 3, h: 4 }}
        onClose={onClose}
      />
    );

    const slider = screen.getByLabelText('Tingkat Pembukaan Jaring-Jaring') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0.65' } });
    expect(slider.value).toBe('0.65');
    expect(screen.getByText('65%')).toBeInTheDocument();

    const playBtn = screen.getByRole('button', { name: 'Mulai Animasi' });
    fireEvent.click(playBtn);
    expect(screen.getByRole('button', { name: 'Jeda Animasi' })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Tutup Panel Unfold');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
