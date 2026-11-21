/**
 * RaiseHandButton — P05-T03
 * Student action: raise / lower hand via POST /presenter-requests.
 * Shows loading + current status (pending, active, idle).
 */
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  raiseHand,
  deletePresenterRequest,
  type PRStatus,
  type PresenterRequest,
} from "@/lib/api/presenterRequests";

export interface RaiseHandButtonProps {
  roomId: string;
  participantToken?: string;
}

export function RaiseHandButton({ roomId, participantToken }: RaiseHandButtonProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PRStatus | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRaise = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const pr: PresenterRequest = await raiseHand(roomId, "draw_only", participantToken);
      setStatus(pr.status);
      setRequestId(pr.id);
    } catch {
      // ignore — user can retry
    } finally {
      setLoading(false);
    }
  }, [roomId, participantToken, loading]);

  const handleLower = useCallback(async () => {
    if (!requestId || loading) return;
    setLoading(true);
    try {
      await deletePresenterRequest(roomId, requestId, participantToken);
      setStatus(null);
      setRequestId(null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [roomId, requestId, participantToken, loading]);

  const isRaised = status === "requested" || status === "approved" || status === "active";

  return (
    <button
      onClick={isRaised ? handleLower : handleRaise}
      disabled={loading}
      aria-pressed={isRaised}
      aria-label={isRaised ? t("room.lowerHand") : t("room.raiseHand")}
      data-testid="raise-hand-btn"
      className={[
        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        isRaised
          ? "bg-yellow-500 text-white hover:bg-yellow-600"
          : "bg-slate-700 text-slate-200 hover:bg-slate-600",
      ].join(" ")}
    >
      <span aria-hidden="true">✋</span>
      {loading
        ? "…"
        : status === "active"
          ? t("room.presenterActive")
          : isRaised
            ? t("room.lowerHand")
            : t("room.raiseHand")}
    </button>
  );
}
