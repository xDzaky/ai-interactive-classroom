/**
 * ControllerPage — Dual-Transport Mobile Remote Controller
 * Routes: /controller, /remote, /connect
 *
 * Works in BOTH:
 * - Mode Tanpa Login (?code=482910 or manual 6-digit code input) via RemotePeerBridge
 * - Authenticated Classroom Room (?room=ROOM_ID&token=DEVICE_TOKEN) via Laravel API
 *
 * 4 Smart Remote Modes:
 * 1. Pointer & Laser Trackpad
 * 2. 3D Orbit Trackpad + Quick Solid Actions (Irisan, Jaring, Pisah, Reset)
 * 3. Mini Drawing Pad (live stroke streaming to Desktop Whiteboard)
 * 4. Quick Controls & Voice AI Mic + Switch to Direct Mobile Whiteboard
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import {
  RemotePeerBridge,
  formatPairingCode,
  normalizePairingCode,
  type RemoteCommandType,
} from "@/lib/remotePeerBridge";

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

type RemoteTab = "controls" | "laser" | "orbit3d" | "draw";

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
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      data-testid={testId}
      className={[
        "flex flex-col items-center justify-center gap-1 rounded-2xl p-4 text-xs font-medium transition-all active:scale-95 disabled:opacity-40",
        active
          ? "bg-amber-500 text-white shadow-lg"
          : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700",
      ].join(" ")}
    >
      <span className="text-2xl" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export function ControllerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const roomId = searchParams.get("room") ?? "";
  const deviceToken = searchParams.get("token") ?? "";
  const urlCode = normalizePairingCode(searchParams.get("code") ?? "");

  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState<RemoteTab>("controls");
  const [blanked, setBlanked] = useState(false);
  const [pointerOn, setPointerOn] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  const bridgeRef = useRef<RemotePeerBridge | null>(null);
  const lastOrbitRef = useRef<{ x: number; y: number } | null>(null);
  const drawPtsRef = useRef<[number, number][]>([]);
  const padCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const isAuthMode = Boolean(roomId && deviceToken);
  const isServerlessMode = Boolean(urlCode.length === 6);

  useEffect(() => {
    if (!isServerlessMode) return;
    const bridge = new RemotePeerBridge(urlCode, "mobile");
    bridgeRef.current = bridge;
    bridge.send("ping", { device: "mobile" });
    return () => {
      bridge.close();
      bridgeRef.current = null;
    };
  }, [isServerlessMode, urlCode]);

  const sendHttp = useMutation({
    mutationFn: ({ type, payload }: { type: string; payload?: Record<string, unknown> }) =>
      sendDeviceEvent(roomId, deviceToken, type, payload ?? {}),
  });

  const dispatch = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      if (isAuthMode) {
        sendHttp.mutate({ type, payload });
      }
      if (bridgeRef.current) {
        const mapped = type.replace(/^device\./, "") as RemoteCommandType;
        bridgeRef.current.send(mapped, payload ?? {});
      }
    },
    [isAuthMode, sendHttp],
  );

  // If neither room+token nor 6-digit code -> show clean 6-digit code entry screen
  if (!isAuthMode && !isServerlessMode) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-white"
        data-testid="controller-code-entry"
      >
        <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-4 text-center">
            <span className="text-4xl" aria-hidden="true">📡</span>
            <h1 className="mt-2 text-lg font-bold">Hubungkan Remote HP</h1>
            <p className="mt-1 text-xs text-slate-400">
              {t("controller.tokenRequired", "Masukkan kode 6 digit yang tampil di layar Whiteboard Desktop.")}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = normalizePairingCode(manualCode);
              if (clean.length === 6) {
                setSearchParams({ code: clean });
              }
            }}
            className="flex flex-col gap-3"
          >
            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              value={formatPairingCode(manualCode)}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="482-910"
              aria-label="Kode Pairing 6 Digit"
              className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-white outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={normalizePairingCode(manualCode).length !== 6}
              className="rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              Hubungkan Sekarang
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-950 text-white select-none"
      data-testid="controller-page"
    >
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 px-4">
        <span className="text-base font-bold">{t("controller.title", "Remote Pintar")}</span>
        {isServerlessMode && (
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-300">
            {formatPairingCode(urlCode)}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          {t("controller.connected", "Terhubung")}
        </span>
      </header>

      {/* Mode Tabs */}
      <nav className="grid grid-cols-4 gap-1 border-b border-slate-800 bg-slate-900 p-1.5 text-[11px] font-semibold">
        {(
          [
            ["controls", "🎛️ Kontrol"],
            ["laser", "🔴 Laser"],
            ["orbit3d", "🧊 Orbit 3D"],
            ["draw", "✏️ Coret"],
          ] as const
        ).map(([key, lbl]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`rounded-xl py-2 transition ${
              activeTab === key ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            {lbl}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-6">
        {activeTab === "controls" && (
          <>
            <div className="grid w-full max-w-sm grid-cols-2 gap-3" aria-label="Navigasi halaman">
              <ControllerBtn
                label={t("controller.prevPage")}
                icon="◀"
                data-testid="btn-prev"
                onClick={() => dispatch("device.prev_page")}
                disabled={sendHttp.isPending}
              />
              <ControllerBtn
                label={t("controller.nextPage")}
                icon="▶"
                data-testid="btn-next"
                onClick={() => dispatch("device.next_page")}
                disabled={sendHttp.isPending}
              />
            </div>

            <div className="grid w-full max-w-sm grid-cols-2 gap-3" aria-label="Zoom">
              <ControllerBtn
                label={t("controller.zoomIn")}
                icon="🔍+"
                data-testid="btn-zoom-in"
                onClick={() => dispatch("device.zoom_in")}
                disabled={sendHttp.isPending}
              />
              <ControllerBtn
                label={t("controller.zoomOut")}
                icon="🔍−"
                data-testid="btn-zoom-out"
                onClick={() => dispatch("device.zoom_out")}
                disabled={sendHttp.isPending}
              />
            </div>

            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
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
                disabled={sendHttp.isPending}
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
                disabled={sendHttp.isPending}
              />
            </div>

            <div className="grid w-full max-w-sm grid-cols-2 gap-3">
              <ControllerBtn label="Undo" icon="↩️" onClick={() => dispatch("undo")} />
              <ControllerBtn label="Redo" icon="↪️" onClick={() => dispatch("redo")} />
            </div>

            {/* Voice / Text AI Command Remote */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!voiceText.trim()) return;
                dispatch("voice_command", { text: voiceText.trim() });
                setVoiceText("");
              }}
              className="flex w-full max-w-sm gap-2"
            >
              <input
                type="text"
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Perintah AI: buat kubus, grafik y=x^2..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white"
              >
                Kirim
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate(`/whiteboard?peer=${urlCode || "direct"}&mode=mobile`)}
              className="w-full max-w-sm rounded-2xl border border-indigo-500/40 bg-indigo-600/20 py-2.5 text-xs font-bold text-indigo-300 hover:bg-indigo-600/30"
            >
              📱 Beralih ke Whiteboard Mobile Penuh
            </button>
          </>
        )}

        {activeTab === "laser" && (
          <div className="flex w-full max-w-sm flex-1 flex-col gap-3">
            <p className="text-center text-xs text-slate-400">
              Geser jari di area bawah untuk menggerakkan Laser Pointer merah di papan tulis Desktop.
            </p>
            <div
              data-testid="laser-trackpad"
              style={{ touchAction: "none" }}
              onPointerMove={(e) => {
                if (e.buttons === 0 && e.pointerType === "mouse") return;
                const rect = e.currentTarget.getBoundingClientRect();
                const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                dispatch("laser_move", { nx, ny });
              }}
              onPointerUp={() => dispatch("laser_off")}
              className="flex flex-1 min-h-[300px] items-center justify-center rounded-3xl border-2 border-dashed border-rose-500/50 bg-slate-900 text-rose-400"
            >
              🔴 Sentuh & Geser (Laser Trackpad)
            </div>
          </div>
        )}

        {activeTab === "orbit3d" && (
          <div className="flex w-full max-w-sm flex-1 flex-col gap-3">
            <div
              data-testid="orbit3d-trackpad"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                lastOrbitRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (!lastOrbitRef.current) return;
                const dx = (e.clientX - lastOrbitRef.current.x) / 140;
                const dy = (e.clientY - lastOrbitRef.current.y) / 140;
                lastOrbitRef.current = { x: e.clientX, y: e.clientY };
                dispatch("solid_orbit", { dAzimuth: dx, dPolar: dy });
              }}
              onPointerUp={() => {
                lastOrbitRef.current = null;
              }}
              className="flex flex-1 min-h-[240px] items-center justify-center rounded-3xl border-2 border-cyan-500/40 bg-slate-900 text-cyan-300 text-sm font-semibold"
            >
              🧊 Geser untuk Putar 3D 360°
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["section", "✂️ Irisan"],
                  ["unfold", "📐 Jaring"],
                  ["explode", "🧩 Pisah"],
                  ["reset", "↺ Reset"],
                ] as const
              ).map(([act, lbl]) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => dispatch("solid_action", { action: act })}
                  className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "draw" && (
          <div className="flex w-full max-w-sm flex-1 flex-col gap-3">
            <p className="text-center text-xs text-slate-400">
              Coret di kotak ini → goresan langsung muncul real-time di Whiteboard Desktop!
            </p>
            <canvas
              ref={padCanvasRef}
              width={340}
              height={280}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                drawPtsRef.current = [[x, y]];
              }}
              onPointerMove={(e) => {
                if (drawPtsRef.current.length === 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                drawPtsRef.current.push([x, y]);
                const ctx = e.currentTarget.getContext("2d");
                if (ctx && drawPtsRef.current.length >= 2) {
                  const pts = drawPtsRef.current;
                  const a = pts[pts.length - 2];
                  const b = pts[pts.length - 1];
                  ctx.strokeStyle = "#38bdf8";
                  ctx.lineWidth = 3;
                  ctx.lineCap = "round";
                  ctx.beginPath();
                  ctx.moveTo(a[0] * 340, a[1] * 280);
                  ctx.lineTo(b[0] * 340, b[1] * 280);
                  ctx.stroke();
                }
              }}
              onPointerUp={() => {
                if (drawPtsRef.current.length >= 2) {
                  dispatch("remote_stroke", { points: drawPtsRef.current, color: "#0f172a" });
                }
                drawPtsRef.current = [];
                const ctx = padCanvasRef.current?.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, 340, 280);
              }}
              className="w-full rounded-3xl border-2 border-indigo-500/40 bg-slate-900"
            />
          </div>
        )}
      </main>
    </div>
  );
}
