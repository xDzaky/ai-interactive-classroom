/**
 * faceTextures.ts — Lightweight Monochrome Textbook Sketch CanvasTexture Engine (256x256, cached)
 *
 * Clean black-and-white sketch textures by default (zero lag, crisp on whiteboards),
 * with optional color customization via FaceCustomizerPopover!
 */
import * as THREE from 'three';

export type TexturePreset =
  | 'dice'
  | 'rubik'
  | 'gift'
  | 'milk_box'
  | 'soda_can'
  | 'party_hat'
  | 'ice_cream_cone'
  | 'traffic_cone'
  | 'tent'
  | 'egypt_pyramid'
  | 'soccer_ball'
  | 'globe'
  | 'house';

export type DiceFaceMode = 'pips' | 'number' | 'letter' | 'custom';

export interface FaceCustomConfig {
  baseColor?: string;
  inkColor?: string;
  mode?: DiceFaceMode;
  faceLabels?: Record<number, string>;
}

export const DICE_FACE_VALUES = [1, 6, 4, 5, 3, 2];

const PIP_COORDS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
};

const textureCache = new Map<string, THREE.CanvasTexture>();

export function createFaceTexture(
  preset: TexturePreset,
  faceIndex: number,
  custom?: FaceCustomConfig,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const key = `${preset}:${faceIndex}:${JSON.stringify(custom ?? {})}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const bg = custom?.baseColor ?? '#ffffff';
  const ink = custom?.inkColor ?? '#0f172a';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;

  if (preset === 'dice') {
    const val = DICE_FACE_VALUES[faceIndex % 6];
    const mode = custom?.mode ?? 'pips';
    const customLabel = custom?.faceLabels?.[faceIndex];

    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, size - 16, size - 16);

    if (mode === 'pips' && !customLabel) {
      const coords = PIP_COORDS[val] ?? PIP_COORDS[1];
      for (const [nx, ny] of coords) {
        ctx.beginPath();
        ctx.arc(nx * size, ny * size, val === 1 ? 26 : 19, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const text =
        customLabel ||
        (mode === 'number' ? String(val) : mode === 'letter' ? letters[faceIndex % 6] : String(val));
      ctx.font = 'bold 96px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, size / 2, size / 2 + 4);
    }
  } else if (preset === 'rubik') {
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    const step = size / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 6);
      ctx.lineTo(i * step, size - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(6, i * step);
      ctx.lineTo(size - 6, i * step);
      ctx.stroke();
    }
  } else if (preset === 'gift') {
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.strokeRect(size * 0.43, 6, size * 0.14, size - 12);
    ctx.strokeRect(6, size * 0.43, size - 12, size * 0.14);
  } else if (preset === 'milk_box') {
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.beginPath();
    ctx.moveTo(6, 64);
    ctx.lineTo(size - 6, 64);
    ctx.stroke();
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1 LITER', size / 2, 140);
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('1000 cm³', size / 2, 174);
  } else if (preset === 'soda_can') {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 28);
    ctx.lineTo(size, 28);
    ctx.moveTo(0, size - 28);
    ctx.lineTo(size, size - 28);
    ctx.stroke();
    ctx.font = 'bold 30px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('330 mL', size / 2, size / 2 + 10);
  } else if (preset === 'party_hat') {
    ctx.lineWidth = 3;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(((i * 53) % (size - 40)) + 20, ((i * 71) % (size - 40)) + 20, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (preset === 'ice_cream_cone') {
    ctx.lineWidth = 2.5;
    for (let i = -size; i < size * 2; i += 28) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, size);
      ctx.lineTo(i + size, 0);
      ctx.stroke();
    }
  } else if (preset === 'traffic_cone') {
    ctx.lineWidth = 4;
    ctx.strokeRect(0, size * 0.3, size, size * 0.16);
    ctx.strokeRect(0, size * 0.6, size, size * 0.14);
  } else if (preset === 'tent') {
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.25);
    ctx.lineTo(size * 0.25, size - 6);
    ctx.lineTo(size * 0.75, size - 6);
    ctx.closePath();
    ctx.stroke();
  } else if (preset === 'egypt_pyramid') {
    ctx.lineWidth = 2.5;
    for (let y = 32; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (preset === 'soccer_ball' || preset === 'globe') {
    ctx.lineWidth = 2.5;
    for (let i = 32; i < size; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
  } else if (preset === 'house') {
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.strokeRect(size * 0.38, size * 0.5, size * 0.24, size * 0.48);
    ctx.strokeRect(size * 0.14, size * 0.24, size * 0.18, size * 0.18);
    ctx.strokeRect(size * 0.68, size * 0.24, size * 0.18, size * 0.18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}
