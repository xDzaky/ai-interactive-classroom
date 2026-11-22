/**
 * ViewportController — P10-T03
 * Imperative controller for canvas zoom and pan.
 * Updates Konva Stage and subscribers via requestAnimationFrame without triggering React re-renders.
 */
import type Konva from "konva";

export interface ViewportState {
  scale: number;
  x: number;
  y: number;
}

export interface ViewportControllerOptions {
  minScale?: number;
  maxScale?: number;
  initial?: Partial<ViewportState>;
}

export type ViewportSubscriber = (state: ViewportState) => void;

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class ViewportController {
  private state: ViewportState;
  private minScale: number;
  private maxScale: number;
  private stage: Konva.Stage | null = null;
  private subscribers: Set<ViewportSubscriber> = new Set();
  private rafId: number | null = null;
  private dirty = false;
  private nodes: Map<string, { node: Konva.Node; bbox: BoundingBox }> = new Map();
  private bboxCache: WeakMap<object, BoundingBox> = new WeakMap();

  constructor(options: ViewportControllerOptions = {}) {
    this.minScale = options.minScale ?? 0.1;
    this.maxScale = options.maxScale ?? 8.0;
    this.state = {
      scale: Math.min(this.maxScale, Math.max(this.minScale, options.initial?.scale ?? 1)),
      x: options.initial?.x ?? 0,
      y: options.initial?.y ?? 0,
    };
  }

  public attachStage(stage: Konva.Stage | null): void {
    this.stage = stage;
    if (stage) {
      this.syncStageImmediately();
    }
  }

  public getStage(): Konva.Stage | null {
    return this.stage;
  }

  public getState(): ViewportState {
    return { ...this.state };
  }

  public subscribe(fn: ViewportSubscriber): () => void {
    this.subscribers.add(fn);
    fn(this.getState());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /**
   * Zoom centered at a screen coordinate (e.g. cursor position).
   * Invariant: the world point under (screenX, screenY) remains unchanged.
   */
  public zoomAt(screenX: number, screenY: number, factor: number): void {
    const oldScale = this.state.scale;
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, oldScale * factor));
    if (Math.abs(newScale - oldScale) < 1e-6) return;

    // World coordinate under cursor before zoom
    const worldX = (screenX - this.state.x) / oldScale;
    const worldY = (screenY - this.state.y) / oldScale;

    // Calculate new position so the world coordinate stays at the same screen point
    this.state.scale = newScale;
    this.state.x = screenX - worldX * newScale;
    this.state.y = screenY - worldY * newScale;

    this.requestApply();
  }

  /**
   * Pan viewport by delta screen pixels.
   */
  public panBy(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    this.state.x += dx;
    this.state.y += dy;
    this.requestApply();
  }

  /**
   * Set specific viewport properties.
   */
  public set(partial: Partial<ViewportState>): void {
    let changed = false;
    if (partial.scale !== undefined) {
      const clamped = Math.min(this.maxScale, Math.max(this.minScale, partial.scale));
      if (clamped !== this.state.scale) {
        this.state.scale = clamped;
        changed = true;
      }
    }
    if (partial.x !== undefined && partial.x !== this.state.x) {
      this.state.x = partial.x;
      changed = true;
    }
    if (partial.y !== undefined && partial.y !== this.state.y) {
      this.state.y = partial.y;
      changed = true;
    }

    if (changed) {
      this.requestApply();
    }
  }

  /**
   * Screen point to world point conversion using current viewport state.
   */
  public toWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.state.x) / this.state.scale,
      y: (screenY - this.state.y) / this.state.scale,
    };
  }

  /**
   * World point to screen point conversion.
   */
  public toScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.state.scale + this.state.x,
      y: worldY * this.state.scale + this.state.y,
    };
  }

  private requestApply(): void {
    this.dirty = true;
    if (this.rafId !== null) return;

    if (typeof requestAnimationFrame !== "undefined") {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.apply();
      });
    } else {
      this.apply();
    }
  }

  public registerNode(id: string, node: Konva.Node | null, bbox?: BoundingBox): void {
    if (!node) {
      this.nodes.delete(id);
    } else if (bbox) {
      this.nodes.set(id, { node, bbox });
    }
  }

  public getCachedBbox(obj: object, compute: () => BoundingBox): BoundingBox {
    let box = this.bboxCache.get(obj);
    if (!box) {
      box = compute();
      this.bboxCache.set(obj, box);
    }
    return box;
  }

  public getRegisteredNodeCount(): number {
    return this.nodes.size;
  }

  private updateCulling(): void {
    const count = this.nodes.size;
    // Culling only active when object count > 200
    if (count <= 200) {
      this.nodes.forEach(({ node }) => {
        if (typeof node.visible === "function" && !node.visible()) {
          node.visible(true);
        }
      });
      return;
    }

    const stageWidth = (typeof this.stage?.width === "function" ? this.stage.width() : 1920) || 1920;
    const stageHeight = (typeof this.stage?.height === "function" ? this.stage.height() : 1080) || 1080;
    const margin = 200;

    const worldLeft = -this.state.x / this.state.scale - margin;
    const worldTop = -this.state.y / this.state.scale - margin;
    const worldRight = worldLeft + stageWidth / this.state.scale + margin * 2;
    const worldBottom = worldTop + stageHeight / this.state.scale + margin * 2;

    this.nodes.forEach(({ node, bbox }) => {
      if (typeof node.visible !== "function") return;
      const isVisible =
        bbox.x + bbox.w >= worldLeft &&
        bbox.x <= worldRight &&
        bbox.y + bbox.h >= worldTop &&
        bbox.y <= worldBottom;

      if (node.visible() !== isVisible) {
        node.visible(isVisible);
      }
    });
  }

  public apply(): void {
    this.dirty = false;
    this.syncStageImmediately();
    this.updateCulling();
    const current = this.getState();
    this.subscribers.forEach((fn) => {
      try {
        fn(current);
      } catch (err) {
        console.error("Viewport subscriber error", err);
      }
    });
  }

  private syncStageImmediately(): void {
    if (!this.stage) return;
    if (typeof this.stage.scale === "function") {
      this.stage.scale({ x: this.state.scale, y: this.state.scale });
    }
    if (typeof this.stage.position === "function") {
      this.stage.position({ x: this.state.x, y: this.state.y });
    }
    if (typeof this.stage.batchDraw === "function") {
      this.stage.batchDraw();
    }
  }

  public destroy(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.subscribers.clear();
    this.nodes.clear();
    this.stage = null;
  }
}
