/**
 * SelectionToolbar.test.tsx
 * Tests for SelectionToolbar floating pill component.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionToolbar } from './SelectionToolbar';
import type { ActionItem, ActionContext } from '@/features/whiteboard/actionRegistry';

describe('SelectionToolbar', () => {
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
      appliesTo: () => true,
      run: vi.fn(),
    },
    {
      id: 'delete',
      label: 'Hapus',
      icon: '🗑️',
      category: 'edit',
      appliesTo: () => true,
      run: vi.fn(),
    },
  ];

  it('renders quick action buttons and handles clicks', () => {
    const onOpenMore = vi.fn();
    render(
      <SelectionToolbar
        x={200}
        y={300}
        actions={mockActions}
        actionContext={mockActionContext}
        onOpenMoreMenu={onOpenMore}
      />
    );

    expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument();
    const dupBtn = screen.getByTestId('quick-action-duplicate');
    expect(dupBtn).toBeInTheDocument();
    fireEvent.click(dupBtn);
    expect(mockActions[0].run).toHaveBeenCalledWith(mockActionContext);

    const moreBtn = screen.getByTestId('selection-more-btn');
    fireEvent.click(moreBtn);
    expect(onOpenMore).toHaveBeenCalled();
  });

  it('does not render when selectedIds is empty', () => {
    const emptyContext = { ...mockActionContext, selectedIds: [] };
    const { container } = render(
      <SelectionToolbar
        x={200}
        y={300}
        actions={mockActions}
        actionContext={emptyContext}
        onOpenMoreMenu={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
