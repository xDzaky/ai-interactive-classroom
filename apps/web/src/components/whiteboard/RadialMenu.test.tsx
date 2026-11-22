import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadialMenu, type RadialMenuItem } from './RadialMenu';

const mockItems: RadialMenuItem[] = [
  { id: 'pen', label: 'Pena', icon: '✏️', action: vi.fn() },
  { id: 'cube', label: 'Kubus 3D', icon: '🧊', action: vi.fn() },
  { id: 'graph', label: 'Grafik', icon: '📈', action: vi.fn() },
  { id: 'eraser', label: 'Hapus', icon: '⌫', action: vi.fn() },
];

describe('RadialMenu Component (P12-T01)', () => {
  it('renders center button with aria-expanded=false initially', () => {
    render(<RadialMenu items={mockItems} />);

    const centerBtn = screen.getByLabelText('Buka Menu Aksi Cepat AI');
    expect(centerBtn).toBeInTheDocument();
    expect(centerBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu', { name: 'Pilihan Menu Radial' })).not.toBeInTheDocument();
  });

  it('opens radial items on center click and triggers action', () => {
    const actionSpy = vi.fn();
    const items = [
      ...mockItems.slice(0, 3),
      { id: 'test_action', label: 'Aksi Uji', icon: '⭐', action: actionSpy },
    ];

    render(<RadialMenu items={items} />);

    const centerBtn = screen.getByLabelText('Buka Menu Aksi Cepat AI');
    fireEvent.click(centerBtn);

    expect(centerBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Pilihan Menu Radial' })).toBeInTheDocument();

    const actionBtn = screen.getByRole('menuitem', { name: 'Aksi Uji' });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(actionSpy).toHaveBeenCalled();

    // Menu closes after action
    expect(screen.queryByRole('menu', { name: 'Pilihan Menu Radial' })).not.toBeInTheDocument();
  });

  it('closes when pressing Escape key', () => {
    render(<RadialMenu items={mockItems} />);

    const centerBtn = screen.getByLabelText('Buka Menu Aksi Cepat AI');
    fireEvent.click(centerBtn);

    expect(screen.getByRole('menu', { name: 'Pilihan Menu Radial' })).toBeInTheDocument();

    const region = screen.getByRole('region', { name: 'Menu Radial Cepat' });
    fireEvent.keyDown(region, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByRole('menu', { name: 'Pilihan Menu Radial' })).not.toBeInTheDocument();
  });
});
