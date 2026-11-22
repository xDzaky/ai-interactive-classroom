import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceLayout } from './WorkspaceLayout';

const mockObjects = [
  { id: 'solid-1', type: 'viz_solid', label: 'Kubus ABCD.EFGH', color: '#6366f1' },
];

describe('WorkspaceLayout Component (P13-T07)', () => {
  it('renders top navbar, objects panel toggle, and floating grouped toolbar', () => {
    render(
      <WorkspaceLayout
        objects={mockObjects}
        onSelectObject={vi.fn()}
        onToggleObjectVisibility={vi.fn()}
        onToggleObjectLock={vi.fn()}
        onRenameObject={vi.fn()}
        onDeleteObject={vi.fn()}
        activeTool="pen"
        onToolSelect={vi.fn()}
      >
        <div data-testid="canvas-child">Canvas Content</div>
      </WorkspaceLayout>
    );

    expect(screen.getByText('Kelas Interaktif AI')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-child')).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Toolbar Geometri dan Papan Tulis' })).toBeInTheDocument();
    expect(screen.getByLabelText('Sembunyikan Panel Objek')).toBeInTheDocument();
  });

  it('toggles objects panel visibility when clicking the header toggle button', () => {
    render(
      <WorkspaceLayout
        objects={mockObjects}
        onSelectObject={vi.fn()}
        onToggleObjectVisibility={vi.fn()}
        onToggleObjectLock={vi.fn()}
        onRenameObject={vi.fn()}
        onDeleteObject={vi.fn()}
        activeTool="pen"
        onToolSelect={vi.fn()}
      >
        <div>Canvas Content</div>
      </WorkspaceLayout>
    );

    const toggleBtn = screen.getByLabelText('Sembunyikan Panel Objek');
    fireEvent.click(toggleBtn);

    // Objects panel is hidden
    expect(screen.queryByLabelText('Panel Objek Aljabar dan Geometri')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Buka Panel Objek')).toBeInTheDocument();
  });

  it('changes mode preset and updates default tool', () => {
    const onToolSelect = vi.fn();
    render(
      <WorkspaceLayout
        objects={mockObjects}
        onSelectObject={vi.fn()}
        onToggleObjectVisibility={vi.fn()}
        onToggleObjectLock={vi.fn()}
        onRenameObject={vi.fn()}
        onDeleteObject={vi.fn()}
        activeTool="pen"
        onToolSelect={onToolSelect}
      >
        <div>Canvas Content</div>
      </WorkspaceLayout>
    );

    const geoModeBtn = screen.getByRole('button', { name: /Mode Geometri/ });
    fireEvent.click(geoModeBtn);

    expect(onToolSelect).toHaveBeenCalledWith('line');
  });
});
