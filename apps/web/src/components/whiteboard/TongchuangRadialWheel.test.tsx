import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TongchuangRadialWheel } from './TongchuangRadialWheel';

describe('TongchuangRadialWheel (Right-click Canvas & Object modes)', () => {
  it('renders canvas-mode radial wheel when right-clicked on empty board', () => {
    render(
      <TongchuangRadialWheel
        mode="canvas"
        position={{ x: 400, y: 300 }}
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

  it('expands concentric color arc in canvas mode and selects a color', () => {
    const onColorChange = vi.fn();
    render(
      <TongchuangRadialWheel
        mode="canvas"
        position={{ x: 400, y: 300 }}
        onColorChange={onColorChange}
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
        mode="canvas"
        position={{ x: 400, y: 300 }}
        onInsertSolid={onInsertSolid}
      />
    );

    fireEvent.click(screen.getByTestId('wheel-slot-solid3d'));
    expect(screen.getByTestId('radial-solid-arc')).toBeTruthy();

    fireEvent.click(screen.getByTestId('wheel-solid-cube'));
    expect(onInsertSolid).toHaveBeenCalledWith('cube');
  });

  it('renders object-mode radial wheel with Convert 3D, Color, Duplicate, Delete, and AI Explain', () => {
    const onConvert3D = vi.fn();
    const onExplainAi = vi.fn();
    const onRecolorObject = vi.fn();
    render(
      <TongchuangRadialWheel
        mode="object"
        selectedCount={1}
        canConvert3D={true}
        position={{ x: 400, y: 300 }}
        onConvert3D={onConvert3D}
        onExplainAi={onExplainAi}
        onRecolorObject={onRecolorObject}
      />
    );

    expect(screen.getByTestId('wheel-slot-convert3d')).toBeTruthy();
    fireEvent.click(screen.getByTestId('wheel-slot-convert3d'));
    expect(onConvert3D).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('wheel-slot-obj_color'));
    expect(screen.getByTestId('radial-object-color-arc')).toBeTruthy();
    fireEvent.click(screen.getByTestId('wheel-obj-color-#3b82f6'));
    expect(onRecolorObject).toHaveBeenCalledWith('#3b82f6');

    fireEvent.click(screen.getByTestId('wheel-center-ai'));
    expect(onExplainAi).toHaveBeenCalledTimes(1);
  });
});
