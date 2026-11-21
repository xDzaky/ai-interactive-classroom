/**
 * RandomPicker — P06-T05
 * Picks a random participant from the provided list.
 * Pure client-side — no backend required.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RandomPickerProps {
  participants: { id: string; alias: string }[];
}

// ---------------------------------------------------------------------------
// RandomPicker
// ---------------------------------------------------------------------------

export function RandomPicker({ participants }: RandomPickerProps) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const handlePick = () => {
    if (participants.length === 0) return;

    setPicking(true);
    setPicked(null);

    // Brief animation delay before showing result
    let count = 0;
    const interval = setInterval(() => {
      const random = participants[Math.floor(Math.random() * participants.length)];
      setPicked(random.alias);
      count++;
      if (count >= 8) {
        clearInterval(interval);
        setPicking(false);
      }
    }, 80);
  };

  if (participants.length === 0) {
    return (
      <div className="p-3 text-xs text-slate-400">
        <p className="font-semibold text-white text-xs uppercase tracking-wide mb-1">
          {t("picker.title")}
        </p>
        {t("picker.noParticipants")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <p className="font-semibold text-white text-xs uppercase tracking-wide">
        {t("picker.title")}
      </p>

      {/* Result display */}
      <div
        className={`text-center rounded-lg py-3 font-bold text-sm transition-all ${
          picked && !picking
            ? "bg-indigo-700 text-white"
            : "bg-slate-700 text-slate-400"
        }`}
        aria-live="polite"
        aria-label={picked ? `${t("picker.selected")}: ${picked}` : t("picker.prompt")}
      >
        {picked ? (
          <span>{picked}</span>
        ) : (
          <span className="text-xs">{t("picker.prompt")}</span>
        )}
      </div>

      <button
        onClick={handlePick}
        disabled={picking}
        className="rounded px-3 py-1 bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        aria-label={t("picker.pick")}
      >
        {picking ? "…" : t("picker.pick")}
      </button>

      <p className="text-xs text-slate-400 text-center">
        {participants.length} {t("picker.participantCount")}
      </p>
    </div>
  );
}
