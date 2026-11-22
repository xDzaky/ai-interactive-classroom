import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectsPanel, type BoardObjectItem } from './ObjectsPanel';

const mockObjects: BoardObjectItem[] = [
  { id: 'solid-1', type: 'viz_solid', label: 'Kubus ABCD.EFGH', color: '#6366f1' },
  { id: 'rect-1', type: 'rect', label: 'Persegi 10x10', color: '#10b981' },
  { id: 'graph-1', type: 'graph', label: 'f(x) = x^2', color: '#ef4444' },
];

describe('ObjectsPanel Component (P13-T07)', () => {
  it('renders categorized list of objects', () => {
    render(
      <ObjectsPanel
        objects={mockObjects}
        onSelect={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Daftar Objek (3)')).toBeInTheDocument();
    expect(screen.getByText('Bangun Ruang (3D)')).toBeInTheDocument();
    expect(screen.getByText('Bentuk Datar (2D)')).toBeInTheDocument();
    expect(screen.getByText('Grafik & Fungsi')).toBeInTheDocument();
    expect(screen.getByText('Kubus ABCD.EFGH')).toBeInTheDocument();
  });

  it('filters objects by search term', () => {
    render(
      <ObjectsPanel
        objects={mockObjects}
        onSelect={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const input = screen.getByLabelText('Filter objek');
    fireEvent.change(input, { target: { value: 'Kubus' } });

    expect(screen.getByText('Kubus ABCD.EFGH')).toBeInTheDocument();
    expect(screen.queryByText('Persegi 10x10')).not.toBeInTheDocument();
  });

  it('triggers onSelect, onToggleVisibility, onToggleLock, onDelete callbacks', () => {
    const onSelect = vi.fn();
    const onToggleVisibility = vi.fn();
    const onToggleLock = vi.fn();
    const onDelete = vi.fn();

    render(
      <ObjectsPanel
        objects={mockObjects}
        onSelect={onSelect}
        onToggleVisibility={onToggleVisibility}
        onToggleLock={onToggleLock}
        onRename={vi.fn()}
        onDelete={onDelete}
      />
    );

    // Select
    fireEvent.click(screen.getByText('Kubus ABCD.EFGH'));
    expect(onSelect).toHaveBeenCalledWith('solid-1');

    // Visibility
    const visBtn = screen.getByLabelText('Sembunyikan Kubus ABCD.EFGH');
    fireEvent.click(visBtn);
    expect(onToggleVisibility).toHaveBeenCalledWith('solid-1', true);

    // Lock
    const lockBtn = screen.getByLabelText('Kunci Kubus ABCD.EFGH');
    fireEvent.click(lockBtn);
    expect(onToggleLock).toHaveBeenCalledWith('solid-1', true);

    // Delete
    const delBtn = screen.getByLabelText('Hapus Kubus ABCD.EFGH');
    fireEvent.click(delBtn);
    expect(onDelete).toHaveBeenCalledWith('solid-1');
  });

  it('supports inline rename via double click', () => {
    const onRename = vi.fn();
    render(
      <ObjectsPanel
        objects={mockObjects}
        onSelect={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />
    );

    const itemSpan = screen.getByText('Persegi 10x10');
    fireEvent.doubleClick(itemSpan);

    const renameInput = screen.getByLabelText('Ubah nama Persegi 10x10') as HTMLInputElement;
    expect(renameInput).toBeInTheDocument();

    fireEvent.change(renameInput, { target: { value: 'Kotak Baru' } });
    fireEvent.keyDown(renameInput, { key: 'Enter', code: 'Enter' });

    expect(onRename).toHaveBeenCalledWith('rect-1', 'Kotak Baru');
  });
});
