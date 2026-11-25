/**
 * ManimGxWidget.tsx — Interactive 3D Mathematical Animation Player (academa-labs/manimgx V6)
 *
 * Renders 60fps procedural ManimGX animations directly on an HTML5 Canvas
 * (with WebGPU capability probe + AST-sandboxed Python Scene Code editor),
 * supporting all 6 ManimGX template families:
 * - surface_3d (3D parametric surface z = sin(x)*cos(y) with smooth orbit)
 * - solid_3d (3D wireframe + glass polyhedron with cross-section sweep)
 * - function_calculus (animated curve, Riemann sum rectangles, moving tangent line)
 * - linear_transform (animated 2D basis vectors & transformed grid)
 * - stat_chart (animated rising data bars)
 * - custom_proof (step-by-step animated mathematical proof reveal)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  analyzeForManimGX,
  parseCircleEquation,
  type ManimGxTemplateKind,
} from '@ai-classroom/math-core';
import {
  probeManimGxRuntime,
  validateManimGxSourceClient,
} from '@/workers/manimgx.worker';

export interface ManimGxWidgetProps {
  id: string;
  title: string;
  formulaLatex: string;
  templateId: ManimGxTemplateKind;
  sceneCode: string;
  selected?: boolean;
  onSelect?: () => void;
  onUpdateSceneCode?: (nextCode: string) => void;
  onConvertToInteractive3D?: () => void;
  onMovePosition?: (dx: number, dy: number) => void;
  onDelete?: () => void;
}

const TOTAL_DURATION_SEC = 6.0;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function project3D(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number,
  cx: number,
  cy: number,
  scale: number,
): { sx: number; sy: number; depth: number } {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = y * cosP - z1 * sinP;
  const z2 = y * sinP + z1 * cosP;

  const persp = 5.5 / (5.5 + z2 * 0.35);
  return {
    sx: cx + x1 * scale * persp,
    sy: cy - y2 * scale * persp,
    depth: z2,
  };
}

function drawManimFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  templateId: ManimGxTemplateKind,
  tNorm: number,
  formulaLatex: string,
) {
  // Signature Manim dark slate background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#0b1120');
  bgGrad.addColorStop(1, '#111827');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle subtle coordinate grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
  ctx.lineWidth = 1;
  const step = 28;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const cx = w / 2;
  const cy = h / 2 + 8;
  const ease = easeInOutCubic(Math.min(1, tNorm * 1.15));

  if (templateId === 'surface_3d') {
    const yaw = 0.65 + tNorm * Math.PI * 1.4;
    const pitch = 0.52;
    const scale = Math.min(w, h) * 0.14;
    const gridN = 14;
    const revealedRows = Math.max(2, Math.floor(gridN * Math.min(1, tNorm * 1.6)));

    // 3D Axes
    const origin = project3D(0, 0, 0, yaw, pitch, cx, cy, scale);
    const axes: Array<[[number, number, number], string, string]> = [
      [[2.6, 0, 0], '#f87171', 'x'],
      [[0, 2.2, 0], '#34d399', 'z'],
      [[0, 0, 2.6], '#60a5fa', 'y'],
    ];
    for (const [vec, col, lbl] of axes) {
      const tip = project3D(vec[0], vec[1], vec[2], yaw, pitch, cx, cy, scale);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(tip.sx, tip.sy);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(lbl, tip.sx + 4, tip.sy + 3);
    }

    // Parametric surface z = sin(u) * cos(v)
    const pts: Array<Array<{ sx: number; sy: number; val: number }>> = [];
    for (let i = 0; i <= revealedRows; i++) {
      const row: Array<{ sx: number; sy: number; val: number }> = [];
      const u = -2.2 + (i / gridN) * 4.4;
      for (let j = 0; j <= gridN; j++) {
        const v = -2.2 + (j / gridN) * 4.4;
        const val = Math.sin(u + tNorm * 1.5) * Math.cos(v) * 1.1;
        const p = project3D(u, val, v, yaw, pitch, cx, cy, scale);
        row.push({ sx: p.sx, sy: p.sy, val });
      }
      pts.push(row);
    }

    for (let i = 0; i < pts.length - 1; i++) {
      for (let j = 0; j < gridN; j++) {
        const a = pts[i][j];
        const b = pts[i + 1][j];
        const c = pts[i + 1][j + 1];
        const d = pts[i][j + 1];
        const avgVal = (a.val + b.val + c.val + d.val) / 4;
        const hue = 195 + avgVal * 55;
        ctx.fillStyle = `hsla(${hue}, 82%, 58%, 0.32)`;
        ctx.strokeStyle = `hsla(${hue}, 90%, 72%, 0.72)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.lineTo(c.sx, c.sy);
        ctx.lineTo(d.sx, d.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  } else if (templateId === 'solid_3d') {
    const yaw = 0.5 + tNorm * Math.PI * 2;
    const pitch = 0.42 + Math.sin(tNorm * Math.PI * 2) * 0.12;
    const scale = Math.min(w, h) * 0.22 * (0.4 + 0.6 * ease);
    const verts: Array<[number, number, number]> = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ];
    const edges: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const proj = verts.map(([x, y, z]) => project3D(x, y, z, yaw, pitch, cx, cy, scale));

    // Animated cross-section plane sweeping along Y
    const sliceY = -0.85 + Math.sin(tNorm * Math.PI * 2) * 0.85;
    const slicePts = [
      project3D(-1.05, sliceY, -1.05, yaw, pitch, cx, cy, scale),
      project3D(1.05, sliceY, -1.05, yaw, pitch, cx, cy, scale),
      project3D(1.05, sliceY, 1.05, yaw, pitch, cx, cy, scale),
      project3D(-1.05, sliceY, 1.05, yaw, pitch, cx, cy, scale),
    ];
    ctx.fillStyle = 'rgba(250, 204, 21, 0.25)';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    slicePts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing cube edges
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    for (const [i, j] of edges) {
      ctx.beginPath();
      ctx.moveTo(proj[i].sx, proj[i].sy);
      ctx.lineTo(proj[j].sx, proj[j].sy);
      ctx.stroke();
    }
    // Vertices
    ctx.fillStyle = '#e0f2fe';
    for (const p of proj) {
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (templateId === 'linear_transform') {
    const s = Math.min(w, h) * 0.14;
    const blend = easeInOutCubic(Math.min(1, tNorm * 1.25));
    // Interpolate Identity -> [[1.4, 0.7], [-0.3, 1.2]]
    const a = 1 + 0.4 * blend;
    const b = 0.7 * blend;
    const c = -0.3 * blend;
    const d = 1 + 0.2 * blend;

    const toScreen = (x: number, y: number) => {
      const tx = a * x + b * y;
      const ty = c * x + d * y;
      return { sx: cx + tx * s, sy: cy - ty * s };
    };

    // Warped grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.2;
    for (let k = -3; k <= 3; k++) {
      const p1 = toScreen(k, -3);
      const p2 = toScreen(k, 3);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();

      const q1 = toScreen(-3, k);
      const q2 = toScreen(3, k);
      ctx.beginPath();
      ctx.moveTo(q1.sx, q1.sy);
      ctx.lineTo(q2.sx, q2.sy);
      ctx.stroke();
    }

    // Basis vectors i-hat (emerald) and j-hat (rose)
    const o = toScreen(0, 0);
    const iTip = toScreen(1, 0);
    const jTip = toScreen(0, 1);
    const drawVec = (tip: { sx: number; sy: number }, col: string, lbl: string) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(o.sx, o.sy);
      ctx.lineTo(tip.sx, tip.sy);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(tip.sx, tip.sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 12px monospace';
      ctx.fillText(lbl, tip.sx + 6, tip.sy - 4);
    };
    drawVec(iTip, '#34d399', 'î');
    drawVec(jTip, '#fb7185', 'ĵ');
  } else if (templateId === 'stat_chart') {
    const vals = [35, 68, 52, 88, 61, 79];
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const baseY = h - 36;
    const maxH = h - 86;
    const barW = Math.min(34, (w - 80) / vals.length - 10);
    const startX = (w - vals.length * (barW + 10)) / 2;

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, baseY);
    ctx.lineTo(w - 30, baseY);
    ctx.stroke();

    vals.forEach((v, idx) => {
      const localT = Math.max(0, Math.min(1, tNorm * 1.5 - idx * 0.08));
      const bh = (v / 100) * maxH * easeInOutCubic(localT);
      const bx = startX + idx * (barW + 10);
      const grad = ctx.createLinearGradient(bx, baseY - bh, bx, baseY);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#6366f1');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, baseY - bh, barW, bh);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(labels[idx], bx + barW / 2 - 4, baseY + 15);
      if (localT > 0.5) {
        ctx.fillStyle = '#93c5fd';
        ctx.fillText(String(Math.round(v * localT)), bx + 4, baseY - bh - 5);
      }
    });
  } else if (templateId === 'circle_cartesian') {
    // Exact Cartesian Circle Visualization: (x - a)^2 + (y - b)^2 = r^2
    const { a, b, r } = parseCircleEquation(formulaLatex || '(x - 2)^2 + (y - 1)^2 = 9');
    const padL = 46;
    const padR = 20;
    const padT = 34;
    const padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const span = Math.max(r * 2 + 3.6, 6);
    const pxPerUnit = Math.min(plotW / (span + 1.5), plotH / (span + 0.8));
    const midX = a + 0.35;
    const midY = b;
    const toSx = (wx: number) => padL + plotW / 2 + (wx - midX) * pxPerUnit;
    const toSy = (wy: number) => padT + plotH / 2 - (wy - midY) * pxPerUnit;

    const xMin = Math.floor(midX - plotW / (2 * pxPerUnit));
    const xMax = Math.ceil(midX + plotW / (2 * pxPerUnit));
    const yMin = Math.floor(midY - plotH / (2 * pxPerUnit));
    const yMax = Math.ceil(midY + plotH / (2 * pxPerUnit));

    // Crisp Cartesian dark background
    ctx.fillStyle = '#1e2128';
    ctx.fillRect(0, 0, w, h);

    // Subtle unit grid + tick labels
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    for (let gx = xMin; gx <= xMax; gx++) {
      const sx = toSx(gx);
      if (sx < padL - 2 || sx > w - padR + 2) continue;
      ctx.strokeStyle = gx === 0 ? 'rgba(148, 163, 184, 0.55)' : 'rgba(148, 163, 184, 0.13)';
      ctx.lineWidth = gx === 0 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(sx, padT);
      ctx.lineTo(sx, h - padB);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(String(gx), sx - (gx < 0 ? 7 : 3), h - padB + 14);
    }
    for (let gy = yMin; gy <= yMax; gy++) {
      const sy = toSy(gy);
      if (sy < padT - 2 || sy > h - padB + 2) continue;
      ctx.strokeStyle = gy === 0 ? 'rgba(148, 163, 184, 0.55)' : 'rgba(148, 163, 184, 0.13)';
      ctx.lineWidth = gy === 0 ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(padL, sy);
      ctx.lineTo(w - padR, sy);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(String(gy), padL - 20, sy + 3);
    }

    // Axis titles: Sumbu X & Sumbu Y
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px sans-serif';
    ctx.fillText('Sumbu X', padL + plotW / 2 - 22, h - 6);
    ctx.save();
    ctx.translate(13, padT + plotH / 2 + 22);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Sumbu Y', 0, 0);
    ctx.restore();

    const cSx = toSx(a);
    const cSy = toSy(b);
    const rPx = r * pxPerUnit;

    // Animated warm amber/peach circle arc (0 -> 2π)
    const arcProgress = easeInOutCubic(Math.min(1, tNorm * 1.45));
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cSx, cSy, rPx, 0, Math.PI * 2 * Math.max(0.02, arcProgress));
    ctx.stroke();

    // Dashed blue radius line from Pusat (a,b) -> (a+r, b)
    const radReveal = Math.max(0, Math.min(1, (tNorm - 0.1) * 2.5));
    if (radReveal > 0) {
      const endX = cSx + rPx * radReveal;
      ctx.save();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(cSx, cSy);
      ctx.lineTo(endX, cSy);
      ctx.stroke();
      ctx.restore();
      if (radReveal > 0.5) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`r = ${r}`, cSx + rPx * 0.45, cSy + 14);
      }
    }

    // Center dot (pink) + label Pusat (a, b)
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(cSx, cSy, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`Pusat (${a}, ${b})`, cSx - 34, cSy - 10);

    // 4 Cardinal points in blue with exact coordinate labels
    const cardinals: Array<{ wx: number; wy: number; dx: number; dy: number }> = [
      { wx: a, wy: b + r, dx: -16, dy: -8 },
      { wx: a + r, wy: b, dx: 6, dy: 4 },
      { wx: a, wy: b - r, dx: -18, dy: 14 },
      { wx: a - r, wy: b, dx: -38, dy: 4 },
    ];
    if (arcProgress > 0.35) {
      for (const pt of cardinals) {
        const px = toSx(pt.wx);
        const py = toSy(pt.wy);
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(px, py, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px sans-serif';
        ctx.fillText(`(${pt.wx}, ${pt.wy})`, px + pt.dx, py + pt.dy);
      }
    }
  } else if (templateId === 'custom_proof') {
    const steps = [
      `Diketahui: ${formulaLatex || 'a^2 + b^2 = c^2'}`,
      'Langkah 1: Susun ulang suku & identitas aljabar',
      'Langkah 2: Evaluasi batas & verifikasi kesamaan',
      'Terbukti (Q.E.D.) ✓',
    ];
    steps.forEach((txt, idx) => {
      const appear = Math.max(0, Math.min(1, (tNorm - idx * 0.2) * 3.5));
      if (appear <= 0) return;
      ctx.save();
      ctx.globalAlpha = appear;
      const y = 52 + idx * 38;
      ctx.fillStyle = idx === steps.length - 1 ? 'rgba(16, 185, 129, 0.22)' : 'rgba(99, 102, 241, 0.16)';
      ctx.strokeStyle = idx === steps.length - 1 ? '#34d399' : '#818cf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(24, y - 16, w - 48, 28, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = idx === steps.length - 1 ? '#6ee7b7' : '#f1f5f9';
      ctx.font = idx === 0 ? 'bold 12px monospace' : '12px sans-serif';
      ctx.fillText(txt.slice(0, 52), 34, y + 2);
      ctx.restore();
    });
  } else {
    // function_calculus (default): animated curve + Riemann rectangles + moving tangent
    const padX = 36;
    const plotW = w - padX * 2;
    const plotH = h - 68;
    const axisY = h - 42;
    const isSin = /sin|cos/i.test(formulaLatex);

    // Axes
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padX, axisY);
    ctx.lineTo(w - padX, axisY);
    ctx.moveTo(cx, 24);
    ctx.lineTo(cx, h - 22);
    ctx.stroke();

    const evalY = (u: number) => (isSin ? Math.sin(u * 2.2) * 0.42 + 0.5 : 0.18 + (u * u) * 0.72);

    // Riemann sum rectangles (animated reveal)
    const rectCount = 10;
    const rectReveal = Math.max(0, Math.min(1, (tNorm - 0.15) * 1.8));
    if (rectReveal > 0) {
      const rw = (plotW * 0.65) / rectCount;
      const rx0 = padX + plotW * 0.18;
      for (let i = 0; i < Math.ceil(rectCount * rectReveal); i++) {
        const u = -0.6 + (i / rectCount) * 1.2;
        const fy = evalY(u) * plotH * 0.78;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1;
        ctx.fillRect(rx0 + i * rw, axisY - fy, rw - 2, fy);
        ctx.strokeRect(rx0 + i * rw, axisY - fy, rw - 2, fy);
      }
    }

    // Main Curve
    const maxSamples = Math.max(4, Math.floor(80 * Math.min(1, tNorm * 1.5)));
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= maxSamples; i++) {
      const frac = i / 80;
      const u = -1 + frac * 2;
      const sx = padX + frac * plotW;
      const sy = axisY - evalY(u) * plotH * 0.78;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Moving tangent point
    const uDot = -0.75 + tNorm * 1.5;
    const dotX = padX + ((uDot + 1) / 2) * plotW;
    const dotY = axisY - evalY(uDot) * plotH * 0.78;
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Formula watermark badge (top-left)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(10, 10, Math.min(w - 20, 215), 22);
  ctx.fillStyle = '#bae6fd';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(`ManimGX · ${(formulaLatex || templateId).slice(0, 22)}`, 16, 25);
}

export const ManimGxWidget: React.FC<ManimGxWidgetProps> = ({
  id,
  title,
  formulaLatex,
  templateId,
  sceneCode,
  selected = false,
  onSelect,
  onUpdateSceneCode,
  onConvertToInteractive3D,
  onMovePosition,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0.15);
  const [showCode, setShowCode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ManimGxTemplateKind>(templateId);
  const [activeFormula, setActiveFormula] = useState(formulaLatex);
  const [activeTitle, setActiveTitle] = useState(title);
  const [codeDraft, setCodeDraft] = useState(sceneCode);
  const [codeErrors, setCodeErrors] = useState<string[]>([]);
  const [runtimeLabel, setRuntimeLabel] = useState<string>('Procedural 60fps');

  useEffect(() => {
    setActiveTemplate(templateId);
    setActiveFormula(formulaLatex);
    setActiveTitle(title);
  }, [templateId, formulaLatex, title]);

  const applyFormula = (nextFormula: string) => {
    const analysis = analyzeForManimGX({ latex: nextFormula });
    setActiveFormula(nextFormula);
    setActiveTemplate(analysis.templateKind);
    setActiveTitle(analysis.scene.title);
    setCodeDraft(analysis.scene.pythonCode);
    onUpdateSceneCode?.(analysis.scene.pythonCode);
    setProgress(0.05);
    setPlaying(true);
  };

  useEffect(() => {
    setCodeDraft(sceneCode);
  }, [sceneCode]);

  useEffect(() => {
    let alive = true;
    void probeManimGxRuntime(sceneCode).then((res) => {
      if (!alive) return;
      setRuntimeLabel(res.webgpuAvailable ? 'WebGPU Siap' : 'Procedural 60fps');
    });
    return () => {
      alive = false;
    };
  }, [sceneCode]);

  // 60fps rAF animation loop
  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      setProgress((prev) => {
        const next = prev + (dt * speed) / TOTAL_DURATION_SEC;
        if (next >= 1) {
          if (loop) return next % 1;
          setPlaying(false);
          return 1;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, loop, speed]);

  // Paint frame whenever progress / template / fullscreen changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawManimFrame(ctx, canvas.width, canvas.height, activeTemplate, progress, activeFormula);
  }, [progress, activeTemplate, activeFormula, fullscreen]);

  const handleDragStart = (e: React.PointerEvent) => {
    if (!onMovePosition || fullscreen) return;
    e.stopPropagation();
    let lx = e.clientX;
    let ly = e.clientY;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lx;
      const dy = ev.clientY - ly;
      lx = ev.clientX;
      ly = ev.clientY;
      if (dx !== 0 || dy !== 0) onMovePosition(dx, dy);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleRerenderCode = () => {
    const check = validateManimGxSourceClient(codeDraft);
    setCodeErrors(check.errors);
    if (check.valid) {
      onUpdateSceneCode?.(codeDraft);
      setProgress(0);
      setPlaying(true);
    }
  };

  const canConvert3D = activeTemplate === 'surface_3d' || activeTemplate === 'solid_3d';

  return (
    <div
      data-testid={`manimgx-widget-${id}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      className={
        fullscreen
          ? 'fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl'
          : `flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-slate-950 text-slate-100 shadow-2xl ${
              selected ? 'border-cyan-400 ring-2 ring-cyan-400/30' : 'border-slate-700'
            }`
      }
    >
      {/* Header Bar */}
      <div
        onPointerDown={handleDragStart}
        className="flex cursor-grab items-center justify-between border-b border-slate-800 bg-slate-900/95 px-3 py-2 text-[11px] active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-cyan-300">
            ManimGX
          </span>
          <span className="truncate font-bold text-slate-100">{activeTitle}</span>
          <span className="hidden sm:inline rounded-full bg-slate-800 px-2 py-0.5 text-[9px] text-emerald-300">
            {runtimeLabel}
          </span>
        </div>
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            data-testid={`manimgx-code-btn-${id}`}
            onClick={() => setShowCode((v) => !v)}
            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              showCode ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {'</>'} Kode Python
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
            title={fullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {fullscreen ? '⤢' : '⛶'}
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md bg-rose-950/60 px-2 py-0.5 text-[10px] font-bold text-rose-300 hover:bg-rose-900"
              title="Hapus Animasi"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Quick Interactive Formula & Preset Bar (Lingkaran Kartesius, Permukaan 3D, Kalkulus, Matriks) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-900/70 px-2.5 py-1 text-[10px]"
      >
        <input
          type="text"
          data-testid={`manimgx-formula-input-${id}`}
          value={activeFormula}
          onChange={(e) => setActiveFormula(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') applyFormula(activeFormula);
          }}
          placeholder="Ketik rumus, mis. (x - 2)^2 + (y - 1)^2 = 9"
          className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-amber-200 outline-none focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={() => applyFormula(activeFormula)}
          className="rounded-md bg-indigo-600 px-2 py-0.5 font-bold text-white hover:bg-indigo-500"
        >
          Plot
        </button>
        {(
          [
            ['Lingkaran', '(x - 2)^2 + (y - 1)^2 = 9'],
            ['3D', 'z = sin(x) * cos(y)'],
            ['Kalkulus', 'y = sin(x)'],
          ] as const
        ).map(([lbl, expr]) => (
          <button
            key={lbl}
            type="button"
            data-testid={`manimgx-preset-${lbl.toLowerCase()}-${id}`}
            onClick={() => applyFormula(expr)}
            className="hidden sm:inline-block rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Main Viewport (Canvas + optional Python Code Drawer) */}
      <div className="relative flex flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={fullscreen ? 840 : 460}
          height={fullscreen ? 480 : 250}
          className="h-full w-full object-contain"
        />

        {showCode && (
          <div
            data-testid={`manimgx-code-drawer-${id}`}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute inset-0 flex flex-col bg-slate-950/96 p-3 text-xs"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-cyan-300">
                manimgx_scene.py (AST Sandbox Aktif)
              </span>
              <button
                type="button"
                data-testid={`manimgx-rerender-btn-${id}`}
                onClick={handleRerenderCode}
                className="rounded-lg bg-cyan-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 hover:bg-cyan-400"
              >
                ▶ Render Ulang
              </button>
            </div>
            <textarea
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              spellCheck={false}
              className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 p-2 font-mono text-[11px] text-emerald-200 outline-none focus:border-cyan-400"
            />
            {codeErrors.length > 0 && (
              <div
                data-testid={`manimgx-sandbox-error-${id}`}
                className="mt-1.5 rounded-lg border border-rose-500/50 bg-rose-950/80 p-2 text-[10px] text-rose-200"
              >
                {codeErrors.map((err, i) => (
                  <div key={i}>⚠ {err}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Playback Controls & Contextual Footer */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-900/95 px-3 py-2 text-[10px]"
      >
        <button
          type="button"
          data-testid={`manimgx-play-btn-${id}`}
          onClick={() => setPlaying((v) => !v)}
          className="rounded-lg bg-cyan-500 px-2.5 py-1 font-bold text-slate-950 hover:bg-cyan-400"
        >
          {playing ? '⏸ Jeda' : '▶ Putar'}
        </button>

        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(progress * 100)}
          onChange={(e) => {
            setPlaying(false);
            setProgress(Number(e.target.value) / 100);
          }}
          aria-label="Timeline animasi ManimGX"
          className="flex-1 accent-cyan-400"
        />

        <span className="font-mono text-slate-400">
          {(progress * TOTAL_DURATION_SEC).toFixed(1)}s
        </span>

        <button
          type="button"
          onClick={() => setLoop((v) => !v)}
          className={`rounded-md px-1.5 py-0.5 font-semibold ${
            loop ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
          title="Ulangi Otomatis"
        >
          🔁
        </button>

        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          aria-label="Kecepatan animasi"
          className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>

        {canConvert3D && onConvertToInteractive3D && (
          <button
            type="button"
            onClick={onConvertToInteractive3D}
            className="rounded-lg border border-indigo-400/50 bg-indigo-500/20 px-2 py-1 font-bold text-indigo-200 hover:bg-indigo-500/35"
          >
            🧊 Jadikan 3D Interaktif
          </button>
        )}
      </div>
    </div>
  );
};
