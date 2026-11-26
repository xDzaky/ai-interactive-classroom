/**
 * classroomBlockBridge.ts — Bidirectional Bridge between AI Interactive Classroom Engines
 * (3D Solid / Gimbal, ManimGX, 12 Virtual Labs, MathLive/Graphs) and AFFiNE / BlockSuite Docs (V7).
 */
import { Text, type Doc } from '@blocksuite/store';
import type { SolidType } from '@ai-classroom/geometry-core';
import { analyzeForManimGX, type ManimGxAnalysis } from '@ai-classroom/math-core';

export type ClassroomEmbedKind = 'solid3d' | 'manimgx' | 'virtual_lab' | 'math_graph';

export interface ClassroomEmbedPayload {
  kind: ClassroomEmbedKind;
  title: string;
  formula?: string;
  solidType?: SolidType;
  labSimId?: string;
  createdAt?: number;
}

const TRANSFER_QUEUE_KEY = 'aic-wb-to-affine-transfer-v1';

/**
 * Inserts a structured AI Classroom block (Heading/Callout + formula/reference metadata)
 * directly into the active BlockSuite Doc's note tree.
 */
export function insertClassroomBlockIntoDoc(doc: Doc, payload: ClassroomEmbedPayload): string | null {
  const notes = doc.getBlocksByFlavour('affine:note');
  const noteId = notes[0]?.id ?? (doc.root ? doc.addBlock('affine:note', {}, doc.root.id) : null);
  if (!noteId) return null;

  const badgeMap: Record<ClassroomEmbedKind, string> = {
    solid3d: '🧊 Model 3D Interaktif',
    manimgx: '🎬 Visualisasi ManimGX',
    virtual_lab: '🔬 Laboratorium Virtual',
    math_graph: '📈 Grafik & Rumus Matematika',
  };

  const detail = payload.formula
    ? `Rumus: ${payload.formula}`
    : payload.solidType
      ? `Bangun Ruang: ${payload.solidType}`
      : payload.labSimId
        ? `Simulasi: ${payload.labSimId}`
        : 'Modul Interaktif AI Classroom';

  const blockId = doc.addBlock(
    'affine:paragraph',
    {
      type: 'quote',
      text: new Text(`${badgeMap[payload.kind]} — ${payload.title} · ${detail}`),
    },
    noteId,
  );

  return blockId;
}

/**
 * Queues a Whiteboard object (3D Solid, ManimGX, MathBlock, etc.) to be automatically
 * embedded into the active AFFiNE Workspace document upon navigation.
 */
export function queueWhiteboardToAffineTransfer(payload: ClassroomEmbedPayload): void {
  try {
    sessionStorage.setItem(
      TRANSFER_QUEUE_KEY,
      JSON.stringify({ ...payload, createdAt: Date.now() }),
    );
  } catch {
    // ignore storage quota errors
  }
}

export function consumeWhiteboardToAffineTransfer(): ClassroomEmbedPayload | null {
  try {
    const raw = sessionStorage.getItem(TRANSFER_QUEUE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(TRANSFER_QUEUE_KEY);
    return JSON.parse(raw) as ClassroomEmbedPayload;
  } catch {
    return null;
  }
}

/**
 * Infers a 3D SolidType from highlighted Indonesian/English math text in AFFiNE.
 */
export function inferSolidTypeFromText(text: string): SolidType {
  const t = text.toLowerCase();
  if (/kubus|cube|dadu/.test(t)) return 'cube';
  if (/balok|cuboid|kotak/.test(t)) return 'cuboid';
  if (/bola|sphere/.test(t)) return 'sphere';
  if (/tabung|silinder|cylinder/.test(t)) return 'cylinder';
  if (/kerucut|cone/.test(t)) return 'cone';
  if (/limas|pyramid/.test(t)) return 'pyramid';
  if (/prisma|prism/.test(t)) return 'prism';
  if (/torus|donat/.test(t)) return 'torus';
  return 'cube';
}

/**
 * Analyzes selected text/LaTeX inside AFFiNE to trigger either ManimGX or 3D Solid viewer.
 */
export function analyzeSelectedTextForClassroom(text: string): {
  cleaned: string;
  manimgx: ManimGxAnalysis;
  solidType: SolidType;
} {
  const cleaned = text.trim() || '(x - 2)^2 + (y - 1)^2 = 9';
  return {
    cleaned,
    manimgx: analyzeForManimGX({ latex: cleaned }),
    solidType: inferSolidTypeFromText(cleaned),
  };
}
