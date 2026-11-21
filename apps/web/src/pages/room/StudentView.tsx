/**
 * StudentView — P04-T07 / P05-T03
 * Student view: read-only whiteboard + raise hand (FR-013) + follow-teacher toggle.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createInitialBoardState,
  applyEvent,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, WhiteboardEvent } from "@ai-classroom/whiteboard-core";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";
import { RaiseHandButton } from "@/components/room/RaiseHandButton";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface StudentViewProps {
  roomId: string;
  participantToken: string;
  /** Participant ID decoded from token */
  participantId: string;
  roomCode?: string;
}

// ---------------------------------------------------------------------------
// StudentView
// ---------------------------------------------------------------------------

export function StudentView({
  roomId,
  participantToken,
  participantId: _pid,
  roomCode,
}: StudentViewProps) {
  const { t } = useTranslation();

  // Board state (read-only; events arrive via sync engine P04-T08)
  const [boardState, setBoardState] = useState<BoardState>(() =>
    createInitialBoardState(roomId),
  );

  const handleEvent = useCallback((event: WhiteboardEvent) => {
    setBoardState((prev) => applyEvent(prev, event)[0]);
  }, []);

  // Canvas size
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    function update() {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight - 56 - 56 });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Follow teacher toggle
  const [followTeacher, setFollowTeacher] = useState(true);
  const toggleFollow = useCallback(() => setFollowTeacher((prev) => !prev), []);

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-700 px-4">
        <span className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse"
            aria-hidden="true"
          />
          {t("room.live")}
        </span>
        {roomCode && (
          <span className="font-mono text-xs text-slate-400">
            {t("room.joinCode")}: <strong className="text-white">{roomCode}</strong>
          </span>
        )}
      </header>

      {/* Canvas area */}
      <main className="flex-1 overflow-hidden" aria-label="Papan tulis (hanya lihat)">
        <WhiteboardCanvas
          boardState={boardState}
          onEvent={handleEvent}
          width={canvasSize.width}
          height={canvasSize.height}
          showGrid
          readOnly
        />
      </main>

      {/* Bottom action bar */}
      <div
        className="flex h-14 shrink-0 items-center justify-center gap-4 border-t border-slate-700 bg-slate-800 px-4"
        role="toolbar"
        aria-label="Kontrol siswa"
      >
        {/* Raise hand — FR-013: now wired to API via RaiseHandButton (P05-T03) */}
        <RaiseHandButton roomId={roomId} participantToken={participantToken} />

        {/* Follow teacher toggle */}
        <button
          onClick={toggleFollow}
          aria-pressed={followTeacher}
          className={[
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            followTeacher
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-700 text-slate-200 hover:bg-slate-600",
          ].join(" ")}
        >
          <span aria-hidden="true">{followTeacher ? "🔗" : "🔓"}</span>
          {followTeacher ? t("room.followTeacher") : t("room.independentView")}
        </button>
      </div>
    </div>
  );
}
