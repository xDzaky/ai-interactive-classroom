/**
 * notesStore.ts — Dexie IndexedDB Persistence for Freenote-Style /notes Workspace (V5)
 */
import Dexie, { type Table } from 'dexie';
import type {
  NotebookDocument,
  NotebookFolder,
  NotePage,
  PaperTemplateKind,
} from '@ai-classroom/whiteboard-core';

class NotesDexieDB extends Dexie {
  notebooks!: Table<NotebookDocument, string>;
  folders!: Table<NotebookFolder, string>;

  constructor() {
    super('ai_classroom_notes_v5');
    this.version(1).stores({
      notebooks: 'id, folderId, updatedAt',
      folders: 'id, createdAt',
    });
  }
}

const notesDb = new NotesDexieDB();

export function createNotePage(
  index: number,
  template: PaperTemplateKind = 'dot_grid',
  mode: 'infinite' | 'paged' = 'paged',
): NotePage {
  return {
    id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    index,
    mode,
    pageSize: { widthPx: 820, heightPx: 1120, preset: 'A4' },
    template,
    templateColor: '#cbd5e1',
    templateSpacingPx: 28,
    bookmarked: false,
    layers: [
      { id: 'layer-1', name: 'Lapisan 1', visible: true, locked: false, opacity: 1, order: 0 },
    ],
    objects: [],
    strokes: [],
    tapes: [],
    stickers: [],
    texts: [],
  };
}

export function createDefaultNotebook(
  title = 'Notebook Tanpa Judul 1',
  folderId: string | null = null,
  template: PaperTemplateKind = 'dot_grid',
  mode: 'infinite' | 'paged' = 'paged',
): NotebookDocument {
  const now = Date.now();
  return {
    id: `nb-${now}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    folderId,
    coverColor: '#b59e84',
    trashed: false,
    createdAt: now,
    updatedAt: now,
    pages: [
      createNotePage(0, template, mode),
      createNotePage(1, 'ruled', mode),
    ],
  };
}

export async function listNotebooks(): Promise<NotebookDocument[]> {
  try {
    const rows = await notesDb.notebooks.orderBy('updatedAt').reverse().toArray();
    if (rows.length > 0) return rows;
  } catch {
    // ignore
  }
  const starter = createDefaultNotebook('Notebook Tanpa Judul 1', null, 'dot_grid', 'paged');
  await saveNotebook(starter);
  return [starter];
}

export async function saveNotebook(doc: NotebookDocument): Promise<void> {
  try {
    await notesDb.notebooks.put({ ...doc, updatedAt: Date.now() });
  } catch {
    // ignore in restricted environments
  }
}

export async function deleteNotebookPermanently(id: string): Promise<void> {
  try {
    await notesDb.notebooks.delete(id);
  } catch {
    // ignore
  }
}

export async function listFolders(): Promise<NotebookFolder[]> {
  try {
    return await notesDb.folders.orderBy('createdAt').toArray();
  } catch {
    return [];
  }
}

export async function saveFolder(folder: NotebookFolder): Promise<void> {
  try {
    await notesDb.folders.put(folder);
  } catch {
    // ignore
  }
}
