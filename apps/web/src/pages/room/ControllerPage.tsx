/**
 * ControllerPage — P05-T05
 * Mobile Controller web app served at /controller?room=ROOM_ID&token=DEVICE_TOKEN
 *
 * Sends device.* events to POST /api/v1/rooms/{room}/events using the device token.
 * Event types (from CONTRACTS.md): event_type prefixed "device."
 *   device.prev_page, device.next_page, device.zoom_in, device.zoom_out,
 *   device.pointer (payload: {x, y}), device.blank, device.unblank
 *
 * No whiteboard rendering — this is the gesture-only remote surface.
 */
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------

async function sendDeviceEvent(
  roomId: string,
  deviceToken: string,
  eventType: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const res = await fetch(`/api/v1/rooms/${roomId}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Participant ${deviceToken}`,
    },
    body: JSON.stringify({
      event_type: eventType,
      payload,
      idempotency_key: `${eventType}-${Date.now()}`,
    }),
  });
  if (!res.ok && res.status !== 201) throw new Error("Failed to send device event");
}

// ---------------------------------------------------------------------------
// ControllerButton
// ---------------------------------------------------------------------------

interface ControllerBtnProps {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "data-testid"?: string;
}

function ControllerBtn({
  label,
  icon,
  onClick,
  disabled,
  active,
  "data-testid": testId,
}: ControllerBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      data-testid={testId}
      className={[
        "flex flex-col items-center justify-center gap-1 rounded-2xl p-5 text-xs font-medium transition-all active:scale-95 disabled:opacity-40",
        active
          ? "bg-yellow-500 text-white shadow-lg"
          : "bg-slate-700 text-slate-200 hover:bg-slate-600",
      ].join(" ")}
    >
      <span className="text-3xl" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ControllerPage
// ---------------------------------------------------------------------------

export function ControllerPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const roomId      = searchParams.get("room") ?? "";
  const deviceToken = searchParams.get("token") ?? "";
  const [blanked, setBlanked] = useState(false);
  const [pointerOn, setPointerOn] = useState(false);

  const send = useMutation({
    mutationFn: ({ type, payload }: { type: string; payload?: Record<string, unknown> }) =>
      sendDeviceEvent(roomId, deviceToken, type, payload ?? {}),
  });

  const dispatch = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      send.mutate({ type, payload });
    },
    [send],
  );

  // No token — show error
  if (!roomId || !deviceToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white px-6">
        <span className="text-5xl mb-4" aria-hidden="true">📡</span>
        <p className="text-center text-slate-400 text-sm">{t("controller.tokenRequired")}</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-900 text-white select-none"
      data-testid="controller-page"
    >
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-700 px-4">
        <span className="text-lg font-bold">{t("controller.title")}</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
          <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
          {t("controller.connected")}
        </span>
      </header>

      {/* Controls grid */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8">
        {/* Page navigation */}
        <div className="grid w-full max-w-sm grid-cols-2 gap-4" aria-label="Navigasi halaman">
          <ControllerBtn
            label={t("controller.prevPage")}
            icon="◀"
            data-testid="btn-prev"
            onClick={() => dispatch("device.prev_page")}
            disabled={send.isPending}
          />
          <ControllerBtn
            label={t("controller.nextPage")}
            icon="▶"
            data-testid="btn-next"
            onClick={() => dispatch("device.next_page")}
            disabled={send.isPending}
          />
        </div>

        {/* Zoom */}
        <div className="grid w-full max-w-sm grid-cols-2 gap-4" aria-label="Zoom">
          <ControllerBtn
            label={t("controller.zoomIn")}
            icon="🔍+"
            data-testid="btn-zoom-in"
            onClick={() => dispatch("device.zoom_in")}
            disabled={send.isPending}
          />
          <ControllerBtn
            label={t("controller.zoomOut")}
            icon="🔍−"
            data-testid="btn-zoom-out"
            onClick={() => dispatch("device.zoom_out")}
            disabled={send.isPending}
          />
        </div>

        {/* Pointer + Blank */}
        <div className="grid w-full max-w-sm grid-cols-2 gap-4">
          <ControllerBtn
            label={t("controller.pointer")}
            icon="🔴"
            data-testid="btn-pointer"
            active={pointerOn}
            onClick={() => {
              const next = !pointerOn;
              setPointerOn(next);
              dispatch(next ? "device.pointer_on" : "device.pointer_off");
            }}
            disabled={send.isPending}
          />
          <ControllerBtn
            label={blanked ? t("controller.unblank") : t("controller.blank")}
            icon={blanked ? "☀️" : "⬛"}
            data-testid="btn-blank"
            active={blanked}
            onClick={() => {
              const next = !blanked;
              setBlanked(next);
              dispatch(next ? "device.blank" : "device.unblank");
            }}
            disabled={send.isPending}
          />
        </div>
      </main>
    </div>
  );
}
