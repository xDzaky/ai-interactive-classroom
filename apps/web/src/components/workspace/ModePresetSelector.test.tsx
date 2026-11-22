import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModePresetSelector } from './ModePresetSelector';

describe('ModePresetSelector Component (P13-T07)', () => {
  it('renders all four mode presets', () => {
    render(
      <ModePresetSelector
        activeMode="drawing"
        onModeChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Mode Menggambar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mode Geometri/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mode Bangun Ruang/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mode Grafik 2D/ })).toBeInTheDocument();
  });

  it('marks active preset with aria-pressed=true', () => {
    render(
      <ModePresetSelector
        activeMode="solids"
        onModeChange={vi.fn()}
      />
    );

    const solidsBtn = screen.getByRole('button', { name: /Mode Bangun Ruang/ });
    expect(solidsBtn).toHaveAttribute('aria-pressed', 'true');

    const drawingBtn = screen.getByRole('button', { name: /Mode Menggambar/ });
    expect(drawingBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('triggers onModeChange when a preset is clicked', () => {
    const onModeChange = vi.fn();
    render(
      <ModePresetSelector
        activeMode="drawing"
        onModeChange={onModeChange}
      />
    );

    const geoBtn = screen.getByRole('button', { name: /Mode Geometri/ });
    fireEvent.click(geoBtn);

    expect(onModeChange).toHaveBeenCalledWith('geometry');
  });
});
