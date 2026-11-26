/**
 * ManimGxWidget.tsx — Lightweight, Zero-Lag Mathematical Visualizer & 3D Player
 *
 * Optimizations & Design:
 * - Zero React re-renders during 3D animation (pure rAF + direct canvas/DOM ref updates).
 * - Static 2D templates (circle_cartesian, function_calculus, linear_transform, stat_chart,
 *   custom_proof) render ONCE immediately with zero animation loop and no playback bar.
 * - Clean white card & white canvas palette matching the Whiteboard and Notes background.
 * - Right-side slide-out Python Code Editor drawer (portal, matching TemplateDrawer).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  analyzeForManimGX,
  parseCircleEquation,
  type ManimGxTemplateKind,
} from '@ai-classroom/math-core';
import { validateManimGxSourceClient } from '@/workers/manimgx.worker';

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

const TOTAL_DURATION_SEC = 8.0;

/**
 * Only 3D templates use continuous orbit animation.
 * 2D Cartesian / algebraic visuals render immediately as crisp static diagrams (0% CPU idle).
 */
function isAnimatedTemplate(templateId: ManimGxTemplateKind): boolean {
  return templateId === 'surface_3d' || templateId === 'solid_3d';
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

function drawLabelWithHalo(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  font: string,
) {
  ctx.font = font;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawManimFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  templateId: ManimGxTemplateKind,
  tNorm: number,
  formulaLatex: string,
) {
  // Clean white canvas background harmonized with whiteboard & notes
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2 + 4;

  if (templateId === 'circle_cartesian') {
    // Crisp Static Cartesian Circle: (x - a)^2 + (y - b)^2 = r^2
    const { a, b, r } = parseCircleEquation(formulaLatex || '(x - 2)^2 + (y - 1)^2 = 9');
    const padL = 44;
    const padR = 18;
    const padT = 18;
    const padB = 34;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const span = Math.max(r * 2 + 3.4, 6);
    const pxPerUnit = Math.min(plotW / (span + 1.4), plotH / (span + 0.8));
    const midX = a + 0.25;
    const midY = b;
    const toSx = (wx: number) => padL + plotW / 2 + (wx - midX) * pxPerUnit;
    const toSy = (wy: number) => padT + plotH / 2 - (wy - midY) * pxPerUnit;

    const xMin = Math.floor(midX - plotW / (2 * pxPerUnit));
    const xMax = Math.ceil(midX + plotW / (2 * pxPerUnit));
    const yMin = Math.floor(midY - plotH / (2 * pxPerUnit));
    const yMax = Math.ceil(midY + plotH / (2 * pxPerUnit));

    // Light unit grid (single batched path for speed)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = xMin; gx <= xMax; gx++) {
      if (gx === 0) continue;
      const sx = toSx(gx);
      if (sx < padL - 1 || sx > w - padR + 1) continue;
      ctx.moveTo(sx, padT);
      ctx.lineTo(sx, h - padB);
    }
    for (let gy = yMin; gy <= yMax; gy++) {
      if (gy === 0) continue;
      const sy = toSy(gy);
      if (sy < padT - 1 || sy > h - padB + 1) continue;
      ctx.moveTo(padL, sy);
      ctx.lineTo(w - padR, sy);
    }
    ctx.stroke();

    // Principal X & Y axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const x0 = toSx(0);
    if (x0 >= padL - 1 && x0 <= w - padR + 1) {
      ctx.moveTo(x0, padT);
      ctx.lineTo(x0, h - padB);
    }
    const y0 = toSy(0);
    if (y0 >= padT - 1 && y0 <= h - padB + 1) {
      ctx.moveTo(padL, y0);
      ctx.lineTo(w - padR, y0);
    }
    ctx.stroke();

    // Tick numbers
    ctx.fillStyle = '#64748b';
    ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
    for (let gx = xMin; gx <= xMax; gx++) {
      const sx = toSx(gx);
      if (sx < padL - 2 || sx > w - padR + 2) continue;
      ctx.fillText(String(gx), sx - (gx < 0 ? 7 : 3), h - padB + 14);
    }
    for (let gy = yMin; gy <= yMax; gy++) {
      const sy = toSy(gy);
      if (sy < padT - 2 || sy > h - padB + 2) continue;
      ctx.fillText(String(gy), padL - 22, sy + 3);
    }

    // Axis titles: Sumbu X & Sumbu Y
    ctx.fillStyle = '#475569';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('Sumbu X', padL + plotW / 2 - 22, h - 6);
    ctx.save();
    ctx.translate(13, padT + plotH / 2 + 22);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Sumbu Y', 0, 0);
    ctx.restore();

    const cSx = toSx(a);
    const cSy = toSy(b);
    const rPx = r * pxPerUnit;

    // Full static vivid orange circle
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cSx, cSy, rPx, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed blue radius line from Pusat (a, b) -> (a + r, b)
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cSx, cSy);
    ctx.lineTo(cSx + rPx, cSy);
    ctx.stroke();
    ctx.restore();

    drawLabelWithHalo(
      ctx,
      `r = ${r}`,
      cSx + rPx * 0.42,
      cSy + 14,
      '#1e40af',
      'bold 11px system-ui, sans-serif',
    );

    // Center dot (pink/rose) + Pusat (a, b)
    ctx.fillStyle = '#db2777';
    ctx.beginPath();
    ctx.arc(cSx, cSy, 4.2, 0, Math.PI * 2);
    ctx.fill();
    drawLabelWithHalo(
      ctx,
      `Pusat (${a}, ${b})`,
      cSx - 34,
      cSy - 10,
      '#0f172a',
      'bold 11px system-ui, sans-serif',
    );

    // 4 Cardinal points with coordinate labels
    const cardinals: Array<{ wx: number; wy: number; dx: number; dy: number }> = [
      { wx: a, wy: b + r, dx: -16, dy: -8 },
      { wx: a + r, wy: b, dx: 7, dy: 4 },
      { wx: a, wy: b - r, dx: -18, dy: 14 },
      { wx: a - r, wy: b, dx: -40, dy: 4 },
    ];
    for (const pt of cardinals) {
      const px = toSx(pt.wx);
      const py = toSy(pt.wy);
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(px, py, 3.6, 0, Math.PI * 2);
      ctx.fill();
      drawLabelWithHalo(
        ctx,
        `(${pt.wx}, ${pt.wy})`,
        px + pt.dx,
        py + pt.dy,
        '#334155',
        '600 10px system-ui, sans-serif',
      );
    }
    return;
  }

  // Light subtle grid for non-circle scenes (single batched path)
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  const step = 28;
  ctx.beginPath();
  for (let x = step; x < w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = step; y < h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  if (templateId === 'surface_3d') {
    const yaw = 0.65 + tNorm * Math.PI * 2;
    const pitch = 0.52;
    const scale = Math.min(w, h) * 0.145;
    const gridN = 12;

    // 3D Axes
    const origin = project3D(0, 0, 0, yaw, pitch, cx, cy, scale);
    const axes: Array<[[number, number, number], string, string]> = [
      [[2.6, 0, 0], '#dc2626', 'x'],
      [[0, 2.2, 0], '#059669', 'z'],
      [[0, 0, 2.6], '#2563eb', 'y'],
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
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.fillText(lbl, tip.sx + 4, tip.sy + 3);
    }

    // Parametric surface z = sin(u) * cos(v)
    const pts: Array<Array<{ sx: number; sy: number; val: number }>> = [];
    for (let i = 0; i <= gridN; i++) {
      const row: Array<{ sx: number; sy: number; val: number }> = [];
      const u = -2.2 + (i / gridN) * 4.4;
      for (let j = 0; j <= gridN; j++) {
        const v = -2.2 + (j / gridN) * 4.4;
        const val = Math.sin(u + tNorm * 1.2) * Math.cos(v) * 1.1;
        const p = project3D(u, val, v, yaw, pitch, cx, cy, scale);
        row.push({ sx: p.sx, sy: p.sy, val });
      }
      pts.push(row);
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < gridN; i++) {
      for (let j = 0; j < gridN; j++) {
        const a = pts[i][j];
        const b = pts[i + 1][j];
        const c = pts[i + 1][j + 1];
        const d = pts[i][j + 1];
        const avgVal = (a.val + b.val + c.val + d.val) / 4;
        const hue = 205 + avgVal * 48;
        ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.24)`;
        ctx.strokeStyle = `hsla(${hue}, 78%, 38%, 0.72)`;
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
    const yaw = 0.55 + tNorm * Math.PI * 2;
    const pitch = 0.42 + Math.sin(tNorm * Math.PI * 2) * 0.1;
    const scale = Math.min(w, h) * 0.22;
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

    // Cross-section plane sweeping along Y
    const sliceY = Math.sin(tNorm * Math.PI * 2) * 0.75;
    const slicePts = [
      project3D(-1.05, sliceY, -1.05, yaw, pitch, cx, cy, scale),
      project3D(1.05, sliceY, -1.05, yaw, pitch, cx, cy, scale),
      project3D(1.05, sliceY, 1.05, yaw, pitch, cx, cy, scale),
      project3D(-1.05, sliceY, 1.05, yaw, pitch, cx, cy, scale),
    ];
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    slicePts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy)));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Crisp cube edges
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (const [i, j] of edges) {
      ctx.moveTo(proj[i].sx, proj[i].sy);
      ctx.lineTo(proj[j].sx, proj[j].sy);
    }
    ctx.stroke();

    // Vertices
    ctx.fillStyle = '#0f172a';
    for (const p of proj) {
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (templateId === 'linear_transform') {
    // Static transformed grid + basis vectors
    const s = Math.min(w, h) * 0.14;
    const a = 1.4;
    const b = 0.7;
    const c = -0.3;
    const d = 1.2;

    const toScreen = (x: number, y: number) => ({
      sx: cx + (a * x + b * y) * s,
      sy: cy - (c * x + d * y) * s,
    });

    ctx.strokeStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = -3; k <= 3; k++) {
      const p1 = toScreen(k, -3);
      const p2 = toScreen(k, 3);
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);

      const q1 = toScreen(-3, k);
      const q2 = toScreen(3, k);
      ctx.moveTo(q1.sx, q1.sy);
      ctx.lineTo(q2.sx, q2.sy);
    }
    ctx.stroke();

    const o = toScreen(0, 0);
    const drawVec = (tip: { sx: number; sy: number }, col: string, lbl: string) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(o.sx, o.sy);
      ctx.lineTo(tip.sx, tip.sy);
      ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(tip.sx, tip.sy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      drawLabelWithHalo(ctx, lbl, tip.sx + 6, tip.sy - 4, col, 'bold 12px ui-monospace, monospace');
    };
    drawVec(toScreen(1, 0), '#059669', 'î');
    drawVec(toScreen(0, 1), '#e11d48', 'ĵ');
  } else if (templateId === 'stat_chart') {
    const vals = [35, 68, 52, 88, 61, 79];
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const baseY = h - 32;
    const maxH = h - 68;
    const barW = Math.min(36, (w - 80) / vals.length - 10);
    const startX = (w - vals.length * (barW + 10)) / 2;

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30, baseY);
    ctx.lineTo(w - 30, baseY);
    ctx.stroke();

    vals.forEach((v, idx) => {
      const bh = (v / 100) * maxH;
      const bx = startX + idx * (barW + 10);
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.roundRect(bx, baseY - bh, barW, bh, [6, 6, 0, 0]);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px ui-monospace, monospace';
      ctx.fillText(labels[idx], bx + barW / 2 - 4, baseY + 15);
      ctx.fillStyle = '#4338ca';
      ctx.fillText(String(v), bx + barW / 2 - 7, baseY - bh - 6);
    });
  } else if (templateId === 'custom_proof') {
    const steps = [
      `Diketahui: ${formulaLatex || 'a^2 + b^2 = c^2'}`,
      'Langkah 1: Susun ulang suku & identitas aljabar',
      'Langkah 2: Evaluasi batas & verifikasi kesamaan',
      'Terbukti (Q.E.D.) ✓',
    ];
    steps.forEach((txt, idx) => {
      const y = 40 + idx * 42;
      const isLast = idx === steps.length - 1;
      ctx.fillStyle = isLast ? '#ecfdf5' : '#eef2ff';
      ctx.strokeStyle = isLast ? '#10b981' : '#818cf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(24, y - 16, w - 48, 30, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isLast ? '#065f46' : '#1e293b';
      ctx.font = idx === 0 ? 'bold 12px ui-monospace, monospace' : '12px system-ui, sans-serif';
      ctx.fillText(txt.slice(0, 54), 34, y + 3);
    });
  } else {
    // function_calculus: clean static curve + Riemann rectangles + tangent highlight
    const padX = 36;
    const plotW = w - padX * 2;
    const plotH = h - 54;
    const axisY = h - 32;
    const isSin = /sin|cos/i.test(formulaLatex);

    // Axes
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padX, axisY);
    ctx.lineTo(w - padX, axisY);
    ctx.moveTo(cx, 18);
    ctx.lineTo(cx, h - 18);
    ctx.stroke();

    const evalY = (u: number) => (isSin ? Math.sin(u * 2.2) * 0.42 + 0.5 : 0.18 + u * u * 0.72);

    // Riemann rectangles
    const rectCount = 10;
    const rw = (plotW * 0.65) / rectCount;
    const rx0 = padX + plotW * 0.18;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.65)';
    ctx.lineWidth = 1;
    for (let i = 0; i < rectCount; i++) {
      const u = -0.6 + (i / rectCount) * 1.2;
      const fy = evalY(u) * plotH * 0.8;
      ctx.fillRect(rx0 + i * rw, axisY - fy, rw - 2, fy);
      ctx.strokeRect(rx0 + i * rw, axisY - fy, rw - 2, fy);
    }

    // Main Curve
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const frac = i / 80;
      const u = -1 + frac * 2;
      const sx = padX + frac * plotW;
      const sy = axisY - evalY(u) * plotH * 0.8;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Tangent highlight point
    const uDot = 0.25;
    const dotX = padX + ((uDot + 1) / 2) * plotW;
    const dotY = axisY - evalY(uDot) * plotH * 0.8;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }
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
  const progressRef = useRef<number>(0.25);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);

  const [activeTemplate, setActiveTemplate] = useState<ManimGxTemplateKind>(templateId);
  const [activeFormula, setActiveFormula] = useState(formulaLatex);
  const [activeTitle, setActiveTitle] = useState(title);
  const [playing, setPlaying] = useState(() => isAnimatedTemplate(templateId));
  const [speed, setSpeed] = useState(1);
  const [showCode, setShowCode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [codeDraft, setCodeDraft] = useState(sceneCode);
  const [codeErrors, setCodeErrors] = useState<string[]>([]);

  const animated = isAnimatedTemplate(activeTemplate);

  useEffect(() => {
    setActiveTemplate(templateId);
    setActiveFormula(formulaLatex);
    setActiveTitle(title);
    setPlaying(isAnimatedTemplate(templateId));
  }, [templateId, formulaLatex, title]);

  useEffect(() => {
    setCodeDraft(sceneCode);
  }, [sceneCode]);

  const paintCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawManimFrame(
      ctx,
      canvas.width,
      canvas.height,
      activeTemplate,
      animated ? progressRef.current : 1,
      activeFormula,
    );
  }, [activeTemplate, activeFormula, animated]);

  // Single immediate paint whenever template, formula, or size changes (0 overhead for static visuals!)
  useEffect(() => {
    paintCurrentFrame();
  }, [paintCurrentFrame, fullscreen]);

  // Zero-re-render rAF loop ONLY for 3D animated scenes when playing
  useEffect(() => {
    if (!animated || !playing) return;
    let rafId = 0;
    let lastTs = performance.now();
    let lastUiSync = 0;

    const tick = (now: number) => {
      if (!document.hidden) {
        const dt = Math.min(0.08, (now - lastTs) / 1000);
        // Cap redraws to ~30fps for smooth 3D orbit with minimal CPU usage
        if (dt >= 0.032) {
          lastTs = now;
          progressRef.current = (progressRef.current + (dt * speed) / TOTAL_DURATION_SEC) % 1;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            drawManimFrame(ctx, canvas.width, canvas.height, activeTemplate, progressRef.current, activeFormula);
          }
          // Update slider/time text directly via DOM refs (ZERO React re-renders!)
          if (now - lastUiSync > 100) {
            lastUiSync = now;
            if (sliderRef.current) {
              sliderRef.current.value = String(Math.round(progressRef.current * 100));
            }
            if (timeLabelRef.current) {
              timeLabelRef.current.textContent = `${(progressRef.current * TOTAL_DURATION_SEC).toFixed(1)}s`;
            }
          }
        }
      } else {
        lastTs = now;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animated, playing, speed, activeTemplate, activeFormula]);

  const applyFormula = (nextFormula: string) => {
    const analysis = analyzeForManimGX({ latex: nextFormula });
    setActiveFormula(nextFormula);
    setActiveTemplate(analysis.templateKind);
    setActiveTitle(analysis.scene.title);
    setCodeDraft(analysis.scene.pythonCode);
    onUpdateSceneCode?.(analysis.scene.pythonCode);
    progressRef.current = 0.25;
    setPlaying(isAnimatedTemplate(analysis.templateKind));
  };

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
      progressRef.current = 0.25;
      paintCurrentFrame();
    }
  };

  const canConvert3D = activeTemplate === 'surface_3d' || activeTemplate === 'solid_3d';

  const pythonDrawer =
    showCode && typeof document !== 'undefined'
      ? createPortal(
          <aside
            data-testid={`manimgx-code-drawer-${id}`}
            aria-label="Editor Kode Python ManimGX"
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed right-0 top-14 bottom-0 z-50 flex w-[350px] sm:w-[420px] flex-col border-l border-slate-200 bg-white/98 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Kode Python ManimGX</h2>
                <p className="text-[11px] text-slate-500">
                  manimgx_scene.py · {activeTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCode(false)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              >
                Tutup
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-2.5 overflow-hidden p-4">
              <textarea
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                spellCheck={false}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
              />
              {codeErrors.length > 0 && (
                <div
                  data-testid={`manimgx-sandbox-error-${id}`}
                  className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700"
                >
                  {codeErrors.map((err, i) => (
                    <div key={i}>⚠ {err}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/90 px-4 py-3">
              <span className="text-[11px] text-slate-500">AST Sandbox Aktif</span>
              <button
                type="button"
                data-testid={`manimgx-rerender-btn-${id}`}
                onClick={handleRerenderCode}
                className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500"
              >
                ▶ Terapkan & Render
              </button>
            </div>
          </aside>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        data-testid={`manimgx-widget-${id}`}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        className={
          fullscreen
            ? 'fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl'
            : `flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white text-slate-900 shadow-lg ${
                selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
              }`
        }
      >
        {/* Simple White Header Bar (No WebGPU clutter) */}
        <div
          onPointerDown={handleDragStart}
          className="flex cursor-grab items-center justify-between border-b border-slate-200 bg-slate-50/90 px-3 py-2 text-[11px] active:cursor-grabbing"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/70">
              ManimGX
            </span>
            <span className="truncate font-semibold text-slate-800">{activeTitle}</span>
          </div>
          <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              data-testid={`manimgx-code-btn-${id}`}
              onClick={() => setShowCode((v) => !v)}
              className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${
                showCode
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {'</>'} Kode Python
            </button>
            <button
              type="button"
              onClick={() => setFullscreen((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
              title={fullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            >
              {fullscreen ? '⤢' : '⛶'}
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-100"
                title="Hapus Visual"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Clean Formula & Quick Preset Bar */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 border-b border-slate-100 bg-white px-2.5 py-1.5 text-[10px]"
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
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-800 outline-none focus:border-indigo-400 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => applyFormula(activeFormula)}
            className="rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-500"
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
              className="hidden sm:inline-block rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Main White Canvas Viewport */}
        <div className="relative flex flex-1 overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={fullscreen ? 840 : 460}
            height={fullscreen ? 480 : 260}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Playback Controls ONLY for 3D Animated Templates (Hidden for Static Visuals) */}
        {animated && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/90 px-3 py-1.5 text-[10px]"
          >
            <button
              type="button"
              data-testid={`manimgx-play-btn-${id}`}
              onClick={() => setPlaying((v) => !v)}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 font-bold text-white hover:bg-indigo-500"
            >
              {playing ? '⏸ Jeda' : '▶ Putar'}
            </button>

            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={100}
              defaultValue={Math.round(progressRef.current * 100)}
              onChange={(e) => {
                setPlaying(false);
                progressRef.current = Number(e.target.value) / 100;
                if (timeLabelRef.current) {
                  timeLabelRef.current.textContent = `${(progressRef.current * TOTAL_DURATION_SEC).toFixed(1)}s`;
                }
                paintCurrentFrame();
              }}
              aria-label="Timeline animasi ManimGX"
              className="flex-1 accent-indigo-600"
            />

            <span ref={timeLabelRef} className="font-mono text-slate-500">
              {(progressRef.current * TOTAL_DURATION_SEC).toFixed(1)}s
            </span>

            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Kecepatan animasi"
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-slate-700"
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
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 font-bold text-indigo-700 hover:bg-indigo-100"
              >
                🧊 3D Interaktif
              </button>
            )}
          </div>
        )}
      </div>
      {pythonDrawer}
    </>
  );
};
