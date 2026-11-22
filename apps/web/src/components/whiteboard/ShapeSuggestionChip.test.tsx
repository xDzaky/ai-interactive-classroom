import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  ShapeSuggestionChip,
  ShapeRevertToast,
} from './ShapeSuggestionChip';

describe('ShapeSuggestionChip', () => {
  it('does not render when visible is false', () => {
    const { container } = render(
      <ShapeSuggestionChip
        visible={false}
        shapeKind="circle"
        position={{ x: 100, y: 100 }}
        onAccept={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders suggestion message and triggers onAccept when Ya clicked', () => {
    const onAccept = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ShapeSuggestionChip
        visible={true}
        shapeKind="circle"
        position={{ x: 100, y: 100 }}
        onAccept={onAccept}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByTestId('shape-suggestion-chip')).toBeTruthy();
    expect(screen.getByText(/Lingkaran/)).toBeTruthy();

    const acceptBtn = screen.getByRole('button', { name: /Konfirmasi ubah/ });
    fireEvent.click(acceptBtn);
    expect(onAccept).toHaveBeenCalledTimes(1);

    const dismissBtn = screen.getByRole('button', { name: /Tolak saran/ });
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('ShapeRevertToast', () => {
  it('does not render when visible is false', () => {
    const { container } = render(
      <ShapeRevertToast
        visible={false}
        shapeKind="rect"
        onRevert={vi.fn()}
        onDismiss={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders revert button and triggers onRevert when clicked', () => {
    const onRevert = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ShapeRevertToast
        visible={true}
        shapeKind="rect"
        onRevert={onRevert}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByTestId('shape-revert-toast')).toBeTruthy();
    const revertBtn = screen.getByRole('button', { name: /Kembalikan coretan/i });
    fireEvent.click(revertBtn);
    expect(onRevert).toHaveBeenCalledTimes(1);
  });
});
