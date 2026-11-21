/**
 * ActivityResponder — P06-T03
 * Student component: shows the currently active poll/quiz and lets them submit answers.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listActivities, submitAnswer } from "@/lib/api/activities";
import type { Activity, ActivityQuestion } from "@/lib/api/activities";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActivityResponderProps {
  roomId: string;
  participantToken?: string;
}

// ---------------------------------------------------------------------------
// ActivityResponder
// ---------------------------------------------------------------------------

export function ActivityResponder({ roomId, participantToken }: ActivityResponderProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", roomId],
    queryFn: () => listActivities(roomId),
    refetchInterval: 3000,
  });

  const activeActivity: Activity | undefined = activities.find(
    (a) => a.status === "active",
  );

  const answerMutation = useMutation({
    mutationFn: ({
      questionId,
      response,
    }: {
      questionId: string;
      response: string[];
    }) => submitAnswer(roomId, activeActivity!.id, questionId, response, participantToken),
    onSuccess: (_, { questionId }) => {
      setSubmitted((prev) => ({ ...prev, [questionId]: true }));
      void qc.invalidateQueries({ queryKey: ["activities", roomId] });
    },
    onError: () => setError(t("activity.errorSubmit")),
  });

  if (!activeActivity) {
    return (
      <div className="p-3 text-xs text-slate-400">
        {t("activity.noActiveActivity")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto text-sm">
      <div>
        <p className="font-semibold text-white">{activeActivity.title}</p>
        <p className="text-xs text-slate-400 uppercase tracking-wide">
          {t(`activity.type.${activeActivity.type}`)}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      {activeActivity.questions.map((question: ActivityQuestion) => (
        <div key={question.id} className="rounded-lg bg-slate-700 p-3 space-y-2">
          <p className="text-xs text-white font-medium">{question.body}</p>

          {submitted[question.id] ? (
            <p className="text-xs text-green-400">✓ {t("activity.answerSubmitted")}</p>
          ) : (
            <>
              <div className="space-y-1">
                {(question.options ?? []).map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      value={option}
                      checked={selected[question.id] === option}
                      onChange={() =>
                        setSelected((prev) => ({ ...prev, [question.id]: option }))
                      }
                      className="accent-indigo-500"
                      aria-label={option}
                    />
                    <span className="text-xs text-slate-200">{option}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => {
                  const choice = selected[question.id];
                  if (!choice) return;
                  answerMutation.mutate({
                    questionId: question.id,
                    response: [choice],
                  });
                }}
                disabled={answerMutation.isPending || !selected[question.id]}
                className="rounded px-3 py-1 bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                aria-label={`${t("activity.submit")} ${question.body}`}
              >
                {answerMutation.isPending ? "…" : t("activity.submit")}
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
