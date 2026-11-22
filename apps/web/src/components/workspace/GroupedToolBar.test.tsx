import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupedToolBar } from './GroupedToolBar';

describe('GroupedToolBar Component (P13-T07)', () => {
  it('renders all tool group buttons', () => {
    render(
      <GroupedToolBar
        activeTool="pen"
        onToolSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Kelompok alat Menggambar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kelompok alat Bentuk Datar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kelompok alat Geometri 2D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kelompok alat Bangun Ruang 3D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kelompok alat Grafik & Fungsi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kelompok alat Teks & Rumus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kelompok alat AI Tutor' })).toBeInTheDocument();
  });

  it('opens flyout when clicking a tool group and triggers selection', () => {
    const onToolSelect = vi.fn();
    render(
      <GroupedToolBar
        activeTool="pen"
        onToolSelect={onToolSelect}
      />
    );

    const drawGroup = screen.getByRole('button', { name: 'Kelompok alat Menggambar' });
    fireEvent.click(drawGroup);

    expect(screen.getByRole('menu', { name: 'Pilihan Menggambar' })).toBeInTheDocument();

    const highlighterBtn = screen.getByRole('menuitem', { name: 'Stabilo' });
    fireEvent.click(highlighterBtn);

    expect(onToolSelect).toHaveBeenCalledWith('highlighter');
    // Menu closes after select
    expect(screen.queryByRole('menu', { name: 'Pilihan Menggambar' })).not.toBeInTheDocument();
  });

  it('triggers onSolidSelect callback when selecting a 3D solid', () => {
    const onSolidSelect = vi.fn();
    render(
      <GroupedToolBar
        activeTool="select"
        onToolSelect={vi.fn()}
        onSolidSelect={onSolidSelect}
      />
    );

    const solidsGroup = screen.getByRole('button', { name: 'Kelompok alat Bangun Ruang 3D' });
    fireEvent.click(solidsGroup);

    const cubeBtn = screen.getByRole('menuitem', { name: 'Kubus ABCD.EFGH' });
    fireEvent.click(cubeBtn);

    expect(onSolidSelect).toHaveBeenCalledWith('cube');
  });

  it('triggers onOpenAiTutor when clicking AI item', () => {
    const onOpenAiTutor = vi.fn();
    render(
      <GroupedToolBar
        activeTool="select"
        onToolSelect={vi.fn()}
        onOpenAiTutor={onOpenAiTutor}
      />
    );

    const aiGroup = screen.getByRole('button', { name: 'Kelompok alat AI Tutor' });
    fireEvent.click(aiGroup);

    const aiItem = screen.getByRole('menuitem', { name: 'Tanya AI Assistant' });
    fireEvent.click(aiItem);

    expect(onOpenAiTutor).toHaveBeenCalled();
  });
});
