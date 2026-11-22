/**
 * WhiteboardContextMenu.test.tsx
 * Unit tests for WhiteboardContextMenu component.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WhiteboardContextMenu } from './WhiteboardContextMenu';
import type { ActionItem, ActionContext } from '@/features/whiteboard/actionRegistry';

describe('WhiteboardContextMenu', () => {
  const mockActionContext: ActionContext = {
    selectedIds: ['obj-1'],
    scene: { id: 'main', objects: {}, strokes: {}, order: [] },
    boardState: { room_id: 'r1', scenes: {}, active_scene_id: 'main', last_seq: 1 },
    roomId: 'r1',
    actorId: 'u1',
    onEvent: vi.fn(),
  };

  const mockActions: ActionItem[] = [
    {
      id: 'duplicate',
      label: 'Duplikat',
      icon: '📋',
      category: 'edit',
      shortcut: 'Ctrl+D',
      appliesTo: () => true,
      run: vi.fn(),
    },
    {
      id: 'delete',
      label: 'Hapus Objek',
      icon: '🗑️',
      category: 'edit',
      shortcut: 'Del',
      appliesTo: () => true,
      run: vi.fn(),
    },
  ];

  it('renders menu items and shortcuts correctly', () => {
    render(
      <WhiteboardContextMenu
        x={100}
        y={150}
        actions={mockActions}
        actionContext={mockActionContext}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('whiteboard-context-menu')).toBeInTheDocument();
    expect(screen.getByText('Duplikat')).toBeInTheDocument();
    expect(screen.getByText('Hapus Objek')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+D')).toBeInTheDocument();
  });

  it('triggers action.run and onClose when clicking a menu item', () => {
    const onClose = vi.fn();
    render(
      <WhiteboardContextMenu
        x={100}
        y={150}
        actions={mockActions}
        actionContext={mockActionContext}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('context-action-duplicate'));
    expect(mockActions[0].run).toHaveBeenCalledWith(mockActionContext);
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    render(
      <WhiteboardContextMenu
        x={100}
        y={150}
        actions={mockActions}
        actionContext={mockActionContext}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders color palette and allows selecting color', () => {
    const onSelectColor = vi.fn();
    const onClose = vi.fn();
    render(
      <WhiteboardContextMenu
        x={100}
        y={150}
        actions={mockActions}
        actionContext={mockActionContext}
        onClose={onClose}
        onSelectColor={onSelectColor}
      />
    );

    const redChip = screen.getByTestId('color-chip-#ef4444');
    expect(redChip).toBeInTheDocument();
    fireEvent.click(redChip);

    expect(onSelectColor).toHaveBeenCalledWith('#ef4444');
    expect(onClose).toHaveBeenCalled();
  });
});
