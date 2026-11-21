<?php

namespace App\Jobs;

use App\Models\AiJob as AiJobModel;
use App\Models\AiUsageLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AiJob — P08-T05
 * Laravel queue job: dispatches to FastAPI ai-service, writes result back to ai_jobs row.
 * On done: writes ai_usage_logs row.
 */
class AiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly string $jobId) {}

    public function handle(): void
    {
        /** @var AiJobModel|null $job */
        $job = AiJobModel::find($this->jobId);
        if ($job === null) {
            Log::warning('AiJob: job not found', ['job_id' => $this->jobId]);
            return;
        }

        $job->update(['status' => 'running']);

        $aiServiceUrl = config('services.ai_service.url', env('AI_SERVICE_URL', 'http://localhost:8100'));
        $secret       = config('services.ai_service.secret', env('AI_SERVICE_INTERNAL_SECRET', 'changeme'));

        try {
            // POST to FastAPI /ai/jobs — fire the job there
            $response = Http::withHeaders(['X-Internal-Secret' => $secret])
                ->timeout(60)
                ->post("{$aiServiceUrl}/ai/jobs", [
                    'type'    => $job->type,
                    'payload' => $job->payload ?? [],
                ]);

            if ($response->failed()) {
                $job->update([
                    'status'      => 'failed',
                    'result'      => ['error' => $response->body()],
                    'finished_at' => now(),
                ]);
                return;
            }

            $aiJobId = $response->json('job_id');

            // Poll ai-service for result (simple synchronous polling for now)
            $result      = null;
            $attempts    = 0;
            $maxAttempts = 30;

            while ($attempts < $maxAttempts) {
                sleep(2);
                $poll = Http::withHeaders(['X-Internal-Secret' => $secret])
                    ->timeout(10)
                    ->get("{$aiServiceUrl}/ai/jobs/{$aiJobId}");

                if ($poll->failed()) {
                    break;
                }

                $status = $poll->json('status');
                if ($status === 'done' || $status === 'failed') {
                    $result = $poll->json();
                    break;
                }

                $attempts++;
            }

            if ($result === null) {
                $job->update([
                    'status'      => 'failed',
                    'result'      => ['error' => 'ai-service timeout'],
                    'finished_at' => now(),
                ]);
                return;
            }

            $finalStatus  = $result['status'] ?? 'done';
            $jobResult    = $result['result'] ?? null;
            $tokensUsed   = ($jobResult['usage']['total_tokens'] ?? 0);

            $job->update([
                'status'      => $finalStatus,
                'result'      => $jobResult,
                'tokens_used' => $tokensUsed,
                'finished_at' => now(),
            ]);

            // Write usage log on success
            if ($finalStatus === 'done') {
                $user = $job->user;
                AiUsageLog::create([
                    'user_id'           => $job->user_id,
                    'school_id'         => $user?->school_id ?? null,
                    'job_id'            => $job->id,
                    'model'             => $jobResult['model'] ?? 'unknown',
                    'prompt_tokens'     => $jobResult['usage']['prompt_tokens'] ?? 0,
                    'completion_tokens' => $jobResult['usage']['completion_tokens'] ?? 0,
                    'cost_usd'          => 0, // Computed separately by cost service
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('AiJob dispatch failed', ['job_id' => $this->jobId, 'error' => $e->getMessage()]);
            $job->update([
                'status'      => 'failed',
                'result'      => ['error' => $e->getMessage()],
                'finished_at' => now(),
            ]);
        }
    }
}
