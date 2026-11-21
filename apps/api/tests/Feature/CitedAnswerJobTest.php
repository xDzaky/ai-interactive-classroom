<?php

namespace Tests\Feature;

use App\Jobs\CitedAnswerJob;
use App\Models\AiJob;
use App\Models\Document;
use App\Models\DocumentChunk;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * P08-T04: Scoped retrieval + cited answers — Laravel layer tests.
 *
 * Tests:
 * - POST /ai/jobs with type=cited_answer returns 202
 * - CitedAnswerJob dispatched for cited_answer type
 * - CitedAnswerJob calls retrieval service with school-scoped chunks
 * - CitedAnswerJob respects school_id tenant isolation (no cross-school chunks)
 * - CitedAnswerJob handles empty chunks gracefully (no ready documents)
 * - CitedAnswerJob marks job failed on retrieval service error
 */
class CitedAnswerJobTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeSchoolWithTeacher(): array
    {
        $school  = School::factory()->create();
        $teacher = User::factory()->create(['role' => 'teacher']);
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $teacher->id, 'role' => 'teacher']);
        return [$school, $teacher];
    }

    private function makeReadyDocument(School $school, User $user, string $chunkText = 'Science content'): Document
    {
        $doc = Document::create([
            'school_id'    => $school->id,
            'user_id'      => $user->id,
            'title'        => 'Test Doc',
            'status'       => 'ready',
            'storage_path' => "schools/{$school->id}/documents/test.txt",
            'ingested_at'  => now(),
        ]);

        DocumentChunk::create([
            'document_id' => $doc->id,
            'chunk_index' => 0,
            'text'        => $chunkText,
            'embedding'   => json_encode(array_fill(0, 10, 0.1)),
        ]);

        return $doc;
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_cited_answer_job_submitted_returns_202(): void
    {
        Queue::fake();

        [$school, $teacher] = $this->makeSchoolWithTeacher();

        $this->actingAs($teacher)
            ->postJson('/api/v1/ai/jobs', [
                'type'    => 'cited_answer',
                'payload' => ['question' => 'What is photosynthesis?', 'school_id' => $school->id],
            ])
            ->assertStatus(202)
            ->assertJsonStructure(['job_id', 'status']);
    }

    public function test_cited_answer_dispatches_cited_answer_job(): void
    {
        Queue::fake();

        [$school, $teacher] = $this->makeSchoolWithTeacher();

        $this->actingAs($teacher)
            ->postJson('/api/v1/ai/jobs', [
                'type'    => 'cited_answer',
                'payload' => ['question' => 'What is mitosis?', 'school_id' => $school->id],
            ])
            ->assertStatus(202);

        Queue::assertPushed(CitedAnswerJob::class);
    }

    public function test_cited_answer_job_calls_retrieval_service(): void
    {
        Http::fake([
            '*/ai/retrieval/search' => Http::response([
                'citations' => [['chunk_id' => 'c1', 'document_id' => 'd1', 'chunk_text' => 'content', 'score' => 0.95]],
                'answer'    => 'Photosynthesis converts sunlight [1].',
            ], 200),
        ]);

        [$school, $teacher] = $this->makeSchoolWithTeacher();
        $this->makeReadyDocument($school, $teacher, 'Photosynthesis content');

        $aiJob = AiJob::create([
            'user_id' => $teacher->id,
            'type'    => 'cited_answer',
            'payload' => ['question' => 'What is photosynthesis?', 'school_id' => $school->id],
            'status'  => 'pending',
        ]);

        (new CitedAnswerJob($aiJob->id))->handle();

        $aiJob->refresh();
        $this->assertEquals('done', $aiJob->status);
        $this->assertNotNull($aiJob->result);
        $this->assertArrayHasKey('citations', $aiJob->result);
        $this->assertArrayHasKey('answer', $aiJob->result);

        Http::assertSent(fn ($req) => str_contains($req->url(), '/ai/retrieval/search'));
    }

    public function test_cited_answer_job_isolates_school_chunks(): void
    {
        Http::fake([
            '*/ai/retrieval/search' => Http::response([
                'citations' => [],
                'answer'    => null,
            ], 200),
        ]);

        [$schoolA, $teacherA] = $this->makeSchoolWithTeacher();
        [$schoolB, $teacherB] = $this->makeSchoolWithTeacher();

        // School B has a ready document
        $this->makeReadyDocument($schoolB, $teacherB, 'Secret content from school B');

        // Job is for school A — should send no chunks from school B
        $aiJob = AiJob::create([
            'user_id' => $teacherA->id,
            'type'    => 'cited_answer',
            'payload' => ['question' => 'Secret?', 'school_id' => $schoolA->id],
            'status'  => 'pending',
        ]);

        (new CitedAnswerJob($aiJob->id))->handle();

        $aiJob->refresh();
        // No chunks → result note says no ready documents
        $this->assertEquals('done', $aiJob->status);
        $this->assertStringContainsString('No ready documents', $aiJob->result['note'] ?? '');

        // Retrieval service should NOT have been called (no chunks to send)
        Http::assertNothingSent();
    }

    public function test_cited_answer_job_handles_empty_school_documents(): void
    {
        [$school, $teacher] = $this->makeSchoolWithTeacher();
        // No documents at all

        $aiJob = AiJob::create([
            'user_id' => $teacher->id,
            'type'    => 'cited_answer',
            'payload' => ['question' => 'What is biology?', 'school_id' => $school->id],
            'status'  => 'pending',
        ]);

        (new CitedAnswerJob($aiJob->id))->handle();

        $aiJob->refresh();
        $this->assertEquals('done', $aiJob->status);
        $this->assertEmpty($aiJob->result['citations']);
    }

    public function test_cited_answer_job_marks_failed_on_service_error(): void
    {
        Http::fake([
            '*/ai/retrieval/search' => Http::response('Service unavailable', 503),
        ]);

        [$school, $teacher] = $this->makeSchoolWithTeacher();
        $this->makeReadyDocument($school, $teacher);

        $aiJob = AiJob::create([
            'user_id' => $teacher->id,
            'type'    => 'cited_answer',
            'payload' => ['question' => 'test?', 'school_id' => $school->id],
            'status'  => 'pending',
        ]);

        (new CitedAnswerJob($aiJob->id))->handle();

        $aiJob->refresh();
        $this->assertEquals('failed', $aiJob->status);
        $this->assertArrayHasKey('error', $aiJob->result);
    }
}
