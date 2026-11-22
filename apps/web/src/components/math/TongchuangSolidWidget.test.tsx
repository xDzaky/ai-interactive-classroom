import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TongchuangSolidWidget, projectSectionPolygon2D } from './TongchuangSolidWidget';
import { buildPolyhedron, planeFrom3Points, intersectPolyhedronPlane } from '@ai-classroom/geometry-core';

// Mock @react-three/fiber and @react-three/drei for jsdom unit tests
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-r3f-canvas">{children}</div>,
  useFrame: () => {},
  useThree: () => ({
    camera: { position: { set: vi.fn() }, lookAt: vi.fn() },
    gl: { domElement: null },
  }),
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('TongchuangSolidWidget (P12/P13)', () => {
  it('computes exact 2D projected interior angles for a cube triangular cross-section', () => {
    const cube = buildPolyhedron('cube', { s: 4 });
    // Vertices A(0), C(2), F(5) form an equilateral triangle (60° each)
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

    // Activate 3-point cross-section -> should render side-by-side 2D extracted projection
    fireEvent.click(screen.getByTestId('solid-btn-section-cube-1'));
    expect(screen.getByTestId('extracted-section-2d')).toBeTruthy();

    // Activate measure -> should show Volume & Surface Area HUD
    fireEvent.click(screen.getByTestId('solid-btn-measure-cube-1'));
    expect(screen.getByTestId('solid-measure-hud')).toHaveTextContent('64.00 cm³');

    // Activate unfold -> should show dihedral angle badge
    fireEvent.click(screen.getByTestId('solid-btn-unfold-cube-1'));
    expect(screen.getByTestId('dihedral-angle-badge')).toBeTruthy();
  });
});
