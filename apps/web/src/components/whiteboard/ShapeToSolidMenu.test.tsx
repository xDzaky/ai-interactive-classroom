import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ShapeToSolidMenu } from './ShapeToSolidMenu';

describe('ShapeToSolidMenu Component (P11-T08)', () => {
  it('does not render when shape is null', () => {
    const { container } = render(
      <ShapeToSolidMenu shape={null} onSelectProposal={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders solid proposals for rectangle and triggers callback on click', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ShapeToSolidMenu
        shape={{ id: 'rect-1', object_type: 'rect', props: { x: 50, y: 50, w: 200, h: 100 } }}
        onSelectProposal={onSelect}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByTestId('shape-to-solid-menu')).toBeTruthy();
    expect(screen.getByText(/Ubah ke Bangun Ruang 3D/)).toBeTruthy();

    const cuboidBtn = screen.getByTestId('proposal-btn-cuboid');
    expect(cuboidBtn).toBeTruthy();
    fireEvent.click(cuboidBtn);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].solidType).toBe('cuboid');
  });
});
