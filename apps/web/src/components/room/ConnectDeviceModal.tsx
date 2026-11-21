/**
 * ConnectDeviceModal — P05-T06
 * Teacher modal: generate device-pairing QR, list active devices, revoke devices.
 *
 * Flow:
 *   1. Teacher clicks "Connect Device" → modal opens.
 *   2. Click "Generate QR" → POST /devices → shows QR with raw token.
 *   3. Mobile opens /controller?room=X&token=Y → auto-pairs via GET /devices/{id}/confirm.
 *   4. Device list refreshes every 5 s; teacher can revoke any device.
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConnectDeviceModalProps {
  roomId: string;
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// ConnectDeviceModal
// ---------------------------------------------------------------------------

export function ConnectDeviceModal({
  roomId,
  open,
  onClose,
}: ConnectDeviceModalProps) {
  const { t } = useTranslation();

  const [pending, setPending] = useState(false);
  const [generated, setGenerated] = useState<InitiatedDevice | null>(null);
  const [devices, setDevices] = useState<RoomDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build the controller URL to embed in QR
  const controllerUrl = generated
    ? `${window.location.origin}/controller?room=${roomId}&token=${encodeURIComponent(generated.token)}`
    : "";

  // Poll device list every 5 s while modal is open
  const fetchDevices = useCallback(async () => {
    try {
      const list = await listDevices(roomId);
      setDevices(list);
    } catch {
      // silent – don't disrupt UX on poll failure
    }
  }, [roomId]);

  useEffect(() => {
    if (!open) {
      setGenerated(null);
      setError(null);
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    void fetchDevices();
    pollRef.current = setInterval(() => void fetchDevices(), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, fetchDevices]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleGenerate() {
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!open) return null;

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={t("device.modalTitle")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-xl bg-slate-800 p-6 shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {t("device.modalTitle")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-white transition-colors"
            aria-label={t("common.close")}
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 rounded-md bg-red-900/50 px-3 py-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        {/* QR Section */}
        <div className="mb-5 flex flex-col items-center gap-3">
          {generated ? (
            <>
              <div
                className="rounded-lg bg-white p-3"
                aria-label={t("device.qrAriaLabel")}
              >
                <QRCodeSVG value={controllerUrl} size={180} />
              </div>
              <p className="text-xs text-slate-400 text-center">
                {t("device.qrInstruction")}
              </p>
              <p className="text-xs font-mono text-slate-500 break-all text-center">
                {generated.device_name}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              {t("device.generatePrompt")}
            </p>
          )}

          <button
            onClick={() => void handleGenerate()}
            disabled={pending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            aria-busy={pending}
          >
            {pending ? "…" : t("device.generateQR")}
          </button>
        </div>

        {/* Device List */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-300">
            {t("device.activeDevices")} ({devices.filter((d) => !d.revoked_at).length})
          </h3>
          {devices.length === 0 ? (
            <p className="text-xs text-slate-500">{t("device.noDevices")}</p>
          ) : (
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {devices.map((device) => (
                <li
                  key={device.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    device.revoked_at
                      ? "bg-slate-700/40 text-slate-500 line-through"
                      : "bg-slate-700 text-white"
                  }`}
                >
                  <span className="truncate max-w-[180px]">
                    {device.device_name}
                  </span>
                  {!device.revoked_at && (
                    <button
                      onClick={() => void handleRevoke(device.id)}
                      disabled={revoking === device.id}
                      className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-red-700 text-white hover:bg-red-800 disabled:opacity-60 transition-colors"
                      aria-label={`${t("device.revoke")} ${device.device_name}`}
                    >
                      {revoking === device.id ? "…" : t("device.revoke")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
