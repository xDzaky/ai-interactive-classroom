import { describe, expect, it, beforeEach } from 'vitest';
import {
  analyzeSelectedTextForClassroom,
  consumeWhiteboardToAffineTransfer,
  inferSolidTypeFromText,
  queueWhiteboardToAffineTransfer,
} from './classroomBlockBridge';
import {
  CLASSROOM_SLASH_ITEMS,
  matchClassroomSlashCommand,
} from '@/components/affine/customSlashItems';

describe('V7 AFFiNE Classroom Bridge & Slash Commands', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('infers Indonesian & English 3D solid types from highlighted text', () => {
    expect(inferSolidTypeFromText('Hitung volume kubus dengan rusuk 5 cm')).toBe('cube');
    expect(inferSolidTypeFromText('Balok panjang 6 lebar 4')).toBe('cuboid');
    expect(inferSolidTypeFromText('Luas permukaan bola r = 7')).toBe('sphere');
    expect(inferSolidTypeFromText('Tabung jari-jari 3 cm')).toBe('cylinder');
    expect(inferSolidTypeFromText('Kerucut tinggi 10 cm')).toBe('cone');
    expect(inferSolidTypeFromText('Limas segi empat')).toBe('pyramid');
    expect(inferSolidTypeFromText('Prisma segitiga')).toBe('prism');
  });

  it('analyzes selected LaTeX for ManimGX & 3D bridge', () => {
    const circleRes = analyzeSelectedTextForClassroom('(x - 2)^2 + (y - 1)^2 = 9');
    expect(circleRes.manimgx.templateKind).toBe('circle_cartesian');

    const surfaceRes = analyzeSelectedTextForClassroom('z = sin(x) * cos(y)');
    expect(surfaceRes.manimgx.templateKind).toBe('surface_3d');
  });

  it('queues and consumes Whiteboard-to-AFFiNE transfer payloads cleanly', () => {
    queueWhiteboardToAffineTransfer({
      kind: 'solid3d',
      title: 'Kubus 5 cm',
      solidType: 'cube',
    });
    const first = consumeWhiteboardToAffineTransfer();
    expect(first?.kind).toBe('solid3d');
    expect(first?.solidType).toBe('cube');
    // Consumed once
    expect(consumeWhiteboardToAffineTransfer()).toBeNull();
  });

  it('matches custom AI Classroom slash commands (/3d, /manimgx, /lab, /grafik)', () => {
    expect(matchClassroomSlashCommand('/')).toHaveLength(CLASSROOM_SLASH_ITEMS.length);
    expect(matchClassroomSlashCommand('/3d')[0]?.kind).toBe('solid3d');
    expect(matchClassroomSlashCommand('/manim')[0]?.kind).toBe('manimgx');
    expect(matchClassroomSlashCommand('/lab')[0]?.kind).toBe('virtual_lab');
    expect(matchClassroomSlashCommand('plain text')).toHaveLength(0);
  });
});
