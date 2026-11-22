/**
 * useVoiceCommands.ts — P15-T02
 * Deterministic Indonesian voice command parser + Web Speech API hook
 * with graceful fallback for browsers without SpeechRecognition (e.g. Firefox/Floorp).
 */

import { useState, useCallback, useRef } from 'react';
import type { SolidType } from '@ai-classroom/geometry-core';
import type { ToolType } from '@/hooks/useWhiteboardTool';

export type ParsedVoiceIntent =
  | { kind: 'insert_solid'; solidType: SolidType; label: string }
  | { kind: 'insert_graph'; expression: string }
  | { kind: 'set_tool'; tool: ToolType }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'open_summary' }
  | { kind: 'clear_board' }
  | { kind: 'unknown'; raw: string };

/**
 * Pure deterministic Indonesian natural-language parser for Tongchuang voice commands.
 * Safe by design: never evaluates arbitrary code; maps strictly to known whiteboard intents.
 */
export function parseIndonesianVoiceCommand(transcript: string): ParsedVoiceIntent {
  const text = transcript.toLowerCase().trim();
  if (!text) return { kind: 'unknown', raw: transcript };

  // 3D solid commands (word boundaries prevent "parabola" from matching "bola")
  if (/\b(kubus|cube)\b/.test(text)) return { kind: 'insert_solid', solidType: 'cube', label: 'Kubus' };
  if (/\b(balok|cuboid)\b/.test(text)) return { kind: 'insert_solid', solidType: 'cuboid', label: 'Balok' };
  if (/\b(tabung|silinder|cylinder)\b/.test(text)) return { kind: 'insert_solid', solidType: 'cylinder', label: 'Tabung' };
  if (/\b(kerucut|cone)\b/.test(text)) return { kind: 'insert_solid', solidType: 'cone', label: 'Kerucut' };
  if (/\b(bola|sphere)\b/.test(text)) return { kind: 'insert_solid', solidType: 'sphere', label: 'Bola' };
  if (/\b(limas|piramida|pyramid)\b/.test(text)) return { kind: 'insert_solid', solidType: 'pyramid', label: 'Limas' };
  if (/\b(prisma|prism)\b/.test(text)) return { kind: 'insert_solid', solidType: 'prism', label: 'Prisma' };

  // Graph commands
  if (/(grafik|fungsi|parabola|sinus|cosinus)/.test(text)) {
    if (/sin/.test(text)) return { kind: 'insert_graph', expression: 'sin(x)' };
    if (/cos/.test(text)) return { kind: 'insert_graph', expression: 'cos(x)' };
    if (/parabola|kuadrat|x\^2/.test(text)) return { kind: 'insert_graph', expression: 'x^2 - 3' };
    return { kind: 'insert_graph', expression: 'x^2' };
  }

  // Tool switching
  if (/(pilih|seleksi|select)/.test(text)) return { kind: 'set_tool', tool: 'select' };
  if (/(pena|tulis|gambar|kapur)/.test(text)) return { kind: 'set_tool', tool: 'pen' };
  if (/(penghapus|hapus coretan|eraser)/.test(text)) return { kind: 'set_tool', tool: 'eraser' };

  // Undo / Redo / Summary / Clear
  if (/(undo|kembalikan|batal)/.test(text)) return { kind: 'undo' };
  if (/(redo|ulangi)/.test(text)) return { kind: 'redo' };
  if (/(ringkasan|rangkuman|kesimpulan|summary)/.test(text)) return { kind: 'open_summary' };
  if (/(bersihkan papan|hapus semua)/.test(text)) return { kind: 'clear_board' };

  return { kind: 'unknown', raw: transcript };
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceCommands(onIntent: (intent: ParsedVoiceIntent) => void) {
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    );

  const executeTextCommand = useCallback(
    (text: string) => {
      setLastTranscript(text);
      const intent = parseIndonesianVoiceCommand(text);
      onIntent(intent);
      return intent;
    },
    [onIntent]
  );

  const startListening = useCallback(() => {
    if (!isSupported || isListening) return;
    const SpeechCtor = (
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ) as new () => SpeechRecognitionLike;

    const rec = new SpeechCtor();
    rec.lang = 'id-ID';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript ?? '';
      if (text) executeTextCommand(text);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    setIsListening(true);
    rec.start();
  }, [isSupported, isListening, executeTextCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    isSupported,
    isListening,
    lastTranscript,
    startListening,
    stopListening,
    executeTextCommand,
  };
}
