import { describe, it, expect } from 'vitest';
import { parseIndonesianVoiceCommand } from './useVoiceCommands';

describe('parseIndonesianVoiceCommand (P15-T02)', () => {
  it('parses 3D solid voice commands in Indonesian', () => {
    expect(parseIndonesianVoiceCommand('Buat kubus')).toEqual({
      kind: 'insert_solid',
      solidType: 'cube',
      label: 'Kubus',
    });
    expect(parseIndonesianVoiceCommand('Tampilkan tabung 3D')).toEqual({
      kind: 'insert_solid',
      solidType: 'cylinder',
      label: 'Tabung',
    });
    expect(parseIndonesianVoiceCommand('gambar limas')).toEqual({
      kind: 'insert_solid',
      solidType: 'pyramid',
      label: 'Limas',
    });
  });

  it('parses graph, tool, undo, and summary commands', () => {
    expect(parseIndonesianVoiceCommand('Grafik parabola')).toEqual({
      kind: 'insert_graph',
      expression: 'x^2 - 3',
    });
    expect(parseIndonesianVoiceCommand('pilih objek')).toEqual({
      kind: 'set_tool',
      tool: 'select',
    });
    expect(parseIndonesianVoiceCommand('kembalikan')).toEqual({ kind: 'undo' });
    expect(parseIndonesianVoiceCommand('buat ringkasan pelajaran')).toEqual({
      kind: 'open_summary',
    });
  });

  it('returns unknown safely for unrecognized phrases', () => {
    expect(parseIndonesianVoiceCommand('halo apa kabar')).toEqual({
      kind: 'unknown',
      raw: 'halo apa kabar',
    });
  });
});
