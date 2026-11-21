/**
 * GroupSubmitPanel — P06-T04
 * Student (group leader) panel: shows the group task and a submit form.
 * Non-leaders see a read-only waiting message.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listGroups, submitGroupWork } from "@/lib/api/groups";
import { listActivities } from "@/lib/api/activities";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GroupSubmitPanelProps {
  roomId: string;
  participantId: string;
  participantToken?: string;
}

// ---------------------------------------------------------------------------
// GroupSubmitPanel
// ---------------------------------------------------------------------------

export function GroupSubmitPanel({
  roomId,
  participantId,
  participantToken,
}: GroupSubmitPanelProps) {
  const { t } = useTranslation();
  const [submitText, setSubmitText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: groups = [] } = useQuery({
    queryKey: ["groups", roomId],
    queryFn: () => listGroups(roomId),
    refetchInterval: 5000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", roomId],
    queryFn: () => listActivities(roomId),
    refetchInterval: 5000,
  });

  // Find the group this participant belongs to
  const myGroup = groups.find((g) =>
    (g.members ?? []).some((m) => m.participant_id === participantId),
  );

  const myMembership = myGroup?.members?.find(
    (m) => m.participant_id === participantId,
  );

  // Find active group_task activity
  const activeTask = activities.find(
    (a) => a.type === "group_task" && a.status === "active",
  );

  const submitMutation = useMutation({
    mutationFn: () =>
      submitGroupWork(
        roomId,
        myGroup!.id,
        activeTask!.id,
        { text: submitText },
        participantToken,
      ),
    onSuccess: () => setSubmitted(true),
    onError: () => setError(t("group.errorSubmit")),
  });

  if (!myGroup) {
    return (
      <div className="p-3 text-xs text-slate-400">{t("group.notAssigned")}</div>
    );
  }

  if (!activeTask) {
    return (
      <div className="p-3 text-xs text-slate-400">
        <p className="font-medium text-white">{myGroup.name}</p>
        <p className="mt-1">{t("group.noActiveTask")}</p>
      </div>
    );
  }

  if (!myMembership?.is_leader) {
    return (
      <div className="p-3 text-xs text-slate-400">
        <p className="font-medium text-white">{myGroup.name}</p>
        <p className="mt-1">{t("group.waitForLeader")}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-3 text-xs text-green-400">
        <p className="font-medium text-white">{myGroup.name}</p>
        <p className="mt-1">✓ {t("group.submitted")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto text-sm">
      <div>
        <p className="font-semibold text-white">{myGroup.name}</p>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{t("group.leaderRole")}</p>
      </div>

      <div className="rounded-lg bg-slate-700 p-3 space-y-2">
        <p className="text-xs font-medium text-white">{activeTask.title}</p>

        {error && (
          <p className="text-xs text-red-400" role="alert">{error}</p>
        )}

        <textarea
          value={submitText}
          onChange={(e) => setSubmitText(e.target.value)}
          placeholder={t("group.submitPlaceholder")}
          rows={4}
          className="w-full rounded px-2 py-1 text-xs bg-slate-600 text-white border border-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          aria-label={t("group.submitPlaceholder")}
        />

        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !submitText.trim()}
          className="rounded px-3 py-1 bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {submitMutation.isPending ? "…" : t("group.submitButton")}
        </button>
      </div>
    </div>
  );
}
