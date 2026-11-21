import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { fetchRoom, startRoom, regenerateCode } from "@/lib/api/rooms";

export default function LobbyPage() {
  const { t } = useTranslation();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const {
    data: room,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => fetchRoom(roomId!),
    refetchInterval: 5000, // poll every 5 s for status changes
    enabled: !!roomId,
  });

  const startMutation = useMutation({
    mutationFn: () => startRoom(roomId!),
    onSuccess: () => navigate(`/room/${roomId}`),
  });

  const regenMutation = useMutation({
    mutationFn: () => regenerateCode(roomId!),
    onSuccess: () => refetch(),
  });

  // Join URL for QR code
  const joinUrl = room
    ? `${window.location.origin}/join/${room.code}`
    : "";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-slate-500">{t("room.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{t("room.lobby")}</h1>
          <p className="text-sm text-slate-400">
            {t("room.status")}: {room.status}
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-slate-400 hover:text-white"
        >
          {t("common.back")}
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
        {/* Join code */}
        <div className="text-center">
          <p className="mb-2 text-sm font-medium text-slate-400">
            {t("room.joinCode")}
          </p>
          <p
            className="font-mono text-6xl font-bold tracking-widest text-white"
            aria-label={`Kode bergabung: ${room.code}`}
          >
            {room.code}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {window.location.origin}/join/{room.code}
          </p>
        </div>

        {/* QR code */}
        <div
          className="rounded-2xl bg-white p-4"
          aria-label={t("room.qrCode")}
        >
          <QRCodeSVG value={joinUrl} size={200} />
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            className="rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold hover:bg-blue-700 disabled:opacity-50"
            aria-busy={startMutation.isPending}
          >
            {startMutation.isPending ? t("common.loading") : t("room.startNow")}
          </button>

          <button
            onClick={() => regenMutation.mutate()}
            disabled={regenMutation.isPending}
            className="text-sm text-slate-400 hover:text-white"
          >
            {t("room.regenerateCode")}
          </button>
        </div>
      </main>
    </div>
  );
}
