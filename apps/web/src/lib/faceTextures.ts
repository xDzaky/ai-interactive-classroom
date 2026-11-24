/**
 * faceTextures.ts — Razor-Sharp 1024x1024 HD Translucent Ice-Blue Glass Texture Engine
 *
 * Matches the exact clean ice-blue translucent textbook aesthetic (#bae6fd @ 24% opacity)
 * with crisp #1e293b vector markings, 16x anisotropic filtering, and mipmaps (ZERO blur!).
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

  const key = `hd1024:${preset}:${faceIndex}:${JSON.stringify(custom ?? {})}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Clean translucent ice-blue glass tint matching the default 2D->3D cube (#bae6fd @ 0.26)
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = custom?.baseColor ?? 'rgba(186, 230, 253, 0.26)';
  ctx.fillRect(0, 0, size, size);

  const ink = custom?.inkColor ?? '#1e293b';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (preset === 'dice') {
    const val = DICE_FACE_VALUES[faceIndex % 6];
    const mode = custom?.mode ?? 'pips';
    const customLabel = custom?.faceLabels?.[faceIndex];

    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, size - 40, size - 40);

    if (mode === 'pips' && !customLabel) {
      const coords = PIP_COORDS[val] ?? PIP_COORDS[1];
      for (const [nx, ny] of coords) {
        ctx.beginPath();
        ctx.arc(nx * size, ny * size, val === 1 ? 82 : 62, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const text =
        customLabel ||
        (mode === 'number' ? String(val) : mode === 'letter' ? letters[faceIndex % 6] : String(val));
      ctx.font = 'bold 340px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, size / 2, size / 2 + 12);
    }
  } else if (preset === 'rubik') {
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, size - 32, size - 32);
    const step = size / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 16);
      ctx.lineTo(i * step, size - 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, i * step);
      ctx.lineTo(size - 16, i * step);
      ctx.stroke();
    }
  } else if (preset === 'gift') {
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, size - 32, size - 32);
    ctx.strokeRect(size * 0.43, 16, size * 0.14, size - 32);
    ctx.strokeRect(16, size * 0.43, size - 32, size * 0.14);
  } else if (preset === 'milk_box') {
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, size - 32, size - 32);
    ctx.beginPath();
    ctx.moveTo(16, 240);
    ctx.lineTo(size - 16, 240);
    ctx.stroke();
    ctx.font = 'bold 110px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('1 LITER', size / 2, 540);
    ctx.font = '68px Inter, system-ui, sans-serif';
    ctx.fillText('1000 cm³', size / 2, 660);
  } else if (preset === 'soda_can') {
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(0, 110);
    ctx.lineTo(size, 110);
    ctx.moveTo(0, size - 110);
    ctx.lineTo(size, size - 110);
    ctx.stroke();
    ctx.font = 'bold 110px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('330 mL', size / 2, size / 2 + 30);
  } else if (preset === 'party_hat') {
    ctx.lineWidth = 10;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(((i * 211) % (size - 160)) + 80, ((i * 283) % (size - 160)) + 80, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (preset === 'ice_cream_cone') {
    ctx.lineWidth = 8;
    for (let i = -size; i < size * 2; i += 110) {
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
    ctx.lineWidth = 14;
    ctx.strokeRect(0, size * 0.3, size, size * 0.16);
    ctx.strokeRect(0, size * 0.6, size, size * 0.14);
  } else if (preset === 'tent') {
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, size - 32, size - 32);
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.25);
    ctx.lineTo(size * 0.25, size - 16);
    ctx.lineTo(size * 0.75, size - 16);
    ctx.closePath();
    ctx.stroke();
  } else if (preset === 'egypt_pyramid') {
    ctx.lineWidth = 8;
    for (let y = 128; y < size; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (preset === 'soccer_ball' || preset === 'globe') {
    ctx.lineWidth = 7;
    for (let i = 128; i < size; i += 128) {
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
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, size - 32, size - 32);
    ctx.strokeRect(size * 0.38, size * 0.5, size * 0.24, size * 0.48);
    ctx.strokeRect(size * 0.14, size * 0.24, size * 0.18, size * 0.18);
    ctx.strokeRect(size * 0.68, size * 0.24, size * 0.18, size * 0.18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}
