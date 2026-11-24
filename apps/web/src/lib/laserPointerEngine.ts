/**
 * laserPointerEngine.ts — High-Performance Freenote-Style Laser Pointer Engine (V5)
 *
 * Renders on an independent transparent overlay <canvas> using requestAnimationFrame.
 * NEVER mutates board state or undo history!
 * Supports:
 * - Mode "dot" (Tidak Ada Ekor) vs "trail" (Ekor memudar)
 * - Quadratic alpha decay α_i = max(0, 1 - (t - t_i)/duration)^2 and width taper w_i = w0 * α_i
 */

export interface LaserConfig {
  mode: 'dot' | 'trail';
  thickness: number; // 0.5 .. 3.0 (scaled to px)
  durationSec: number; // 0.5 .. 4.0
  color: string;
}

export interface LaserPoint {
  x: number;
  y: number;
  t: number; // performance.now() ms
}

export class LaserPointerEngine {
  private points: LaserPoint[] = [];
  private activeDot: { x: number; y: number } | null = null;
  private rafId: number | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: LaserConfig;

  constructor(initialConfig?: Partial<LaserConfig>) {
    this.config = {
      mode: 'trail',
      thickness: 1.0,
      durationSec: 1.2,
      color: '#ef4444',
      ...initialConfig,
    };
  }

  public attach(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    if (canvas && this.rafId === null) {
      this.startLoop();
    } else if (!canvas && this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public setConfig(next: Partial<LaserConfig>): void {
    this.config = { ...this.config, ...next };
  }

  public getConfig(): LaserConfig {
    return { ...this.config };
  }

  public pushPoint(x: number, y: number): void {
    const now = performance.now();
    this.activeDot = { x, y };
    if (this.config.mode === 'trail') {
      this.points.push({ x, y, t: now });
    } else {
      this.points = [{ x, y, t: now }];
    }
  }

  public endStroke(): void {
    this.activeDot = null;
  }

  public clear(): void {
    this.points = [];
    this.activeDot = null;
    if (this.canvas) {
      const ctx = this.canvas.getContext('2d');
      ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.points = [];
    this.canvas = null;
  }

  private startLoop(): void {
    const render = () => {
      this.rafId = requestAnimationFrame(render);
      const canvas = this.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = performance.now();
      const durMs = Math.max(250, this.config.durationSec * 1000);
      this.points = this.points.filter((p) => now - p.t <= durMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const baseWidth = Math.max(3, this.config.thickness * 7);

      if (this.config.mode === 'trail' && this.points.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < this.points.length; i++) {
          const prev = this.points[i - 1];
          const curr = this.points[i];
          const age = (now - curr.t) / durMs;
          const alpha = Math.pow(Math.max(0, 1 - age), 2);
          if (alpha <= 0.01) continue;

          // Outer glow
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = this.config.color;
          ctx.globalAlpha = alpha * 0.45;
          ctx.lineWidth = baseWidth * alpha * 2.1;
          ctx.stroke();

          // Bright white-hot core
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.92;
          ctx.lineWidth = Math.max(1.5, baseWidth * alpha * 0.65);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // Glowing laser head dot
      const head = this.activeDot ?? (this.config.mode === 'dot' && this.points[0] ? this.points[0] : null);
      if (head) {
        const r = Math.max(6, baseWidth * 1.15);
        const grad = ctx.createRadialGradient(head.x, head.y, 1, head.x, head.y, r * 2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, this.config.color);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(head.x, head.y, r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    this.rafId = requestAnimationFrame(render);
  }
}
