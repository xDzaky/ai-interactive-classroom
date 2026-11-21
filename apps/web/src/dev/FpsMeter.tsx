/**
 * FpsMeter — rAF frame time sampler for performance testing (P10-T01)
 */
import { useEffect, useState, useRef } from "react";
import { parsePerfParam } from "./perfFixture";

export function FpsMeter() {
  const [stats, setStats] = useState<{ avg: number; p95: number; fps: number } | null>(null);
  const perfConfig = parsePerfParam();
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    if (!perfConfig) return;

    function loop(now: number) {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0 && delta < 1000) {
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 120) {
          frameTimesRef.current.shift();
        }

        if (frameTimesRef.current.length >= 30) {
          const sorted = [...frameTimesRef.current].sort((a, b) => a - b);
          const sum = sorted.reduce((a, b) => a + b, 0);
          const avg = sum / sorted.length;
          const p95Idx = Math.floor(sorted.length * 0.95);
          const p95 = sorted[p95Idx];
          const fps = 1000 / avg;
          setStats({ avg, p95, fps });
        }
      }

      rafIdRef.current = requestAnimationFrame(loop);
    }

    rafIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [perfConfig]);

  if (!perfConfig || !stats) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 16,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(4px)",
        border: "1px solid rgba(99, 102, 241, 0.4)",
        borderRadius: 8,
        padding: "6px 12px",
        color: "#f8fafc",
        fontFamily: "monospace",
        fontSize: 12,
        pointerEvents: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      <div>
        <strong>PERF SCENE</strong>: {perfConfig.strokes} strokes, {perfConfig.shapes} shapes
      </div>
      <div>
        FPS: <strong>{Math.round(stats.fps)}</strong> | Avg:{" "}
        <strong>{stats.avg.toFixed(1)} ms</strong> | p95:{" "}
        <strong style={{ color: stats.p95 > 33 ? "#ef4444" : stats.p95 > 20 ? "#eab308" : "#22c55e" }}>
          {stats.p95.toFixed(1)} ms
        </strong>
      </div>
    </div>
  );
}
