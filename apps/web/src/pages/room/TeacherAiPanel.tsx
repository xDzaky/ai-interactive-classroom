/**
 * TeacherAiPanel.tsx — P08-T06
 * Teacher-facing AI assistant panel: outline/quiz generator.
 * - SELECT job type (outline | quiz)
 * - TEXTAREA topic/prompt
 * - SUBMIT → shows spinner → result editable → Approve & Share | Edit
 * - Uses useAiJob for async polling
 * - All UI strings via i18n (id.json ai.* keys)
 */
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSyncStatus } from "../../lib/useSyncStatus";
import { useAiJob } from "../../hooks/useAiJob";

type GenerateMode = "outline" | "quiz";

interface TeacherAiPanelProps {
  roomId?: string;
  onApprove?: (content: string, mode: GenerateMode) => void;
}

export default function TeacherAiPanel({ roomId, onApprove }: TeacherAiPanelProps) {
  const { t } = useTranslation();
  const { status: syncStatus } = useSyncStatus();
  const { status, result, error, submit, reset } = useAiJob();

  const [mode, setMode] = useState<GenerateMode>("outline");
  const [topic, setTopic] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Populate editable textarea when result arrives
  React.useEffect(() => {
    if (result?.status === "done" && result.result) {
      const content = (result.result as { content?: string }).content ?? JSON.stringify(result.result, null, 2);
      setEditedContent(content);
      setIsEditing(false);
    }
  }, [result]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    submit({
      type: "completion",
      roomId,
      payload: {
        messages: [
          {
            role: "system",
            content: mode === "outline"
              ? "You are a helpful teaching assistant. Generate a clear lesson outline."
              : "You are a helpful teaching assistant. Generate a quiz with 5 questions.",
          },
          { role: "user", content: topic.trim() },
        ],
      },
    });
  };

  const handleApprove = () => {
    onApprove?.(editedContent, mode);
    reset();
    setTopic("");
    setEditedContent("");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const isLoading = status === "pending" || status === "running";
  const hasResult = status === "done" && result !== null;
  const hasFailed = status === "failed";
  const offline = syncStatus === "needs_attention";

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-xl shadow" data-testid="teacher-ai-panel">
      <h2 className="text-lg font-semibold text-gray-800">{t("ai.teachingAssistant")}</h2>

      {offline && (
        <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded" role="alert">
          {t("sync.needsAttention")}
        </div>
      )}

      {/* Mode selector */}
      <div className="flex gap-2" role="group" aria-label={t("ai.assistant")}>
        <button
          type="button"
          onClick={() => { setMode("outline"); reset(); }}
          className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
            mode === "outline"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          aria-pressed={mode === "outline"}
          data-testid="mode-outline"
        >
          {t("ai.generateOutline")}
        </button>
        <button
          type="button"
          onClick={() => { setMode("quiz"); reset(); }}
          className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
            mode === "quiz"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          aria-pressed={mode === "quiz"}
          data-testid="mode-quiz"
        >
          {t("ai.generateQuiz")}
        </button>
      </div>

      {/* Prompt form */}
      {!hasResult && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="ai-topic" className="text-sm font-medium text-gray-700">
            {t("ai.askQuestion")}
          </label>
          <textarea
            id="ai-topic"
            data-testid="ai-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder={mode === "outline" ? "Topik pelajaran..." : "Topik kuis..."}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="self-start px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
            data-testid="ai-submit"
          >
            {isLoading ? t("ai.thinking") : (mode === "outline" ? t("ai.generateOutline") : t("ai.generateQuiz"))}
          </button>
        </form>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500" role="status" aria-live="polite">
          <span className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
          {t("ai.thinking")}
        </div>
      )}

      {/* Error state */}
      {hasFailed && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded" role="alert" data-testid="ai-error">
          {error === "rateLimited"
            ? "Terlalu banyak permintaan AI. Coba lagi nanti."
            : error === "timeout"
            ? "AI membutuhkan waktu terlalu lama. Coba lagi."
            : t("errors.serverError")}
          <button
            onClick={reset}
            className="ml-2 underline text-red-700 text-xs"
            data-testid="ai-retry"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Result + approve/edit */}
      {hasResult && (
        <div className="flex flex-col gap-3" data-testid="ai-result">
          <div className="text-sm font-medium text-gray-700">
            {mode === "outline" ? t("ai.generateOutline") : t("ai.generateQuiz")} — Hasil:
          </div>
          <textarea
            data-testid="ai-result-content"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            readOnly={!isEditing}
            rows={8}
            className={`w-full border rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isEditing ? "border-indigo-400 bg-white" : "border-gray-200 bg-gray-50"
            }`}
            aria-label="Hasil AI"
          />
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              data-testid="ai-approve"
            >
              {t("ai.approve")}
            </button>
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                data-testid="ai-edit"
              >
                {t("ai.edit")}
              </button>
            )}
            <button
              onClick={reset}
              className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
              data-testid="ai-discard"
            >
              Buang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
