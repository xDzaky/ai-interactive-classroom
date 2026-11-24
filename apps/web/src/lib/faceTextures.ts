/**
 * faceTextures.ts — Procedural 512x512 CanvasTexture Engine Per Face (V3)
 *
 * Generates crisp, cached THREE.CanvasTexture maps for real-world parametric solids:
 * - dice (1-6 opposite-sum-7 pips, customizable base color, pip color, pips/numbers/letters/custom text)
 * - rubik (3x3 colored grid)
 * - gift (pastel wrapping paper + crossed ribbon)
 * - milk_box (packaging label)
 * - soda_can, party_hat, ice_cream_cone, traffic_cone, tent, egypt_pyramid, soccer_ball, globe, house
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
  /** Custom label per face index (0..5) */
  faceLabels?: Record<number, string>;
}

// Standard cube opposite face mapping (0<->1, 2<->4, 3<->5) summing to 7:
export const DICE_FACE_VALUES = [1, 6, 4, 5, 3, 2];

const PIP_COORDS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
};

const RUBIK_COLORS = ['#ffffff', '#facc15', '#ef4444', '#f97316', '#2563eb', '#16a34a'];

const textureCache = new Map<string, THREE.CanvasTexture>();

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createFaceTexture(
  preset: TexturePreset,
  faceIndex: number,
  custom?: FaceCustomConfig,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const key = `${preset}:${faceIndex}:${JSON.stringify(custom ?? {})}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (preset === 'dice') {
    const val = DICE_FACE_VALUES[faceIndex % 6];
    const bg = custom?.baseColor ?? '#ffffff';
    const ink = custom?.inkColor ?? (val === 1 || val === 4 ? '#dc2626' : '#0f172a');
    const mode = custom?.mode ?? 'pips';
    const customLabel = custom?.faceLabels?.[faceIndex];

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // Subtle inset rounded border like classic Pola Dadu
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 14;
    roundRect(ctx, 18, 18, size - 36, size - 36, 48);
    ctx.stroke();

    if (mode === 'pips' && !customLabel) {
      const coords = PIP_COORDS[val] ?? PIP_COORDS[1];
      ctx.fillStyle = ink;
      for (const [nx, ny] of coords) {
        ctx.beginPath();
        ctx.arc(nx * size, ny * size, val === 1 ? 58 : 42, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
      const text =
        customLabel ||
        (mode === 'number' ? String(val) : mode === 'letter' ? letters[faceIndex % 6] : String(val));
      ctx.fillStyle = ink;
      ctx.font = 'bold 190px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, size / 2, size / 2 + 8);
    }
  } else if (preset === 'rubik') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);
    const faceCol = RUBIK_COLORS[faceIndex % 6];
    const pad = 22;
    const cell = (size - pad * 4) / 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = faceCol;
        roundRect(ctx, pad + c * (cell + pad), pad + r * (cell + pad), cell, cell, 18);
        ctx.fill();
      }
    }
  } else if (preset === 'gift') {
    ctx.fillStyle = custom?.baseColor ?? '#fce7f3';
    ctx.fillRect(0, 0, size, size);
    // Crossed ribbon
    ctx.fillStyle = custom?.inkColor ?? '#e11d48';
    ctx.fillRect(size * 0.42, 0, size * 0.16, size);
    ctx.fillRect(0, size * 0.42, size, size * 0.16);
    ctx.strokeStyle = '#fda4af';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, size - 16, size - 16);
  } else if (preset === 'milk_box') {
    ctx.fillStyle = '#eff6ff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(0, 0, size, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUSU SEGAR', size / 2, 78);
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 72px Inter, sans-serif';
    ctx.fillText('1 LITER', size / 2, 300);
    ctx.font = '32px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('1000 cm³', size / 2, 368);
  } else if (preset === 'soda_can') {
    const grad = ctx.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, '#dc2626');
    grad.addColorStop(0.5, '#ef4444');
    grad.addColorStop(1, '#b91c1c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, size, 48);
    ctx.fillRect(0, size - 48, size, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 74px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SODA 330mL', size / 2, size / 2 + 20);
  } else if (preset === 'party_hat') {
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(0, 0, size, size);
    const dotCols = ['#ec4899', '#3b82f6', '#10b981', '#8b5cf6'];
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = dotCols[i % dotCols.length];
      ctx.beginPath();
      ctx.arc(((i * 97) % (size - 60)) + 30, ((i * 131) % (size - 60)) + 30, 24, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (preset === 'ice_cream_cone') {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 6;
    for (let i = -size; i < size * 2; i += 44) {
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
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, size * 0.3, size, size * 0.16);
    ctx.fillRect(0, size * 0.6, size, size * 0.14);
  } else if (preset === 'tent') {
    ctx.fillStyle = faceIndex % 2 === 0 ? '#10b981' : '#059669';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#ecfdf5';
    ctx.beginPath();
    ctx.moveTo(size * 0.5, size * 0.25);
    ctx.lineTo(size * 0.25, size);
    ctx.lineTo(size * 0.75, size);
    ctx.closePath();
    ctx.fill();
  } else if (preset === 'egypt_pyramid') {
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 5;
    for (let y = 0; y < size; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
  } else if (preset === 'soccer_ball') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#1e293b';
    for (let y = 64; y < size; y += 128) {
      for (let x = 64; x < size; x += 128) {
        ctx.beginPath();
        ctx.arc(x, y, 36, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (preset === 'globe') {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(150, 210, 95, 70, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(360, 260, 110, 80, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 4;
    for (let i = 64; i < size; i += 64) {
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
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(0, 0, size, size);
    // Door + window
    ctx.fillStyle = '#92400e';
    ctx.fillRect(size * 0.38, size * 0.48, size * 0.24, size * 0.52);
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(size * 0.14, size * 0.24, size * 0.18, size * 0.18);
    ctx.fillRect(size * 0.68, size * 0.24, size * 0.18, size * 0.18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  textureCache.set(key, tex);
  return tex;
}
