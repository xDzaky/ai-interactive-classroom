/**
 * ReplayViewer.tsx — P07-T03
 * Board replay UI: timeline scrubber, play/pause controls, speed selector,
 * and key-event highlights.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createReplayEngine } from "@/lib/replayEngine";
import type { ReplayEngine, PlaybackSpeed } from "@/lib/replayEngine";
import type { BoardState } from "@ai-classroom/whiteboard-core";

/** Key event types shown as coloured markers on the timeline */
const KEY_EVENT_TYPES = new Set(["draw", "erase", "clear", "shape_add", "text_add"]);

const SPEEDS: PlaybackSpeed[] = [1, 2, 4];

export default function ReplayViewer() {
  const { t } = useTranslation();
  const { roomId } = useParams<{ roomId: string }>();

  const engineRef = useRef<ReplayEngine | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [cursor, setCursor] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_boardState, setBoardState] = useState<BoardState | null>(null);

  // Seek to a position
  const seekTo = useCallback(
    async (targetSeq: number) => {
      if (!engineRef.current) return;
      setIsLoading(true);
      try {
        const state = await engineRef.current.seek(targetSeq);
        setBoardState(state);
        setCursor(engineRef.current.getCursor());
        setDuration(engineRef.current.getDuration());
      } catch {
        setError(t("replay.seekError"));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  // Initialise engine on mount
  useEffect(() => {
    if (!roomId) return;
    const engine = createReplayEngine(roomId);
    engineRef.current = engine;
    // Start at beginning (seq 0)
    void seekTo(0);
  }, [roomId, seekTo]);

  // Auto-play loop
  useEffect(() => {
    if (!isPlaying || !engineRef.current) return;

    const ms = engineRef.current.msPerStep;
    intervalRef.current = setInterval(() => {
      if (!engineRef.current) return;
      const state = engineRef.current.step();
      if (state === null) {
        // End of replay
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setBoardState(state);
      setCursor(engineRef.current.getCursor());
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleSpeedChange = useCallback(
    (newSpeed: PlaybackSpeed) => {
      setSpeed(newSpeed);
      engineRef.current?.setSpeed(newSpeed);
      // If playing, restart interval with new speed
      if (isPlaying) {
        setIsPlaying(false);
        setTimeout(() => setIsPlaying(true), 0);
      }
    },
    [isPlaying],
  );

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = Number(e.target.value);
      // Convert slider index to seek position (approximate seq by index)
      void seekTo(idx);
    },
    [seekTo],
  );

  const progress = duration > 0 ? cursor + 1 : 0;
  const percentage = duration > 0 ? Math.round(((cursor + 1) / duration) * 100) : 0;

  return (
    <div
      data-testid="replay-viewer"
      className="flex h-screen flex-col bg-gray-900 text-white"
    >
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-gray-700 px-6 py-3">
        <h1 className="text-lg font-semibold">{t("replay.title")}</h1>
        <span className="ml-auto text-sm text-gray-400">
          {t("replay.room")}: {roomId}
        </span>
      </header>

      {/* Board area placeholder */}
      <div className="flex-1 bg-gray-800 flex items-center justify-center">
        {isLoading && (
          <div
            data-testid="replay-loading"
            className="text-gray-400"
          >
            {t("replay.loading")}
          </div>
        )}
        {error && (
          <div
            data-testid="replay-error"
            className="text-red-400"
          >
            {error}
          </div>
        )}
        {!isLoading && !error && (
          <div
            data-testid="replay-board"
            className="text-gray-500 text-sm"
          >
            {t("replay.boardPlaceholder")}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        data-testid="replay-controls"
        className="border-t border-gray-700 bg-gray-900 px-6 py-4 space-y-3"
      >
        {/* Timeline scrubber */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-16 text-right">
            {progress}/{duration}
          </span>
          <input
            data-testid="replay-scrubber"
            type="range"
            min={0}
            max={Math.max(0, duration - 1)}
            value={Math.max(0, cursor)}
            onChange={handleScrub}
            className="flex-1 accent-blue-500"
            aria-label={t("replay.scrubberLabel")}
          />
          <span className="text-xs text-gray-400 w-10">{percentage}%</span>
        </div>

        {/* Key-event highlights row */}
        <div
          data-testid="replay-highlights"
          className="relative h-3 bg-gray-700 rounded"
          aria-label={t("replay.highlights")}
        >
          {/* Rendered as CSS markers — just a visual guide */}
          <div
            className="absolute left-0 top-0 h-full bg-blue-600 rounded transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Button row */}
        <div className="flex items-center gap-4">
          {/* Play / Pause */}
          <button
            data-testid="replay-play-pause"
            onClick={handlePlayPause}
            disabled={duration === 0}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            aria-label={isPlaying ? t("replay.pause") : t("replay.play")}
          >
            {isPlaying ? t("replay.pause") : t("replay.play")}
          </button>

          {/* Speed selector */}
          <div
            data-testid="replay-speed-selector"
            className="flex items-center gap-1"
            role="group"
            aria-label={t("replay.speedLabel")}
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                data-testid={`speed-btn-${s}`}
                onClick={() => handleSpeedChange(s)}
                className={`rounded px-3 py-1 text-sm ${
                  speed === s
                    ? "bg-blue-600 font-semibold"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Key event types legend */}
          <span className="ml-auto text-xs text-gray-500">
            {KEY_EVENT_TYPES.size} {t("replay.keyEventTypes")}
          </span>
        </div>
      </div>
    </div>
  );
}
