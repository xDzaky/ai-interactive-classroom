/**
 * GridBackground.tsx — P10-T04
 *
 * CSS-only adaptive grid rendered in a <div> BEHIND the Konva canvas.
 * Consumes zero canvas operations and zero React re-renders during zoom/pan.
 *
 * Updates CSS variables (--gs, --gx, --gy, --major-gs, --major-gx, --major-gy)
 * imperatively via ViewportController subscription.
 */
import { useEffect, useRef } from "react";
import type { ViewportController } from "@/lib/viewport";
import { gridSpec } from "@/lib/gridSpec";

export interface GridBackgroundProps {
  viewportController: ViewportController;
  visible?: boolean;
}

export function GridBackground({
  viewportController,
  visible = true,
}: GridBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = (v: { scale: number; x: number; y: number }) => {
      const spec = gridSpec(v.scale);
      if (!spec.visible || !visible) {
        el.style.display = "none";
        return;
      }
      el.style.display = "block";

      const gs = spec.screenSpacing;
      const majorGs = gs * 5;

      const gx = ((v.x % gs) + gs) % gs;
      const gy = ((v.y % gs) + gs) % gs;

      const majorGx = ((v.x % majorGs) + majorGs) % majorGs;
      const majorGy = ((v.y % majorGs) + majorGs) % majorGs;

      el.style.setProperty("--gs", `${gs}px`);
      el.style.setProperty("--gx", `${gx}px`);
      el.style.setProperty("--gy", `${gy}px`);
      el.style.setProperty("--major-gs", `${majorGs}px`);
      el.style.setProperty("--major-gx", `${majorGx}px`);
      el.style.setProperty("--major-gy", `${majorGy}px`);
    };

    update(viewportController.getState());
    return viewportController.subscribe(update);
  }, [viewportController, visible]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      data-testid="grid-background"
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundColor: "#ffffff",
        backgroundImage: `
          linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
          linear-gradient(to right, rgba(15, 23, 42, 0.035) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(15, 23, 42, 0.035) 1px, transparent 1px)
        `,
        backgroundSize: `
          var(--major-gs, 100px) var(--major-gs, 100px),
          var(--major-gs, 100px) var(--major-gs, 100px),
          var(--gs, 20px) var(--gs, 20px),
          var(--gs, 20px) var(--gs, 20px)
        `,
        backgroundPosition: `
          var(--major-gx, 0px) var(--major-gy, 0px),
          var(--major-gx, 0px) var(--major-gy, 0px),
          var(--gx, 0px) var(--gy, 0px),
          var(--gx, 0px) var(--gy, 0px)
        `,
      }}
    />
  );
}

export default GridBackground;
