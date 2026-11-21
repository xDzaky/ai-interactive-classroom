/**
 * PresenterQueue — P05-T03
 * Teacher sidebar: live list of pending presenter requests.
 * Polls every 3 s via useQuery. Opens ApproveDialog on click.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPresenterRequests,
  updatePresenterRequest,
  type PresenterRequest,
  type PRScope,
} from "@/lib/api/presenterRequests";

// ---------------------------------------------------------------------------
// ApproveDialog
// ---------------------------------------------------------------------------

interface ApproveDialogProps {
  request: PresenterRequest;
  authToken?: string;
  onClose: () => void;
}

function ApproveDialog({ request, authToken, onClose }: ApproveDialogProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [scope, setScope] = useState<PRScope>(request.scope);

  const approveMutation = useMutation({
    mutationFn: () =>
      updatePresenterRequest(request.room_id, request.id, "approved", scope, authToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presenter-requests", request.room_id] });
      onClose();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () =>
      updatePresenterRequest(request.room_id, request.id, "revoked", undefined, authToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presenter-requests", request.room_id] });
      onClose();
    },
  });

  const SCOPES: { value: PRScope; label: string }[] = [
    { value: "draw_only",    label: t("room.scopeDrawOnly") },
    { value: "object_edit",  label: t("room.scopeObjectEdit") },
    { value: "full_board",   label: t("room.scopeFullBoard") },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("room.approvePresenterTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      data-testid="approve-dialog"
    >
      <div className="w-80 rounded-xl bg-slate-800 p-5 shadow-xl">
        <h2 className="mb-1 text-sm font-semibold text-white">
          {t("room.approvePresenterTitle")}
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          {request.participant?.alias ?? "—"}
        </p>

        {/* Scope selector */}
        <label className="mb-1 block text-xs text-slate-400">
          {t("room.scope")}
        </label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as PRScope)}
          aria-label={t("room.scope")}
          data-testid="scope-select"
          className="mb-4 w-full rounded-md bg-slate-700 px-3 py-2 text-sm text-white"
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
            data-testid="approve-btn"
            className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {approveMutation.isPending ? "…" : t("room.approve")}
          </button>
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={rejectMutation.isPending}
            data-testid="reject-btn"
            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {rejectMutation.isPending ? "…" : t("room.reject")}
          </button>
          <button
            onClick={onClose}
            className="rounded-md bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PresenterQueue
// ---------------------------------------------------------------------------

export interface PresenterQueueProps {
  roomId: string;
  authToken?: string;
}

export function PresenterQueue({ roomId, authToken }: PresenterQueueProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<PresenterRequest | null>(null);

  const { data: requests = [] } = useQuery({
    queryKey: ["presenter-requests", roomId],
    queryFn: () => listPresenterRequests(roomId, authToken),
    refetchInterval: 3_000,
    retry: false,
  });

  const pending = requests.filter((r) =>
    r.status === "requested" || r.status === "approved" || r.status === "active",
  );

  if (pending.length === 0) return null;

  return (
    <>
      <div
        className="border-t border-slate-700 px-3 py-2"
        aria-label={t("room.presenterQueue")}
        data-testid="presenter-queue"
      >
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-yellow-400">
          {t("room.presenterQueue")} ({pending.length})
        </div>
        <ul className="space-y-1">
          {pending.map((req) => (
            <li key={req.id}>
              <button
                onClick={() => setSelected(req)}
                data-testid={`queue-item-${req.id}`}
                className="w-full rounded-md bg-slate-700 px-2 py-1.5 text-left text-xs text-white hover:bg-slate-600"
              >
                <span className="font-medium">{req.participant?.alias ?? "…"}</span>
                <span className="ml-1 text-slate-400">({req.scope})</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <ApproveDialog
          request={selected}
          authToken={authToken}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
