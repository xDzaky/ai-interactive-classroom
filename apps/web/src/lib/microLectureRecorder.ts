/**
 * microLectureRecorder.ts — Browser Micro-Lecture Screen Recorder + Dexie IndexedDB Store (V8)
 *
 * Adapted from Honghe Whiteboard (`GCRec.exe` + `Rec.db`):
 * Records whiteboard screen + optional microphone audio via MediaRecorder into IndexedDB.
 */
import Dexie, { type Table } from 'dexie';

export interface LectureRecording {
  id: string;
  title: string;
  durationSec: number;
  mimeType: string;
  blob: Blob;
  createdAt: number;
}

class RecordingsDB extends Dexie {
  recordings!: Table<LectureRecording, string>;
  constructor() {
    super('aic-micro-lectures-v1');
    this.version(1).stores({
      recordings: 'id, createdAt',
    });
  }
}

const recDb = new RecordingsDB();

export async function listRecordings(): Promise<LectureRecording[]> {
  return recDb.recordings.orderBy('createdAt').reverse().toArray();
}

export async function saveRecording(rec: LectureRecording): Promise<void> {
  await recDb.recordings.put(rec);
}

export async function deleteRecording(id: string): Promise<void> {
  await recDb.recordings.delete(id);
}
