/**
 * ConnectDeviceModal — Dual-Transport Phone Pairing (Mode Tanpa Login + Room Auth)
 *
 * 3 Connection Methods:
 * 1. Scan QR Code (switchable between Remote Controller & Direct Mobile Whiteboard)
 * 2. 6-Digit Pairing Code (e.g. 482-910) -> type at /remote or /connect
 * 3. Direct Share Link -> copy & send via WhatsApp / Telegram
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import {
  initiateDevice,
  listDevices,
  revokeDevice,
} from "@/lib/api/devices";
import type { RoomDevice, InitiatedDevice } from "@/lib/api/devices";
import {
  buildPairingUrls,
  formatPairingCode,
  generatePairingCode,
} from "@/lib/remotePeerBridge";

export interface ConnectDeviceModalProps {
  roomId?: string;
  serverlessCode?: string;
  remoteConnected?: boolean;
  open: boolean;
  onClose: () => void;
}

export function ConnectDeviceModal({
  roomId,
  serverlessCode,
  remoteConnected = false,
  open,
  onClose,
}: ConnectDeviceModalProps) {
  const { t } = useTranslation();

  const isServerless = !roomId || roomId === "personal-sandbox";
  const [localCode] = useState(() => serverlessCode || generatePairingCode());
  const activeCode = serverlessCode || localCode;
  const [targetMode, setTargetMode] = useState<"controller" | "whiteboard">("controller");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  // Authenticated room state (backward compatible)
  const [pending, setPending] = useState(false);
  const [generated, setGenerated] = useState<InitiatedDevice | null>(null);
  const [devices, setDevices] = useState<RoomDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const urls = buildPairingUrls(
    origin,
    activeCode,
    !isServerless ? roomId : undefined,
    generated?.token,
  );
  const activeUrl = targetMode === "controller" ? urls.remoteUrl : urls.mobileWhiteboardUrl;

  const fetchDevices = useCallback(async () => {
    if (isServerless || !roomId) return;
    try {
      const list = await listDevices(roomId);
      setDevices(list);
    } catch {
      // silent
    }
  }, [isServerless, roomId]);

  useEffect(() => {
    if (!open) {
      setGenerated(null);
      setError(null);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    if (!isServerless) {
      void fetchDevices();
      pollRef.current = setInterval(() => void fetchDevices(), 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, isServerless, fetchDevices]);

  async function handleGenerateRoomToken() {
    if (!roomId || isServerless) return;
    setError(null);
    setPending(true);
    try {
      const device = await initiateDevice(roomId);
      setGenerated(device);
      await fetchDevices();
    } catch {
      setError(t("device.errorInitiate"));
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke(deviceId: string) {
    if (!roomId || isServerless) return;
    setRevoking(deviceId);
    try {
      await revokeDevice(roomId, deviceId);
      await fetchDevices();
      if (generated?.device_id === deviceId) setGenerated(null);
    } catch {
      setError(t("device.errorRevoke"));
    } finally {
      setRevoking(null);
    }
  }

  const copyText = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard restrictions
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 1800);
  };

  if (!open) return null;

  return (
    <div
      data-testid="connect-device-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("device.modalTitle", "Hubungkan HP / Remote")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>📱</span>
              <span>Hubungkan HP & Remote</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              {isServerless
                ? "Mode Tanpa Login · Pairing instan via QR, Kode 6 Digit, atau Link"
                : t("device.qrInstruction")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("common.close", "Tutup")}
          >
            ✕
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
          <span className="flex items-center gap-2 font-medium text-slate-700">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                remoteConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
            {remoteConnected ? "HP Terhubung (Real-Time)" : "Menunggu koneksi dari HP..."}
          </span>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
            {isServerless ? "P2P Instan" : "Room WS"}
          </span>
        </div>

        {/* Mode Toggle: Remote Controller vs Direct Mobile Whiteboard */}
        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTargetMode("controller")}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              targetMode === "controller"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🎛️ Remote Pintar HP
          </button>
          <button
            type="button"
            onClick={() => setTargetMode("whiteboard")}
            className={`rounded-lg py-1.5 text-xs font-semibold transition ${
              targetMode === "whiteboard"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ✍️ Whiteboard Mobile
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {error}
          </p>
        )}

        {/* Method 1: QR Code */}
        <div className="mb-4 flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          {isServerless || generated ? (
            <>
              <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-100" aria-label="QR Code Pairing">
                <QRCodeSVG value={activeUrl} size={168} />
              </div>
              <span className="text-[11px] text-slate-500">
                1. Scan QR dari kamera HP untuk membuka{" "}
                <strong className="text-slate-800">
                  {targetMode === "controller" ? "Remote Controller" : "Whiteboard Mobile"}
                </strong>
              </span>
            </>
          ) : (
            <p className="py-3 text-center text-xs text-slate-500">
              {t("device.generatePrompt")}
            </p>
          )}
        </div>

        {/* Method 2: 6-Digit Pairing Code */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/60 px-3.5 py-2.5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
              2. Kode Pairing 6 Digit (/remote)
            </div>
            <div data-testid="pairing-code-display" className="font-mono text-xl font-extrabold tracking-widest text-indigo-900">
              {formatPairingCode(activeCode)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void copyText(activeCode, "code")}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            {copied === "code" ? "✓ Disalin" : "Salin Kode"}
          </button>
        </div>

        {/* Method 3: Share Direct Link */}
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <input
            type="text"
            readOnly
            value={activeUrl}
            aria-label="Tautan pairing"
            className="flex-1 truncate bg-transparent font-mono text-[11px] text-slate-600 outline-none"
          />
          <button
            type="button"
            onClick={() => void copyText(activeUrl, "link")}
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
          >
            {copied === "link" ? "✓ Disalin" : "Salin Link"}
          </button>
        </div>

        {/* Authenticated Room Device Management (when logged into a room) */}
        {!isServerless && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">
                {t("device.activeDevices")} ({devices.filter((d) => !d.revoked_at).length})
              </h3>
              <button
                type="button"
                onClick={() => void handleGenerateRoomToken()}
                disabled={pending}
                className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {pending ? "…" : t("device.generateQR")}
              </button>
            </div>
            {devices.length === 0 ? (
              <p className="text-[11px] text-slate-400">{t("device.noDevices")}</p>
            ) : (
              <ul className="max-h-28 space-y-1.5 overflow-y-auto">
                {devices.map((device) => (
                  <li
                    key={device.id}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                      device.revoked_at
                        ? "bg-slate-100 text-slate-400 line-through"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <span className="truncate max-w-[180px]">{device.device_name}</span>
                    {!device.revoked_at && (
                      <button
                        type="button"
                        onClick={() => void handleRevoke(device.id)}
                        disabled={revoking === device.id}
                        aria-label={`${t("device.revoke")} ${device.device_name}`}
                        className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-red-700"
                      >
                        {revoking === device.id ? "…" : t("device.revoke")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
