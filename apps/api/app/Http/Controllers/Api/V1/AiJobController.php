<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiJob;
use App\Models\AiUsageLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * AiJobController — P08-T05
 *
 * Routes (all require auth:sanctum):
 *   POST  /api/v1/ai/jobs        → store   (202 + job_id; rate limited)
 *   GET   /api/v1/ai/jobs/{job}  → show    (status + result when done)
 *
 * Rate limit: 20 AI jobs per hour per user (ADR-019).
 * Usage log: written when job is dispatched (prompt_tokens/completion_tokens patched on result).
 *
 * Security: server-side authorization — users may only see their own jobs.
 */
class AiJobController extends Controller
{
    // ── POST /ai/jobs ──────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // Rate limit: 20 AI jobs per hour per user
        $key = 'ai_jobs:' . $user->id;
        if (RateLimiter::tooManyAttempts($key, 20)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => 'Too many AI job requests. Please try again later.',
                'retry_after' => $seconds,
            ], 429);
        }
        RateLimiter::hit($key, 3600); // 1-hour window

        $data = $request->validate([
            'type'      => ['required', 'string', 'max:64'],
            'payload'   => ['sometimes', 'nullable', 'array'],
            'room_id'   => ['sometimes', 'nullable', 'uuid', 'exists:rooms,id'],
        ]);

        $job = AiJob::create([
            'user_id' => $user->id,
            'room_id' => $data['room_id'] ?? null,
            'type'    => $data['type'],
            'payload' => $data['payload'] ?? null,
            'status'  => 'pending',
        ]);

        // Dispatch to ai-service asynchronously (fire-and-forget via queue job)
        // In development (QUEUE_CONNECTION=sync), this runs inline; in production use Redis queue.
        dispatch(new \App\Jobs\AiJob($job->id));

        return response()->json([
            'job_id' => $job->id,
            'status' => 'pending',
        ], 202);
    }

    // ── GET /ai/jobs/{job} ─────────────────────────────────────────────────

    public function show(Request $request, string $job): JsonResponse
    {
        $user = $request->user();

        /** @var AiJob|null $aiJob */
        $aiJob = AiJob::find($job);

        if ($aiJob === null) {
            return response()->json(['message' => 'AI job not found.'], 404);
        }

        // Authorization: user may only see their own jobs
        if ($aiJob->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $response = [
            'job_id'      => $aiJob->id,
            'type'        => $aiJob->type,
            'status'      => $aiJob->status,
            'tokens_used' => $aiJob->tokens_used,
            'created_at'  => $aiJob->created_at?->toIso8601String(),
            'finished_at' => $aiJob->finished_at?->toIso8601String(),
        ];

        if ($aiJob->status === 'done' || $aiJob->status === 'failed') {
            $response['result'] = $aiJob->result;
        }

        return response()->json($response);
    }
}
