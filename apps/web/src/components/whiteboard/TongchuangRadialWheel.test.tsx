import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TongchuangRadialWheel } from './TongchuangRadialWheel';

describe('TongchuangRadialWheel', () => {
  it('renders the white circular wheel with center AI button and 6 radial slots', () => {
    render(
      <TongchuangRadialWheel
        activeTool="pen"
        color="#f8fafc"
        strokeWidth={3}
        onToolChange={vi.fn()}
        onColorChange={vi.fn()}
        onStrokeWidthChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('tongchuang-radial-wheel')).toBeTruthy();
    expect(screen.getByTestId('wheel-center-ai')).toHaveTextContent('AI');
    expect(screen.getByTestId('wheel-slot-select')).toBeTruthy();
    expect(screen.getByTestId('wheel-slot-pen')).toBeTruthy();
    expect(screen.getByTestId('wheel-slot-solid3d')).toBeTruthy();
    expect(screen.getByTestId('wheel-slot-eraser')).toBeTruthy();
  });

  it('expands concentric color and stroke width arc when pen slot is clicked', () => {
    const onColorChange = vi.fn();
    render(
      <TongchuangRadialWheel
        activeTool="pen"
        color="#f8fafc"
        strokeWidth={3}
        onToolChange={vi.fn()}
        onColorChange={onColorChange}
        onStrokeWidthChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('wheel-slot-pen'));
    expect(screen.getByTestId('radial-pen-arc')).toBeTruthy();

    fireEvent.click(screen.getByTestId('wheel-color-#ef4444'));
    expect(onColorChange).toHaveBeenCalledWith('#ef4444');
  });

  it('expands 3D solids arc and invokes onInsertSolid when Kubus is selected', () => {
    const onInsertSolid = vi.fn();
    render(
      <TongchuangRadialWheel
        activeTool="pen"
        color="#f8fafc"
        strokeWidth={3}
        onToolChange={vi.fn()}
        onColorChange={vi.fn()}
        onStrokeWidthChange={vi.fn()}
        onInsertSolid={onInsertSolid}
      />
    );

    fireEvent.click(screen.getByTestId('wheel-slot-solid3d'));
    expect(screen.getByTestId('radial-solid-arc')).toBeTruthy();

    fireEvent.click(screen.getByTestId('wheel-solid-cube'));
    expect(onInsertSolid).toHaveBeenCalledWith('cube');
  });

  it('opens AI smart arc when center AI button is clicked and closes on Escape', () => {
    render(
      <TongchuangRadialWheel
        activeTool="pen"
        color="#f8fafc"
        strokeWidth={3}
        onToolChange={vi.fn()}
        onColorChange={vi.fn()}
        onStrokeWidthChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('wheel-center-ai'));
    expect(screen.getByTestId('radial-ai-arc')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('radial-ai-arc')).toBeNull();
  });
});
