import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TongchuangSolidWidget, projectSectionPolygon2D } from './TongchuangSolidWidget';
import { buildPolyhedron, planeFrom3Points, intersectPolyhedronPlane } from '@ai-classroom/geometry-core';

// Mock WebGLRenderer & OrbitControls in jsdom (no GPU context in unit tests)
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    enableDamping = true;
    dampingFactor = 0.08;
    autoRotate = false;
    autoRotateSpeed = 2;
    target = { set: vi.fn() };
    update = vi.fn();
    dispose = vi.fn();
  },
}));

describe('TongchuangSolidWidget (Pure Three.js — React 19 native)', () => {
  it('computes exact 2D projected interior angles for a cube triangular cross-section', () => {
    const cube = buildPolyhedron('cube', { s: 4 });
    const plane = planeFrom3Points(cube.vertices[0], cube.vertices[2], cube.vertices[5]);
    expect(plane).not.toBeNull();
    const section = intersectPolyhedronPlane(cube, plane!);
    expect(section).not.toBeNull();

    const projected = projectSectionPolygon2D(section!);
    expect(projected.points2D.length).toBe(3);
    expect(projected.anglesDeg).toEqual([60, 60, 60]);
    expect(projected.area).toBeGreaterThan(0);
  });

  it('renders the white contextual action bar and toggles section, unfold, explode, and measure modes', () => {
    render(
      <TongchuangSolidWidget
        id="cube-1"
        params={{ type: 'cube', s: 4 }}
        label="Kubus ABCD.EFGH"
        selected={true}
      />
    );

    expect(screen.getByTestId('solid-action-bar-cube-1')).toBeTruthy();

    fireEvent.click(screen.getByTestId('solid-btn-section-cube-1'));
    expect(screen.getByTestId('extracted-section-2d')).toBeTruthy();

    fireEvent.click(screen.getByTestId('solid-btn-measure-cube-1'));
    expect(screen.getByTestId('solid-measure-hud')).toHaveTextContent('64.00 cm³');

    fireEvent.click(screen.getByTestId('solid-btn-unfold-cube-1'));
    expect(screen.getByTestId('dihedral-angle-badge')).toBeTruthy();
  });
});
