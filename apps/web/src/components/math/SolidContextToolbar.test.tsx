import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SolidContextToolbar } from './SolidContextToolbar';

describe('SolidContextToolbar Component (P12-T02)', () => {
  it('renders all toggle buttons and tools', () => {
    render(
      <SolidContextToolbar
        solidId="solid-1"
        onUpdateDisplay={vi.fn()}
        onResetView={vi.fn()}
        onOpenSectionTool={vi.fn()}
        onOpenMeasureTool={vi.fn()}
        onOpenUnfoldTool={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByRole('toolbar', { name: 'Toolbar Kontekstual Bangun Ruang' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Tampilan Kamera' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle Label Titik Sudut' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toggle Rusuk Tak Tampak' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buka Alat Irisan Bidang' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buka Alat Ukur Dimensi Tiga' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buka Animasi Jaring-Jaring' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus Bangun Ruang' })).toBeInTheDocument();
  });

  it('triggers onUpdateDisplay when toggling labels or edges', () => {
    const onUpdateDisplay = vi.fn();
    render(
      <SolidContextToolbar
        solidId="solid-1"
        display={{ showLabels: true, showHiddenEdges: true, opacity: 0.3 }}
        onUpdateDisplay={onUpdateDisplay}
      />
    );

    const labelsBtn = screen.getByRole('button', { name: 'Toggle Label Titik Sudut' });
    fireEvent.click(labelsBtn);
    expect(onUpdateDisplay).toHaveBeenCalledWith({ showLabels: false });

    const edgesBtn = screen.getByRole('button', { name: 'Toggle Rusuk Tak Tampak' });
    fireEvent.click(edgesBtn);
    expect(onUpdateDisplay).toHaveBeenCalledWith({ showHiddenEdges: false });

    const opacitySlider = screen.getByLabelText('Transparansi Sisi Bangun Ruang');
    fireEvent.change(opacitySlider, { target: { value: '0.6' } });
    expect(onUpdateDisplay).toHaveBeenCalledWith({ opacity: 0.6 });
  });

  it('triggers section, measure, unfold, and delete callbacks', () => {
    const onSection = vi.fn();
    const onMeasure = vi.fn();
    const onUnfold = vi.fn();
    const onDelete = vi.fn();

    render(
      <SolidContextToolbar
        solidId="solid-1"
        onUpdateDisplay={vi.fn()}
        onOpenSectionTool={onSection}
        onOpenMeasureTool={onMeasure}
        onOpenUnfoldTool={onUnfold}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Buka Alat Irisan Bidang' }));
    expect(onSection).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Buka Alat Ukur Dimensi Tiga' }));
    expect(onMeasure).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Buka Animasi Jaring-Jaring' }));
    expect(onUnfold).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Hapus Bangun Ruang' }));
    expect(onDelete).toHaveBeenCalled();
  });
});
