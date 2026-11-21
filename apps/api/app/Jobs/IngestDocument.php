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
            $aiServiceUrl = rtrim(config('services.ai_service.url', 'http://localhost:8100'), '/');
            $internalSecret = config('services.ai_service.secret', 'changeme');

            // 1. Read and extract text through the authenticated AI service.
            $text = $this->extractText($document, $aiServiceUrl, $internalSecret);

            // 2. Chunk text (~500 chars with ~50-char overlap)
            $chunks = $this->chunkText($text);

            // 3. Embed chunks via ai-service
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

    private function extractText(Document $document, string $aiServiceUrl, string $internalSecret): string
    {
        $path = $document->storage_path;

        if (! Storage::disk('local')->exists($path)) {
            throw new \RuntimeException("File not found: {$path}");
        }

        $response = Http::withHeaders(['X-Internal-Secret' => $internalSecret])->post("{$aiServiceUrl}/ai/embeddings/extract", [
            'content_base64' => base64_encode(Storage::disk('local')->get($path)),
            'filename' => basename($path),
        ]);
        if (! $response->successful()) {
            throw new \RuntimeException('Document extraction service error');
        }
        return (string) $response->json('text');
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
