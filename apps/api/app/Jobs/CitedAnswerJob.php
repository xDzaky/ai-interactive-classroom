<?php

namespace App\Jobs;

use App\Models\AiJob as AiJobModel;
use App\Models\DocumentChunk;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * CitedAnswerJob — P08-T04
 *
 * Handles AI jobs of type "cited_answer":
 *   1. Fetch school-scoped document chunks from the DB (tenant isolation).
 *   2. POST chunks + question to FastAPI /ai/retrieval/search.
 *   3. Write citations + answer back to the ai_jobs row.
 *
 * Payload expected: { "question": "...", "school_id": "uuid" }
 */
class CitedAnswerJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 15;

    public function __construct(public readonly string $jobId) {}

    public function handle(): void
    {
        /** @var AiJobModel|null $aiJob */
        $aiJob = AiJobModel::find($this->jobId);
        if ($aiJob === null) {
            Log::warning('CitedAnswerJob: AiJob not found', ['job_id' => $this->jobId]);
            return;
        }

        $aiJob->update(['status' => 'running']);

        $aiServiceUrl   = config('services.ai_service.url', env('AI_SERVICE_URL', 'http://localhost:8100'));
        $internalSecret = config('services.ai_service.secret', env('AI_SERVICE_INTERNAL_SECRET', 'changeme'));

        try {
            $payload  = $aiJob->payload ?? [];
            $question = $payload['question'] ?? '';
            $schoolId = $payload['school_id'] ?? null;

            if (! $question || ! $schoolId) {
                throw new \InvalidArgumentException('cited_answer job requires question and school_id in payload');
            }

            // 1. Fetch school-scoped ready chunks (tenant isolation enforced here)
            $chunks = DocumentChunk::query()
                ->join('documents', 'documents.id', '=', 'document_chunks.document_id')
                ->where('documents.school_id', $schoolId)
                ->where('documents.status', 'ready')
                ->select([
                    'document_chunks.id',
                    'document_chunks.document_id',
                    'document_chunks.text',
                    'document_chunks.embedding',
                ])
                ->limit(200) // cap to avoid oversized payload
                ->get()
                ->map(fn ($c) => [
                    'id'          => $c->id,
                    'document_id' => $c->document_id,
                    'chunk_text'  => $c->text,
                    'embedding'   => $c->embedding, // JSON string; retrieval service parses it
                ])
                ->all();

            if (empty($chunks)) {
                // No ready documents — return empty result gracefully
                $aiJob->update([
                    'status'      => 'done',
                    'result'      => ['citations' => [], 'answer' => null, 'note' => 'No ready documents found for this school.'],
                    'finished_at' => now(),
                ]);
                return;
            }

            // 2. POST to retrieval endpoint
            $response = Http::withHeaders(['X-Internal-Secret' => $internalSecret])
                ->timeout(60)
                ->post("{$aiServiceUrl}/ai/retrieval/search", [
                    'question'  => $question,
                    'school_id' => $schoolId,
                    'chunks'    => $chunks,
                    'top_k'     => (int) ($payload['top_k'] ?? 5),
                ]);

            if ($response->failed()) {
                throw new \RuntimeException('Retrieval service error: ' . $response->body());
            }

            $result = $response->json();

            $aiJob->update([
                'status'      => 'done',
                'result'      => $result,
                'tokens_used' => 0, // retrieval doesn't expose token count directly
                'finished_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('CitedAnswerJob failed', ['job_id' => $this->jobId, 'error' => $e->getMessage()]);

            $aiJob->update([
                'status'      => 'failed',
                'result'      => ['error' => $e->getMessage()],
                'finished_at' => now(),
            ]);
        }
    }
}
