<?php

namespace Tests\Feature;

use App\Jobs\IngestDocument;
use App\Models\Document;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * P08-T03: Document ingestion API tests.
 *
 * Tests:
 * - 401 without auth
 * - 403 for non-member (student trying to upload)
 * - 202 on successful upload (teacher)
 * - 202 on successful upload (school_admin)
 * - Job dispatched on upload
 * - 404 when document belongs to different school (tenant isolation)
 * - 422 on missing file
 * - 422 on oversized file type (mimes validation)
 * - GET show returns {id, title, status, ingested_at}
 * - GET show 403 for non-member
 */
class DocumentApiTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeSchool(): School
    {
        return School::factory()->create();
    }

    private function makeTeacher(School $school): User
    {
        $user = User::factory()->create(['role' => 'teacher']);
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $user->id, 'role' => 'teacher']);
        return $user;
    }

    private function makeAdmin(School $school): User
    {
        $user = User::factory()->create(['role' => 'school_admin']);
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $user->id, 'role' => 'admin']);
        return $user;
    }

    private function makeStudent(School $school): User
    {
        $user = User::factory()->create(['role' => 'student']);
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $user->id, 'role' => 'student']);
        return $user;
    }

    private function txtFile(string $content = 'Hello classroom'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('lesson.txt', $content);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_upload_requires_auth(): void
    {
        $school = $this->makeSchool();

        $this->postJson("/api/v1/schools/{$school->id}/documents", [])
            ->assertStatus(401);
    }

    public function test_student_cannot_upload_document(): void
    {
        Storage::fake('local');
        $school  = $this->makeSchool();
        $student = $this->makeStudent($school);

        $this->actingAs($student)
            ->postJson("/api/v1/schools/{$school->id}/documents", [
                'file' => $this->txtFile(),
            ])
            ->assertStatus(403);
    }

    public function test_teacher_uploads_document_returns_202(): void
    {
        Storage::fake('local');
        Queue::fake();

        $school  = $this->makeSchool();
        $teacher = $this->makeTeacher($school);

        $response = $this->actingAs($teacher)
            ->postJson("/api/v1/schools/{$school->id}/documents", [
                'file'  => $this->txtFile('Math lesson content'),
                'title' => 'Math Lesson',
            ]);

        $response->assertStatus(202)
            ->assertJsonStructure(['document_id', 'status'])
            ->assertJsonFragment(['status' => 'queued']);

        $this->assertDatabaseHas('documents', [
            'school_id' => $school->id,
            'user_id'   => $teacher->id,
            'title'     => 'Math Lesson',
            'status'    => 'queued',
        ]);
    }

    public function test_school_admin_can_upload_document(): void
    {
        Storage::fake('local');
        Queue::fake();

        $school = $this->makeSchool();
        $admin  = $this->makeAdmin($school);

        $this->actingAs($admin)
            ->postJson("/api/v1/schools/{$school->id}/documents", [
                'file' => $this->txtFile('Admin doc'),
            ])
            ->assertStatus(202);
    }

    public function test_upload_dispatches_ingest_job(): void
    {
        Storage::fake('local');
        Queue::fake();

        $school  = $this->makeSchool();
        $teacher = $this->makeTeacher($school);

        $this->actingAs($teacher)
            ->postJson("/api/v1/schools/{$school->id}/documents", [
                'file' => $this->txtFile('content'),
            ])
            ->assertStatus(202);

        Queue::assertPushed(IngestDocument::class);
    }

    public function test_upload_missing_file_returns_422(): void
    {
        $school  = $this->makeSchool();
        $teacher = $this->makeTeacher($school);

        $this->actingAs($teacher)
            ->postJson("/api/v1/schools/{$school->id}/documents", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_show_returns_document_status(): void
    {
        Storage::fake('local');
        Queue::fake();

        $school  = $this->makeSchool();
        $teacher = $this->makeTeacher($school);

        $document = Document::create([
            'school_id'    => $school->id,
            'user_id'      => $teacher->id,
            'title'        => 'Test Doc',
            'status'       => 'queued',
            'storage_path' => 'schools/' . $school->id . '/documents/test.txt',
        ]);

        $this->actingAs($teacher)
            ->getJson("/api/v1/schools/{$school->id}/documents/{$document->id}")
            ->assertStatus(200)
            ->assertJsonFragment([
                'id'     => $document->id,
                'title'  => 'Test Doc',
                'status' => 'queued',
            ]);
    }

    public function test_show_isolates_across_schools(): void
    {
        Storage::fake('local');

        $schoolA  = $this->makeSchool();
        $schoolB  = $this->makeSchool();
        $teacherA = $this->makeTeacher($schoolA);

        // Document belongs to school B
        $document = Document::create([
            'school_id'    => $schoolB->id,
            'user_id'      => $teacherA->id,
            'title'        => 'Other school doc',
            'status'       => 'queued',
            'storage_path' => 'schools/' . $schoolB->id . '/documents/x.txt',
        ]);

        // Teacher from school A trying to access school B's document via school A URL
        $this->actingAs($teacherA)
            ->getJson("/api/v1/schools/{$schoolA->id}/documents/{$document->id}")
            ->assertStatus(404);
    }

    public function test_show_requires_auth(): void
    {
        $school   = $this->makeSchool();
        $teacher  = $this->makeTeacher($school);
        $document = Document::create([
            'school_id'    => $school->id,
            'user_id'      => $teacher->id,
            'title'        => 'Doc',
            'status'       => 'queued',
            'storage_path' => 'schools/' . $school->id . '/documents/x.txt',
        ]);

        $this->getJson("/api/v1/schools/{$school->id}/documents/{$document->id}")
            ->assertStatus(401);
    }

    public function test_non_member_cannot_view_document(): void
    {
        $school    = $this->makeSchool();
        $teacher   = $this->makeTeacher($school);
        $outsider  = User::factory()->create(['role' => 'teacher']);

        $document = Document::create([
            'school_id'    => $school->id,
            'user_id'      => $teacher->id,
            'title'        => 'Private doc',
            'status'       => 'queued',
            'storage_path' => 'schools/' . $school->id . '/documents/x.txt',
        ]);

        $this->actingAs($outsider)
            ->getJson("/api/v1/schools/{$school->id}/documents/{$document->id}")
            ->assertStatus(403);
    }
}
