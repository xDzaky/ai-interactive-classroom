/**
 * RoomPage — P04-T07
 * Routes to the correct view based on participant role:
 *   - teacher_host / presenter → TeacherView
 *   - student / guest_student / group_leader → StudentView
 *   - ?mode=presentation → PresentationView (projector/display)
 *   - no token + no Sanctum auth → redirect to /join
 *
 * Token format (from P04-T03):
 *   base64(participantId) + "." + HMAC-SHA256(participantId, APP_KEY)
 * We decode only the first segment (participantId) locally.
 * Role is fetched from the server via GET /rooms/{room}/participants/me.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchRoom, fetchMe } from "@/lib/api/rooms";
import { TeacherView } from "./TeacherView";
import { PresentationView } from "./PresentationView";
import { StudentView } from "./StudentView";
import type { ParticipantRole } from "@/lib/api/rooms";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** localStorage key for participant token */
function tokenKey(roomId: string): string {
  return `ai-classroom-participant-${roomId}`;
}

/** Decode base64 segment of token to extract participantId */
function decodeParticipantId(token: string): string {
  try {
    const [b64] = token.split(".");
    return atob(b64);
  } catch {
    return "";
  }
}

const HOST_ROLES: ParticipantRole[] = ["teacher_host", "presenter"];

// ---------------------------------------------------------------------------
// RoomPage
// ---------------------------------------------------------------------------

export default function RoomPage() {
  const { t } = useTranslation();
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const isPresentation = searchParams.get("mode") === "presentation";

  if (!roomId || roomId === "undefined") {
    return <Navigate to="/dashboard" replace />;
  }

  // Load token from localStorage
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (roomId && roomId !== "undefined") {
      setToken(localStorage.getItem(tokenKey(roomId)));
    }
  }, [roomId]);

  // Fetch room info (code, status)
  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => fetchRoom(roomId!),
    enabled: !!roomId && roomId !== "undefined",
  });

  // Fetch participant role from server (uses participant token or Sanctum session)
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["room-me", roomId],
    queryFn: () => fetchMe(roomId!, token ?? undefined),
    enabled: !!roomId && roomId !== "undefined" && !isPresentation,
    retry: false,
  });

  const isLoading = roomLoading || meLoading;

  // Presentation mode: no auth required
  if (isPresentation) {
    return <PresentationView roomId={roomId!} roomCode={room?.code} />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // No token and no authenticated participant → redirect to join
  if (!token && !me) {
    return <Navigate to={`/join`} replace />;
  }

  const participantId = token ? decodeParticipantId(token) : (me?.id ?? "");
  const role: ParticipantRole = me?.role ?? "guest_student";

  // Teacher or presenter → host view
  if (HOST_ROLES.includes(role)) {
    return (
      <TeacherView
        roomId={roomId!}
        participantToken={token ?? ""}
        participantId={participantId}
        roomCode={room?.code}
      />
    );
  }

  // Student / guest → student view
  return (
    <StudentView
      roomId={roomId!}
      participantToken={token ?? ""}
      participantId={participantId}
      roomCode={room?.code}
    />
  );

  // Suppress unused t warning (used for translations in child views)
  void t;
}
