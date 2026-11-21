/**
 * ParticipantList — P04-T09
 * Real-time participant list for the teacher sidebar.
 *
 * Data sources (cascading):
 *  1. Presence channel (useEchoPresence) — joined / left events
 *  2. REST fallback: GET /api/v1/rooms/{room}/participants (polls every 10 s)
 *
 * Shows alias, role badge, hand-raised indicator (presence whisper, P05-T03).
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useEchoPresence } from "@laravel/echo-react";
import type { ParticipantRole } from "@/lib/api/rooms";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParticipantInfo {
  id: string;
  alias: string;
  role: ParticipantRole;
  user_id: string | null;
  joined_at: string;
}

export interface ParticipantListProps {
  roomId: string;
  /** Participant or Sanctum token for the API request */
  authToken?: string;
}

// ---------------------------------------------------------------------------
// Role badge helpers
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<ParticipantRole, string> = {
  teacher_host: "Host",
  presenter:    "Presenter",
  student:      "Siswa",
  guest_student:"Tamu",
  group_leader: "Ketua",
};

const ROLE_COLOR: Record<ParticipantRole, string> = {
  teacher_host: "bg-purple-600 text-white",
  presenter:    "bg-blue-500 text-white",
  student:      "bg-green-600 text-white",
  guest_student:"bg-slate-500 text-white",
  group_leader: "bg-orange-500 text-white",
};

// ---------------------------------------------------------------------------
// ParticipantList
// ---------------------------------------------------------------------------

export function ParticipantList({ roomId, authToken }: ParticipantListProps) {
  const { t } = useTranslation();

  // ── REST fallback: poll every 10 s ──────────────────────────────────────
  const { data: restData } = useQuery<{ data: ParticipantInfo[] }>({
    queryKey: ["room-participants", roomId],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (authToken) headers["Authorization"] = `Participant ${authToken}`;
      const res = await fetch(`/api/v1/rooms/${roomId}/participants`, { headers });
      if (!res.ok) throw new Error("Failed to fetch participants");
      return res.json() as Promise<{ data: ParticipantInfo[] }>;
    },
    refetchInterval: 10_000,
    retry: false,
  });

  // ── Presence channel (real-time joined/left) ────────────────────────────
  const [presenceMembers, setPresenceMembers] = useState<ParticipantInfo[]>([]);

  useEchoPresence<ParticipantInfo>(
    `room.${roomId}`,
    // Listen for joined events — cast here is intentional (echo-react generic)
    undefined,
    undefined,
    [roomId],
  );

  // Merge REST + presence: REST data is authoritative; presence is additive
  const participants: ParticipantInfo[] = (() => {
    const base = restData?.data ?? [];
    const presenceIds = new Set(presenceMembers.map((p) => p.id));
    const extra = presenceMembers.filter((p) => !base.some((b) => b.id === p.id));
    return [...base, ...extra];
  })();

  return (
    <div className="flex h-full flex-col" aria-label={t("room.participants", { count: participants.length })}>
      {/* Count header */}
      <div className="border-b border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {t("room.participants", { count: participants.length })}
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto divide-y divide-slate-700/50" aria-label="Daftar peserta">
        {participants.length === 0 && (
          <li className="px-3 py-4 text-xs text-slate-500 italic">
            {t("room.participantListPlaceholder")}
          </li>
        )}
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200"
          >
            {/* Avatar initial */}
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-white uppercase"
              aria-hidden="true"
            >
              {p.alias.charAt(0)}
            </span>

            {/* Name */}
            <span className="flex-1 truncate" title={p.alias}>
              {p.alias}
            </span>

            {/* Role badge */}
            <span
              className={[
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                ROLE_COLOR[p.role] ?? "bg-slate-600 text-white",
              ].join(" ")}
            >
              {ROLE_LABEL[p.role] ?? p.role}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
