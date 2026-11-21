/**
 * PresentationView — P04-T07
 * Full-screen read-only whiteboard for projector / smart display mode.
 * No editing tools; shows join code and fullscreen toggle.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createInitialBoardState,
  applyEvent,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, WhiteboardEvent } from "@ai-classroom/whiteboard-core";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PresentationViewProps {
  roomId: string;
  roomCode?: string;
}

// ---------------------------------------------------------------------------
// PresentationView
// ---------------------------------------------------------------------------

export function PresentationView({ roomId, roomCode }: PresentationViewProps) {
  const { t } = useTranslation();

  // Board state (read-only; events arrive via sync engine P04-T08)
  const [boardState, setBoardState] = useState<BoardState>(() =>
    createInitialBoardState(roomId),
  );

  const handleEvent = useCallback((event: WhiteboardEvent) => {
    setBoardState((prev) => applyEvent(prev, event)[0]);
  }, []);

  // Canvas fills the viewport minus the thin header bar
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    function update() {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight - 40 });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Fullscreen toggle
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-black text-white overflow-hidden">
      {/* Thin top bar */}
      <header className="flex h-10 shrink-0 items-center gap-3 bg-black/80 px-4">
        {roomCode && (
          <span className="font-mono text-sm text-slate-300">
            {t("room.joinCode")}: <strong className="text-white">{roomCode}</strong>
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={toggleFullscreen}
            className="rounded px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
          >
            {isFullscreen ? "⤡" : "⤢"}
          </button>
        </div>
      </header>

      {/* Canvas — read-only, no toolbar */}
      <main className="flex-1 overflow-hidden" aria-label="Papan tulis presentasi">
        <WhiteboardCanvas
          boardState={boardState}
          onEvent={handleEvent}
          width={canvasSize.width}
          height={canvasSize.height}
          showGrid={false}
          readOnly
        />
      </main>
    </div>
  );
}
