import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MeasureTool } from './MeasureTool';
import { buildPolyhedron } from '@ai-classroom/geometry-core';

describe('MeasureTool Component (P11-T06)', () => {
  const cube = buildPolyhedron('cube', { side: 5 });

  it('renders instructions when no vertices selected', () => {
    render(<MeasureTool polyhedron={cube} selectedVertices={[]} />);
    expect(screen.getByTestId('measure-tool')).toBeTruthy();
    expect(screen.getByText(/Pilih 2 titik untuk panjang ruas/)).toBeTruthy();
  });

  it('renders segment length when 2 vertices are selected', () => {
    // Vertices A and B on cube side 5 -> length = 5 cm
    render(<MeasureTool polyhedron={cube} selectedVertices={['A', 'B']} />);
    expect(screen.getByTestId('measurement-result')).toBeTruthy();
    expect(screen.getByText(/Panjang ruas \|AB\|/)).toBeTruthy();
    expect(screen.getByText(/5 cm/)).toBeTruthy();
  });

  it('renders angle when 3 vertices are selected', () => {
    // Vertices B, A, D on cube -> angle BAD = 90 deg
    render(<MeasureTool polyhedron={cube} selectedVertices={['B', 'A', 'D']} />);
    expect(screen.getByTestId('measurement-result')).toBeTruthy();
    expect(screen.getByText(/Besar sudut ∠BAD/)).toBeTruthy();
    expect(screen.getByText(/90°/)).toBeTruthy();
  });

  it('triggers shortcut callbacks when diagonal buttons clicked', () => {
    const onSelectShortcut = vi.fn();
    render(<MeasureTool polyhedron={cube} selectedVertices={[]} onSelectShortcut={onSelectShortcut} />);

    const diagBidangBtn = screen.getByTestId('shortcut-diag-bidang');
    fireEvent.click(diagBidangBtn);
    expect(onSelectShortcut).toHaveBeenCalledWith(['A', 'C']);

    const diagRuangBtn = screen.getByTestId('shortcut-diag-ruang');
    fireEvent.click(diagRuangBtn);
    expect(onSelectShortcut).toHaveBeenCalledWith(['A', 'G']);
  });
});
