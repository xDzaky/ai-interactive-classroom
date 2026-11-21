/**
 * ActivityResults — P06-T03
 * Host component: shows aggregated answers for a closed activity.
 * Displays a simple bar chart (count per option) + answer_key highlight.
 */
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { getActivityResults } from "@/lib/api/activities";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActivityResultsProps {
  roomId: string;
  activityId: string;
}

// ---------------------------------------------------------------------------
// ActivityResults
// ---------------------------------------------------------------------------

export function ActivityResults({ roomId, activityId }: ActivityResultsProps) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity-results", roomId, activityId],
    queryFn: () => getActivityResults(roomId, activityId),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <p className="p-3 text-xs text-slate-400">{t("common.loading")}</p>;
  }
  if (isError || !data) {
    return <p className="p-3 text-xs text-red-400">{t("activity.errorResults")}</p>;
  }

  const { activity, questions } = data;

  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto text-sm">
      <div>
        <p className="font-semibold text-white">{activity.title}</p>
        <p className="text-xs text-slate-400">
          {t("activity.results")} · {questions.reduce((s, q) => s + q.answers.length, 0)}{" "}
          {t("activity.responses")}
        </p>
      </div>

      {questions.map((q) => {
        // Tally responses per option
        const tally: Record<string, number> = {};
        for (const opt of q.options ?? []) tally[opt] = 0;
        for (const ans of q.answers) {
          for (const r of ans.response ?? []) {
            tally[r] = (tally[r] ?? 0) + 1;
          }
        }
        const totalAnswers = q.answers.length;
        const correctOptions = new Set(q.answer_key ?? []);

        return (
          <div key={q.id} className="rounded-lg bg-slate-700 p-3 space-y-2">
            <p className="text-xs font-medium text-white">{q.body}</p>
            <div className="space-y-1.5">
              {Object.entries(tally).map(([opt, count]) => {
                const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                const isCorrect = correctOptions.has(opt);
                return (
                  <div key={opt} className="space-y-0.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className={isCorrect ? "text-green-400 font-semibold" : ""}>
                        {opt}
                        {isCorrect && " ✓"}
                      </span>
                      <span>
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-600">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isCorrect ? "bg-green-500" : "bg-indigo-500"}`}
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${opt}: ${pct}%`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              {totalAnswers} {t("activity.responses")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
