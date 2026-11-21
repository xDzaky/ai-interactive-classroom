import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { createRoom, openLobby } from "@/lib/api/rooms";
import type { Classroom } from "@ai-classroom/shared-types";
import type { RoomMode } from "@/lib/api/rooms";

export default function CreateRoomPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [classroomId, setClassroomId] = useState("");
  const [mode, setMode] = useState<RoomMode>("projector");
  const [error, setError] = useState<string | null>(null);

  // Fetch all schools → classrooms for the select
  const { data: classrooms = [], isLoading } = useQuery<Classroom[]>({
    queryKey: ["my-classrooms"],
    queryFn: async () => {
      const schoolsRes = await api.get<{ data: { id: string }[] }>(
        "/api/v1/schools",
      );
      const schools = schoolsRes.data.data ?? [];
      const all: Classroom[] = [];
      for (const school of schools) {
        const clsRes = await api.get<{ data: Classroom[] }>(
          `/api/v1/schools/${school.id}/classrooms`,
        );
        all.push(...(clsRes.data.data ?? []));
      }
      return all;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!classroomId) throw new Error("Pilih kelas terlebih dahulu.");
      const room = await createRoom({ classroom_id: classroomId, mode });
      const targetId = room?.id ?? (room as unknown as { data?: { id?: string } })?.data?.id;
      if (!targetId) throw new Error("Gagal mendapatkan ID ruangan.");
      // Transition to lobby immediately
      const lobbyRoom = await openLobby(targetId);
      return lobbyRoom;
    },
    onSuccess: (room) => {
      const targetId = room?.id ?? (room as unknown as { data?: { id?: string } })?.data?.id;
      if (targetId) {
        navigate(`/room/${targetId}/lobby`);
      }
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Gagal membuat room.";
      setError(msg);
    },
  });

  const modes: { value: RoomMode; label: string }[] = [
    { value: "projector", label: t("room.mode.projector") },
    { value: "smart_display", label: t("room.mode.smartDisplay") },
    { value: "mobile_host", label: t("room.mode.mobileHost") },
    { value: "group", label: t("room.mode.group") },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-slate-500 hover:text-slate-700"
        >
          ← {t("common.back")}
        </button>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          {t("room.createRoom")}
        </h1>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Classroom select */}
        <div className="mb-4">
          <label
            htmlFor="classroom-select"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {t("room.classroom")}
          </label>
          {isLoading ? (
            <p className="text-sm text-slate-400">{t("common.loading")}</p>
          ) : (
            <select
              id="classroom-select"
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-required="true"
            >
              <option value="">{t("room.selectClassroom")}</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Mode select */}
        <div className="mb-6">
          <label
            htmlFor="mode-select"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {t("room.mode.label")}
          </label>
          <select
            id="mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as RoomMode)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {modes.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !classroomId}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          aria-busy={mutation.isPending}
        >
          {mutation.isPending ? t("common.loading") : t("room.startRoom")}
        </button>
      </div>
    </div>
  );
}
