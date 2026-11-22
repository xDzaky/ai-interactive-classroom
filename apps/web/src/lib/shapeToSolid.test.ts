import { describe, it, expect } from 'vitest';
import { proposeSolidsFromShape, createConvertShapeToSolidEvent } from './shapeToSolid';

describe('Datar -> Ruang Proposals (P11-T08)', () => {
  it('converts rectangle (200x120 world units) to balok 10x6 cm', () => {
    const proposals = proposeSolidsFromShape({
      id: 'rect-1',
      object_type: 'rect',
      props: { x: 50, y: 50, w: 200, h: 120 },
    });

    expect(proposals.length).toBeGreaterThanOrEqual(1);
    const balok = proposals.find((p) => p.solidType === 'cuboid');
    expect(balok).toBeDefined();
    expect(balok!.params).toEqual({
      type: 'cuboid',
      l: 10,
      w: 6,
      h: 6,
    });
  });

  it('converts square (200x200 world units) to kubus and balok', () => {
    const proposals = proposeSolidsFromShape({
      id: 'square-1',
      object_type: 'rect',
      props: { x: 0, y: 0, w: 200, h: 200 },
    });

    const cube = proposals.find((p) => p.solidType === 'cube');
    expect(cube).toBeDefined();
    expect(cube!.params).toEqual({
      type: 'cube',
      s: 10,
    });
  });

  it('converts circle (r=80 world units = 4 cm) to tabung, kerucut, and bola', () => {
    const proposals = proposeSolidsFromShape({
      id: 'circle-1',
      object_type: 'circle',
      props: { cx: 100, cy: 100, r: 80 },
    });

    expect(proposals.some((p) => p.solidType === 'cylinder')).toBe(true);
    expect(proposals.some((p) => p.solidType === 'cone')).toBe(true);
    expect(proposals.some((p) => p.solidType === 'sphere')).toBe(true);
  });

  it('generates a valid object.created event from solid proposal', () => {
    const shape = {
      id: 'square-1',
      object_type: 'rect',
      props: { x: 0, y: 0, w: 200, h: 200 },
    };
    const proposals = proposeSolidsFromShape(shape);
    const proposal = proposals[0];
    const event = createConvertShapeToSolidEvent(shape, proposal, 'room-1', 'teacher-1', 'solid-123');

    expect(event.event_type).toBe('object.created');
    expect(event.payload.id).toBe('solid-123');
    expect(event.payload.object_type).toBe('viz_solid');
    expect(event.payload.props.solid_type).toBe(proposal.solidType);
    expect(event.payload.props.x).toBe(proposal.position.x);
    expect(event.payload.props.y).toBe(proposal.position.y);
  });
});

