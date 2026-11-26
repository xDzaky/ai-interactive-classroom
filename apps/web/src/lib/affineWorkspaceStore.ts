/**
 * affineWorkspaceStore.ts — Local-First AFFiNE / BlockSuite Yjs DocCollection & Persistence (V7)
 *
 * Reuses official @blocksuite/store + @blocksuite/blocks + @blocksuite/presets + y-indexeddb
 * without rebuilding any document/edgeless engine from scratch.
 */
import { DocCollection, Schema, Text, type Doc } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks/schemas';
import { effects as registerBlockSuiteEffects } from '@blocksuite/presets/effects';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface AffineDocMeta {
  id: string;
  title: string;
  updatedAt: number;
  defaultMode: 'page' | 'edgeless';
}

const DOCS_META_KEY = 'aic-affine-docs-meta-v1';

let effectsRegistered = false;
let singletonCollection: DocCollection | null = null;
const persistenceMap = new Map<string, IndexeddbPersistence>();
const loadedDocs = new Map<string, Promise<Doc>>();

/**
 * Idempotently registers all BlockSuite Web Components (affine-editor-container,
 * affine-outline-panel, affine-frame-panel, slash menu, database, mindmap, frames, etc.).
 */
export function ensureBlockSuiteEffects(): void {
  if (effectsRegistered) return;
  effectsRegistered = true;
  if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
    registerBlockSuiteEffects();
  }
}

export function getAffineCollection(): DocCollection {
  ensureBlockSuiteEffects();
  if (!singletonCollection) {
    const schema = new Schema().register(AffineSchemas);
    singletonCollection = new DocCollection({
      schema,
      id: 'ai-classroom-affine-workspace',
    });
    singletonCollection.meta.initialize();
  }
  return singletonCollection;
}

export function listAffineDocs(): AffineDocMeta[] {
  try {
    const raw = localStorage.getItem(DOCS_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AffineDocMeta[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      }
    }
  } catch {
    // ignore storage errors
  }
  const starter: AffineDocMeta = {
    id: 'doc-beranda-kelas',
    title: 'Catatan & Papan Kelas AI',
    updatedAt: Date.now(),
    defaultMode: 'page',
  };
  saveAffineDocsMeta([starter]);
  return [starter];
}

function saveAffineDocsMeta(list: AffineDocMeta[]): void {
  try {
    localStorage.setItem(DOCS_META_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

export function upsertAffineDocMeta(meta: AffineDocMeta): AffineDocMeta[] {
  const current = listAffineDocs().filter((d) => d.id !== meta.id);
  const next = [meta, ...current].sort((a, b) => b.updatedAt - a.updatedAt);
  saveAffineDocsMeta(next);
  return next;
}

export function renameAffineDocMeta(docId: string, title: string): AffineDocMeta[] {
  const list = listAffineDocs().map((d) =>
    d.id === docId ? { ...d, title: title.trim() || 'Tanpa Judul', updatedAt: Date.now() } : d,
  );
  saveAffineDocsMeta(list);
  return list;
}

export function deleteAffineDocMeta(docId: string): AffineDocMeta[] {
  const persistence = persistenceMap.get(docId);
  if (persistence) {
    void persistence.destroy();
    persistenceMap.delete(docId);
  }
  loadedDocs.delete(docId);
  const remaining = listAffineDocs().filter((d) => d.id !== docId);
  if (remaining.length === 0) {
    const fresh: AffineDocMeta = {
      id: `doc-${Date.now()}`,
      title: 'Catatan Kelas Baru',
      updatedAt: Date.now(),
      defaultMode: 'page',
    };
    saveAffineDocsMeta([fresh]);
    return [fresh];
  }
  saveAffineDocsMeta(remaining);
  return remaining;
}

export function createAffineDocMeta(
  title = 'Catatan Kelas Baru',
  defaultMode: 'page' | 'edgeless' = 'page',
): AffineDocMeta {
  const meta: AffineDocMeta = {
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    updatedAt: Date.now(),
    defaultMode,
  };
  upsertAffineDocMeta(meta);
  return meta;
}

/**
 * Ensures a BlockSuite Doc has valid root `affine:page`, `affine:surface`, and `affine:note`
 * blocks so both Page Mode and Edgeless Mode work seamlessly out of the box.
 */
function ensureDocRootBlocks(doc: Doc, title: string): void {
  if (doc.root) return;
  const pageBlockId = doc.addBlock('affine:page', {
    title: new Text(title),
  });
  doc.addBlock('affine:surface', {}, pageBlockId);
  const noteId = doc.addBlock(
    'affine:note',
    {
      xywh: '[0, 0, 800, 640]',
    },
    pageBlockId,
  );
  doc.addBlock(
    'affine:paragraph',
    {
      text: new Text(
        'Klik di sini untuk mulai mengetik, ketik "/" untuk Slash Menu (Heading, Tabel Database, Kanban, Callout, Kode), atau pindah ke "Kanvas (Edgeless)" untuk menggambar bebas, Mindmap, dan Slide Frame!',
      ),
    },
    noteId,
  );
  doc.resetHistory();
}

/**
 * Opens (or returns cached) BlockSuite Doc backed by Yjs + IndexedDB local-first persistence.
 */
export function openAffineDoc(docId: string, fallbackTitle = 'Catatan Kelas'): Promise<Doc> {
  const cached = loadedDocs.get(docId);
  if (cached) return cached;

  const task = (async () => {
    const collection = getAffineCollection();
    let doc = collection.getDoc(docId);
    if (!doc) {
      doc = collection.createDoc({ id: docId });
    }
    doc.load();

    // Attach IndexedDB local-first Yjs persistence (browser only)
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined' && !persistenceMap.has(docId)) {
      const persistence = new IndexeddbPersistence(`aic-affine-doc-${docId}`, doc.spaceDoc);
      persistenceMap.set(docId, persistence);
      // Wait for IndexedDB sync (bounded by 1200ms safety timeout so UI never hangs)
      await Promise.race([
        persistence.whenSynced,
        new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
      ]);
    }

    ensureDocRootBlocks(doc, fallbackTitle);
    return doc;
  })();

  loadedDocs.set(docId, task);
  return task;
}

/**
 * Exports all text/heading/list/code blocks from the active BlockSuite Doc to clean Markdown.
 */
export function exportAffineDocToMarkdown(doc: Doc, fallbackTitle = 'catatan-kelas'): string {
  const lines: string[] = [];
  const root = doc.root as unknown as { title?: { toString(): string } } | null;
  const docTitle = root?.title?.toString()?.trim() || fallbackTitle;
  lines.push(`# ${docTitle}`, '');

  const notes = doc.getBlocksByFlavour('affine:note');
  for (const note of notes) {
    const children = (note as unknown as { model?: { children?: unknown[] }; children?: unknown[] }).model?.children
      ?? (note as unknown as { children?: unknown[] }).children
      ?? [];
    for (const rawChild of children) {
      const child = rawChild as {
        flavour?: string;
        text?: { toString(): string };
        type?: string;
        checked?: boolean;
        language?: string;
      };
      const flavour = child.flavour ?? '';
      const model = child;
      const txt = model.text?.toString() ?? '';
      if (flavour === 'affine:paragraph') {
        if (model.type === 'h1') lines.push(`# ${txt}`);
        else if (model.type === 'h2') lines.push(`## ${txt}`);
        else if (model.type === 'h3') lines.push(`### ${txt}`);
        else if (model.type === 'h4') lines.push(`#### ${txt}`);
        else if (model.type === 'quote') lines.push(`> ${txt}`);
        else lines.push(txt);
      } else if (flavour === 'affine:list') {
        if (model.type === 'numbered') lines.push(`1. ${txt}`);
        else if (model.type === 'todo') lines.push(`- [${model.checked ? 'x' : ' '}] ${txt}`);
        else lines.push(`- ${txt}`);
      } else if (flavour === 'affine:code') {
        lines.push(`\`\`\`${model.language ?? ''}`, txt, '```');
      } else if (flavour === 'affine:divider') {
        lines.push('---');
      } else if (txt) {
        lines.push(txt);
      }
      lines.push('');
    }
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * Imports a Markdown string directly into the active BlockSuite Doc's note block.
 */
export function importMarkdownIntoAffineDoc(doc: Doc, markdown: string): number {
  const notes = doc.getBlocksByFlavour('affine:note');
  const targetNoteId = notes[0]?.id ?? doc.addBlock('affine:note', {}, doc.root?.id);
  const rawLines = markdown.replace(/\r\n/g, '\n').split('\n');
  let added = 0;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('### ')) {
      doc.addBlock('affine:paragraph', { type: 'h3', text: new Text(line.slice(4)) }, targetNoteId);
    } else if (line.startsWith('## ')) {
      doc.addBlock('affine:paragraph', { type: 'h2', text: new Text(line.slice(3)) }, targetNoteId);
    } else if (line.startsWith('# ')) {
      doc.addBlock('affine:paragraph', { type: 'h1', text: new Text(line.slice(2)) }, targetNoteId);
    } else if (line.startsWith('> ')) {
      doc.addBlock('affine:paragraph', { type: 'quote', text: new Text(line.slice(2)) }, targetNoteId);
    } else if (line === '---' || line === '***') {
      doc.addBlock('affine:divider', {}, targetNoteId);
    } else if (/^[-*]\s+\[[xX ]\]\s+/.test(line)) {
      const checked = /^[-*]\s+\[[xX]\]/.test(line);
      const body = line.replace(/^[-*]\s+\[[xX ]\]\s+/, '');
      doc.addBlock('affine:list', { type: 'todo', checked, text: new Text(body) }, targetNoteId);
    } else if (/^[-*]\s+/.test(line)) {
      doc.addBlock('affine:list', { type: 'bulleted', text: new Text(line.slice(2)) }, targetNoteId);
    } else if (/^\d+\.\s+/.test(line)) {
      doc.addBlock(
        'affine:list',
        { type: 'numbered', text: new Text(line.replace(/^\d+\.\s+/, '')) },
        targetNoteId,
      );
    } else {
      doc.addBlock('affine:paragraph', { text: new Text(line) }, targetNoteId);
    }
    added += 1;
  }
  return added;
}
