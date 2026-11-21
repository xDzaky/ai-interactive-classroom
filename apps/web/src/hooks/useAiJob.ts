/**
 * useAiJob.ts — P08-T06
 * Hook to submit an AI job to the Laravel API and poll for result.
 * POST /api/v1/ai/jobs → 202 + job_id
 * GET  /api/v1/ai/jobs/{id} → status + result
 */
import { useState, useCallback, useRef } from "react";

export type AiJobStatus = "idle" | "pending" | "running" | "done" | "failed";

export interface AiJobResult {
  job_id: string;
  type: string;
  status: AiJobStatus;
  tokens_used: number;
  result: Record<string, unknown> | null;
  created_at: string | null;
  finished_at: string | null;
}

interface SubmitAiJobOptions {
  type: string;
  payload?: Record<string, unknown>;
  roomId?: string;
}

const API_BASE = "/api/v1";
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30;

export function useAiJob() {
  const [status, setStatus] = useState<AiJobStatus>("idle");
  const [result, setResult] = useState<AiJobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  const submit = useCallback(async (options: SubmitAiJobOptions) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStatus("pending");
    setError(null);
    setResult(null);

    try {
      const body: Record<string, unknown> = { type: options.type };
      if (options.payload) body.payload = options.payload;
      if (options.roomId) body.room_id = options.roomId;

      const res = await fetch(`${API_BASE}/ai/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429) {
        setStatus("failed");
        setError("rateLimited");
        return;
      }
      if (!res.ok) {
        setStatus("failed");
        setError("submitFailed");
        return;
      }

      const { job_id } = (await res.json()) as { job_id: string; status: string };
      setStatus("running");

      let polls = 0;
      pollRef.current = setInterval(async () => {
        polls++;
        if (polls > MAX_POLLS) {
          clearInterval(pollRef.current!);
          setStatus("failed");
          setError("timeout");
          return;
        }

        try {
          const poll = await fetch(`${API_BASE}/ai/jobs/${job_id}`);
          if (!poll.ok) return;
          const data = (await poll.json()) as AiJobResult;
          if (data.status === "done" || data.status === "failed") {
            clearInterval(pollRef.current!);
            setStatus(data.status);
            setResult(data);
          }
        } catch {
          // transient network error — keep polling
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setStatus("failed");
      setError("submitFailed");
    }
  }, []);

  return { status, result, error, submit, reset };
}
