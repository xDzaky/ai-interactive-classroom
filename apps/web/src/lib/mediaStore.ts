/**
 * mediaStore.ts — Dexie IndexedDB Binary Asset Store with SHA-256 Deduplication (V5)
 *
 * Keeps heavy PNG/JPEG/WebP/SVG/GIF blobs out of scene.objects & undo history.
 * Only lightweight `assetId` hashes live inside BoardObject props!
 */
import Dexie, { type Table } from 'dexie';

export type SupportedMediaMime =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/svg+xml'
  | 'image/gif';

export interface StoredMediaAsset {
  assetId: string; // SHA-256 hex digest
  mimeType: SupportedMediaMime;
  blob: Blob;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
}

class MediaDexieDB extends Dexie {
  mediaAssets!: Table<StoredMediaAsset, string>;

  constructor() {
    super('ai_classroom_media_v5');
    this.version(1).stores({
      mediaAssets: 'assetId, createdAt',
    });
  }
}

const mediaDb = new MediaDexieDB();
const urlCache = new Map<string, string>();
const memoryFallback = new Map<string, StoredMediaAsset>();

async function sha256Hex(blob: Blob): Promise<string> {
  try {
    const buf = await blob.arrayBuffer();
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // fallback below
  }
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function measureImageBlob(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || 400;
      const height = img.naturalHeight || 300;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 400, height: 300 });
    };
    img.src = url;
  });
}

function normalizeMime(raw: string): SupportedMediaMime {
  if (
    raw === 'image/png' ||
    raw === 'image/jpeg' ||
    raw === 'image/webp' ||
    raw === 'image/svg+xml' ||
    raw === 'image/gif'
  ) {
    return raw;
  }
  return 'image/png';
}

export async function putMediaAsset(blob: Blob): Promise<StoredMediaAsset> {
  const assetId = await sha256Hex(blob);
  const existing = await getMediaAsset(assetId);
  if (existing) return existing;

  const { width, height } = await measureImageBlob(blob);
  const asset: StoredMediaAsset = {
    assetId,
    mimeType: normalizeMime(blob.type),
    blob,
    naturalWidth: width,
    naturalHeight: height,
    createdAt: Date.now(),
  };

  memoryFallback.set(assetId, asset);
  try {
    await mediaDb.mediaAssets.put(asset);
  } catch {
    // IndexedDB unavailable in restricted environments — memoryFallback keeps working
  }
  return asset;
}

export async function getMediaAsset(assetId: string): Promise<StoredMediaAsset | null> {
  const mem = memoryFallback.get(assetId);
  if (mem) return mem;
  try {
    const row = await mediaDb.mediaAssets.get(assetId);
    if (row) {
      memoryFallback.set(assetId, row);
      return row;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function getMediaObjectUrl(assetId: string): Promise<string | null> {
  const cached = urlCache.get(assetId);
  if (cached) return cached;
  const asset = await getMediaAsset(assetId);
  if (!asset) return null;
  const url = URL.createObjectURL(asset.blob);
  urlCache.set(assetId, url);
  return url;
}

export async function deleteMediaAsset(assetId: string): Promise<void> {
  const cached = urlCache.get(assetId);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(assetId);
  }
  memoryFallback.delete(assetId);
  try {
    await mediaDb.mediaAssets.delete(assetId);
  } catch {
    // ignore
  }
}
