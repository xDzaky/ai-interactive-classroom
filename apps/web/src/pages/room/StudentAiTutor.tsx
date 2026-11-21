/**
 * StudentAiTutor.tsx — P08-T07
 * Student-facing AI tutor: hint-first interaction pattern.
 * - Student types a question
 * - AI responds with a HINT first (not the full answer)
 * - Student can request "Show explanation" after a hint
 * - Multi-turn conversation history shown as chat bubbles
 * - Uses useAiJob hook (async polling)
 * - All UI strings via i18n (id.json ai.* keys)
 */
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAiJob } from "../../hooks/useAiJob";

export type TutorStep = "hint" | "explanation";

export interface TutorMessage {
  role: "student" | "tutor";
  content: string;
  step?: TutorStep;
}

interface StudentAiTutorProps {
  roomId?: string;
  /** Topic context injected into system prompt */
  topic?: string;
}

const SYSTEM_HINT = (topic?: string) =>
  `You are a patient AI tutor. ${topic ? `The lesson topic is: "${topic}". ` : ""}` +
  "When a student asks a question, give ONLY a short Socratic hint (1-2 sentences) that guides them " +
  "to think, without revealing the full answer. Do NOT solve it for them directly.";

const SYSTEM_EXPLAIN = (topic?: string) =>
  `You are a patient AI tutor. ${topic ? `The lesson topic is: "${topic}". ` : ""}` +
  "Now give a clear, step-by-step explanation to help the student understand fully.";

export default function StudentAiTutor({ roomId, topic }: StudentAiTutorProps) {
  const { t } = useTranslation();
  const { status, result, error, submit, reset } = useAiJob();

  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [awaitingStep, setAwaitingStep] = useState<TutorStep>("hint");
  const [lastQuestion, setLastQuestion] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (typeof bottomRef.current?.scrollIntoView === "function") {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle result coming back from AI job
  useEffect(() => {
    if (status === "done" && result?.result) {
      const content =
        (result.result as { content?: string }).content ??
        JSON.stringify(result.result);

      setMessages((prev) => [
        ...prev,
        { role: "tutor", content, step: awaitingStep },
      ]);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result]);

  const isLoading = status === "pending" || status === "running";

  const handleAskHint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const q = question.trim();
    setLastQuestion(q);
    setAwaitingStep("hint");

    setMessages((prev) => [...prev, { role: "student", content: q }]);
    setQuestion("");

    submit({
      type: "completion",
      roomId,
      payload: {
        messages: [
          { role: "system", content: SYSTEM_HINT(topic) },
          ...messages.map((m) => ({
            role: m.role === "student" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: q },
        ],
      },
    });
  };

  const handleRequestExplanation = () => {
    if (isLoading) return;
    setAwaitingStep("explanation");
    submit({
      type: "completion",
      roomId,
      payload: {
        messages: [
          { role: "system", content: SYSTEM_EXPLAIN(topic) },
          ...messages.map((m) => ({
            role: m.role === "student" ? "user" : "assistant",
            content: m.content,
          })),
          { role: "user", content: `Please explain: ${lastQuestion}` },
        ],
      },
    });
  };

  const lastTutorMsg = [...messages].reverse().find((m) => m.role === "tutor");
  const showExplainButton =
    !isLoading &&
    lastTutorMsg?.step === "hint";

  return (
    <div
      className="flex flex-col h-full bg-white rounded-xl shadow overflow-hidden"
      data-testid="student-ai-tutor"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-indigo-50">
        <h2 className="text-sm font-semibold text-indigo-800">
          {t("ai.studentTutor")}
        </h2>
        {topic && (
          <p className="text-xs text-indigo-600 mt-0.5">{topic}</p>
        )}
      </div>

      {/* Chat messages */}
      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        role="log"
        aria-live="polite"
        aria-label={t("ai.studentTutor")}
        data-testid="tutor-chat"
      >
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-4" data-testid="tutor-empty">
            {t("ai.askQuestion")}
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-2xl text-sm ${
                msg.role === "student"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : msg.step === "explanation"
                  ? "bg-green-50 border border-green-200 text-gray-800 rounded-bl-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
              data-testid={`msg-${msg.role}-${i}`}
            >
              {msg.step === "hint" && (
                <span className="block text-xs font-medium text-indigo-500 mb-1">
                  {t("ai.hint")}
                </span>
              )}
              {msg.step === "explanation" && (
                <span className="block text-xs font-medium text-green-600 mb-1">
                  {t("ai.explanation")}
                </span>
              )}
              <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-500 flex items-center gap-2"
              role="status"
              data-testid="tutor-thinking"
            >
              <span className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full" />
              {t("ai.thinking")}
            </div>
          </div>
        )}

        {/* Error */}
        {status === "failed" && (
          <div
            className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded"
            role="alert"
            data-testid="tutor-error"
          >
            {t("errors.serverError")}
            <button
              onClick={reset}
              className="ml-2 underline text-red-700"
              data-testid="tutor-retry"
            >
              Coba lagi
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Explain button (shown after hint) */}
      {showExplainButton && (
        <div className="px-4 pb-2">
          <button
            onClick={handleRequestExplanation}
            className="text-xs text-indigo-600 underline hover:text-indigo-800 transition-colors"
            data-testid="tutor-explain-btn"
          >
            {t("ai.explanation")} →
          </button>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleAskHint}
        className="border-t px-4 py-3 flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("ai.askQuestion")}
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          data-testid="tutor-input"
          aria-label={t("ai.askQuestion")}
        />
        <button
          type="submit"
          disabled={isLoading || !question.trim()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-full disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          data-testid="tutor-send"
        >
          {t("ai.hint")}
        </button>
      </form>
    </div>
  );
}
