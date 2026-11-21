/**
 * ClassroomTimer — P06-T05
 * Host-controlled countdown timer. Host sets duration and starts/pauses/resets.
 * Pure client-side (no backend); persists in component state.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ClassroomTimerProps {
  /** Whether this instance can control the timer (host = true) */
  canControl?: boolean;
}

// ---------------------------------------------------------------------------
// ClassroomTimer
// ---------------------------------------------------------------------------

export function ClassroomTimer({ canControl = false }: ClassroomTimerProps) {
  const { t } = useTranslation();

  const [duration, setDuration] = useState(60); // seconds
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start / pause / reset logic
  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  const handleStart = () => {
    if (remaining === 0) setRemaining(duration);
    setRunning(true);
  };

  const handlePause = () => setRunning(false);

  const handleReset = () => {
    setRunning(false);
    setRemaining(duration);
  };

  const handleDurationChange = (secs: number) => {
    setDuration(secs);
    setRemaining(secs);
    setRunning(false);
  };

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const pct = duration > 0 ? (remaining / duration) * 100 : 0;
  const isExpired = remaining === 0;

  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <p className="font-semibold text-white text-xs uppercase tracking-wide">
        {t("timer.title")}
      </p>

      {/* Timer display */}
      <div
        className={`text-3xl font-mono font-bold text-center tabular-nums ${
          isExpired
            ? "text-red-400"
            : running
              ? "text-green-400"
              : "text-white"
        }`}
        aria-live="polite"
        aria-label={`${t("timer.remaining")}: ${display}`}
      >
        {display}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-600">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isExpired ? "bg-red-500" : "bg-indigo-500"
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={remaining}
          aria-valuemin={0}
          aria-valuemax={duration}
        />
      </div>

      {/* Controls — host only */}
      {canControl && (
        <>
          {/* Duration presets */}
          <div className="flex gap-1 flex-wrap">
            {[30, 60, 120, 300].map((s) => (
              <button
                key={s}
                onClick={() => handleDurationChange(s)}
                className={`rounded px-2 py-0.5 text-xs transition-colors ${
                  duration === s
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
                aria-label={`${t("timer.set")} ${s}s`}
              >
                {s < 60 ? `${s}s` : `${s / 60}m`}
              </button>
            ))}
          </div>

          {/* Start / Pause / Reset */}
          <div className="flex gap-2">
            {!running ? (
              <button
                onClick={handleStart}
                disabled={remaining === 0 && duration === 0}
                className="flex-1 rounded px-3 py-1 bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-60 transition-colors"
                aria-label={t("timer.start")}
              >
                {t("timer.start")}
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex-1 rounded px-3 py-1 bg-yellow-600 text-white text-xs hover:bg-yellow-700 transition-colors"
                aria-label={t("timer.pause")}
              >
                {t("timer.pause")}
              </button>
            )}
            <button
              onClick={handleReset}
              className="rounded px-3 py-1 bg-slate-600 text-white text-xs hover:bg-slate-500 transition-colors"
              aria-label={t("timer.reset")}
            >
              {t("timer.reset")}
            </button>
          </div>
        </>
      )}

      {isExpired && (
        <p className="text-xs text-red-400 text-center font-medium" role="alert">
          {t("timer.expired")}
        </p>
      )}
    </div>
  );
}
