<?php

namespace App\Jobs;

use App\Models\Document;
use App\Models\DocumentChunk;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class IngestDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public readonly string $documentId,
    ) {}

    public function handle(): void
    {
        $document = Document::findOrFail($this->documentId);

        $document->update(['status' => 'processing']);

        try {
            // 1. Read text from storage
            $text = $this->extractText($document);

            // 2. Chunk text (~500 chars with ~50-char overlap)
            $chunks = $this->chunkText($text);

            // 3. Embed chunks via ai-service
            $aiServiceUrl    = rtrim(config('services.ai_service.url', 'http://localhost:8100'), '/');
            $internalSecret  = config('services.ai_service.secret', 'changeme');

            $response = Http::withHeaders([
                'X-Internal-Secret' => $internalSecret,
            ])->post("{$aiServiceUrl}/ai/embeddings/ingest", [
                'chunks' => $chunks,
                'model'  => 'text-embedding-3-small',
            ]);

            if (! $response->successful()) {
                throw new \RuntimeException('Embedding service error: ' . $response->body());
            }

            $vectors = $response->json('vectors', []);

            // 4. Persist chunks
            DocumentChunk::where('document_id', $document->id)->delete();

            foreach ($chunks as $index => $chunkText) {
                DocumentChunk::create([
                    'document_id' => $document->id,
                    'chunk_index' => $index,
                    'text'        => $chunkText,
                    'embedding'   => json_encode($vectors[$index] ?? []),
                ]);
            }

            $document->update([
                'status'      => 'ready',
                'ingested_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('IngestDocument failed', [
                'document_id' => $document->id,
                'error'       => $e->getMessage(),
            ]);

            $document->update(['status' => 'failed']);

            throw $e;
        }
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private function extractText(Document $document): string
    {
        $path = $document->storage_path;

        if (! Storage::disk('local')->exists($path)) {
            throw new \RuntimeException("File not found: {$path}");
        }

        $content = Storage::disk('local')->get($path);
        $ext     = pathinfo($path, PATHINFO_EXTENSION);

        if (strtolower($ext) === 'pdf') {
            // Basic text extraction from PDF without binary dependencies
            // For production, wire a Python sidecar or queue to ai-service extract endpoint.
            // For now: strip binary and keep printable ASCII (good enough for tests).
            $content = preg_replace('/[^\x09\x0A\x0D\x20-\x7E]/', ' ', $content);
            $content = preg_replace('/\s+/', ' ', $content);
        }

        return trim((string) $content);
    }

    private function chunkText(string $text, int $chunkSize = 500, int $overlap = 50): array
    {
        if (strlen($text) <= $chunkSize) {
            return [$text];
        }

        $chunks = [];
        $offset = 0;
        $len    = strlen($text);

        while ($offset < $len) {
            $end   = min($offset + $chunkSize, $len);
            $chunk = substr($text, $offset, $end - $offset);
            $chunks[] = trim($chunk);
            $offset += $chunkSize - $overlap;
        }

        return array_filter($chunks, fn ($c) => strlen($c) > 0);
    }
}
