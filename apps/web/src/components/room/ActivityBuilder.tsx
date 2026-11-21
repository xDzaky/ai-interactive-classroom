/**
 * ActivityBuilder — P06-T03
 * Host component: create a poll/quiz, add questions, start/stop it.
 * Renders in the TeacherView sidebar.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createActivity,
  listActivities,
  updateActivity,
} from "@/lib/api/activities";
import type { Activity, ActivityType } from "@/lib/api/activities";
import { ActivityResults } from "@/components/room/ActivityResults";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActivityBuilderProps {
  roomId: string;
}

// ---------------------------------------------------------------------------
// ActivityBuilder
// ---------------------------------------------------------------------------

export function ActivityBuilder({ roomId }: ActivityBuilderProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("poll");
  const [questions, setQuestions] = useState([{ body: "", options: ["", ""] }]);
  const [viewingResults, setViewingResults] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", roomId],
    queryFn: () => listActivities(roomId),
    refetchInterval: 5000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () =>
      createActivity(roomId, {
        type,
        title,
        questions: questions.map((q, i) => ({
          body: q.body,
          options: q.options.filter(Boolean),
          sort_order: i,
        })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["activities", roomId] });
      setCreating(false);
      setTitle("");
      setQuestions([{ body: "", options: ["", ""] }]);
      setError(null);
    },
    onError: () => setError(t("activity.errorCreate")),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      activityId,
      status,
    }: {
      activityId: string;
      status: "active" | "closed";
    }) => updateActivity(roomId, activityId, { status }),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["activities", roomId] }),
    onError: () => setError(t("activity.errorUpdate")),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────

  const activeActivity = activities.find((a) => a.status === "active");

  function addQuestion() {
    setQuestions((prev) => [...prev, { body: "", options: ["", ""] }]);
  }

  function updateQuestion(idx: number, body: string) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, body } : q)),
    );
  }

  function updateOption(qIdx: number, oIdx: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
          : q,
      ),
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (viewingResults) {
    return (
      <div className="flex flex-col h-full">
        <button
          onClick={() => setViewingResults(null)}
          className="mb-2 text-xs text-indigo-400 hover:underline text-left px-2 pt-2"
        >
          ← {t("activity.backToList")}
        </button>
        <ActivityResults roomId={roomId} activityId={viewingResults} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-200">{t("activity.title")}</span>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="rounded px-2 py-0.5 bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition-colors"
            aria-label={t("activity.createNew")}
          >
            + {t("activity.createNew")}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Create form */}
      {creating && (
        <div className="rounded-lg bg-slate-700 p-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("activity.titlePlaceholder")}
            className="w-full rounded px-2 py-1 text-xs bg-slate-800 text-white placeholder-slate-500 border border-slate-600"
            aria-label={t("activity.titleLabel")}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="w-full rounded px-2 py-1 text-xs bg-slate-800 text-white border border-slate-600"
            aria-label={t("activity.typeLabel")}
          >
            <option value="poll">{t("activity.typePoll")}</option>
            <option value="quiz">{t("activity.typeQuiz")}</option>
          </select>
          {questions.map((q, qi) => (
            <div key={qi} className="space-y-1">
              <input
                value={q.body}
                onChange={(e) => updateQuestion(qi, e.target.value)}
                placeholder={`${t("activity.questionPlaceholder")} ${qi + 1}`}
                className="w-full rounded px-2 py-1 text-xs bg-slate-800 text-white placeholder-slate-500 border border-slate-600"
                aria-label={`${t("activity.questionLabel")} ${qi + 1}`}
              />
              {q.options.map((o, oi) => (
                <input
                  key={oi}
                  value={o}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`${t("activity.optionPlaceholder")} ${oi + 1}`}
                  className="w-full rounded px-2 py-1 text-xs bg-slate-800 text-white placeholder-slate-500 border border-slate-600 ml-2"
                  aria-label={`${t("activity.optionLabel")} ${oi + 1}`}
                />
              ))}
            </div>
          ))}
          <button
            onClick={addQuestion}
            className="text-xs text-indigo-400 hover:underline"
          >
            + {t("activity.addQuestion")}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => void createMutation.mutate()}
              disabled={createMutation.isPending || !title}
              className="rounded px-3 py-1 bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {createMutation.isPending ? "…" : t("activity.save")}
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded px-3 py-1 bg-slate-600 text-white text-xs hover:bg-slate-500 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Activity list */}
      <ul className="space-y-1.5">
        {activities.map((activity: Activity) => (
          <li
            key={activity.id}
            className="rounded-md bg-slate-700 px-3 py-2 space-y-1"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium text-white truncate max-w-[120px]">
                {activity.title}
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  activity.status === "active"
                    ? "bg-green-700 text-green-100"
                    : activity.status === "closed"
                      ? "bg-slate-500 text-slate-200"
                      : "bg-yellow-700 text-yellow-100"
                }`}
              >
                {t(`activity.status.${activity.status}`)}
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {activity.status === "draft" && !activeActivity && (
                <button
                  onClick={() =>
                    statusMutation.mutate({ activityId: activity.id, status: "active" })
                  }
                  disabled={statusMutation.isPending}
                  className="rounded px-2 py-0.5 bg-green-700 text-white text-xs hover:bg-green-800 disabled:opacity-60 transition-colors"
                  aria-label={`${t("activity.start")} ${activity.title}`}
                >
                  {t("activity.start")}
                </button>
              )}
              {activity.status === "active" && (
                <button
                  onClick={() =>
                    statusMutation.mutate({ activityId: activity.id, status: "closed" })
                  }
                  disabled={statusMutation.isPending}
                  className="rounded px-2 py-0.5 bg-orange-600 text-white text-xs hover:bg-orange-700 disabled:opacity-60 transition-colors"
                  aria-label={`${t("activity.stop")} ${activity.title}`}
                >
                  {t("activity.stop")}
                </button>
              )}
              {activity.status === "closed" && (
                <button
                  onClick={() => setViewingResults(activity.id)}
                  className="rounded px-2 py-0.5 bg-indigo-700 text-white text-xs hover:bg-indigo-800 transition-colors"
                  aria-label={`${t("activity.results")} ${activity.title}`}
                >
                  {t("activity.results")}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
