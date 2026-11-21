<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P09-T01: Security pass — headers, authz matrix, rate limits.
 *
 * Tests:
 * Security headers:
 * - Every response includes X-Frame-Options: DENY
 * - Every response includes X-Content-Type-Options: nosniff
 * - Every response includes Referrer-Policy header
 * - Every response includes Content-Security-Policy header
 *
 * Auth matrix — unauthenticated → 401:
 * - GET /api/v1/auth/me without token → 401
 * - POST /api/v1/schools without token → 401
 * - POST /api/v1/ai/jobs without token → 401
 * - POST /api/v1/schools/{school}/documents without token → 401
 *
 * Auth matrix — wrong role → 403:
 * - Student cannot upload document (403)
 * - Student cannot create school (403 via policy)
 *
 * Rate limit smoke test:
 * - POST /api/v1/ai/jobs > 20 requests → 429
 */
class SecurityPassTest extends TestCase
{
    use RefreshDatabase;

    // ── Security Header Tests ──────────────────────────────────────────────────

    public function test_health_response_has_x_frame_options(): void
    {
        $response = $this->getJson('/api/health');
        $response->assertHeader('X-Frame-Options', 'DENY');
    }

    public function test_health_response_has_x_content_type_options(): void
    {
        $response = $this->getJson('/api/health');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_health_response_has_referrer_policy(): void
    {
        $response = $this->getJson('/api/health');
        $this->assertNotEmpty($response->headers->get('Referrer-Policy'));
    }

    public function test_health_response_has_csp_header(): void
    {
        $response = $this->getJson('/api/health');
        $this->assertNotEmpty($response->headers->get('Content-Security-Policy'));
    }

    public function test_csp_forbids_framing(): void
    {
        $response = $this->getJson('/api/health');
        $csp = $response->headers->get('Content-Security-Policy', '');
        $this->assertStringContainsString("frame-ancestors 'none'", $csp);
    }

    // ── Unauthenticated → 401 Matrix ──────────────────────────────────────────

    public function test_get_me_without_auth_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_post_schools_without_auth_returns_401(): void
    {
        $this->postJson('/api/v1/schools', ['name' => 'Test'])->assertStatus(401);
    }

    public function test_post_ai_jobs_without_auth_returns_401(): void
    {
        $this->postJson('/api/v1/ai/jobs', ['type' => 'completion'])->assertStatus(401);
    }

    public function test_post_documents_without_auth_returns_401(): void
    {
        $school = School::factory()->create();
        $this->postJson("/api/v1/schools/{$school->id}/documents")->assertStatus(401);
    }

    public function test_get_schools_without_auth_returns_401(): void
    {
        $this->getJson('/api/v1/schools')->assertStatus(401);
    }

    // ── Wrong Role → 403 Matrix ───────────────────────────────────────────────

    public function test_student_cannot_upload_document(): void
    {
        $school  = School::factory()->create();
        $student = User::factory()->create(['role' => 'student']);
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $student->id, 'role' => 'student']);

        $this->actingAs($student)
            ->postJson("/api/v1/schools/{$school->id}/documents", [])
            ->assertStatus(403);
    }

    public function test_student_cannot_create_school(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->actingAs($student)
            ->postJson('/api/v1/schools', ['name' => 'Hack School', 'slug' => 'hack'])
            ->assertStatus(403);
    }

    public function test_outsider_cannot_view_another_schools_document(): void
    {
        $schoolA  = School::factory()->create();
        $schoolB  = School::factory()->create();
        $outsider = User::factory()->create(['role' => 'teacher']);
        SchoolMembership::create(['school_id' => $schoolA->id, 'user_id' => $outsider->id, 'role' => 'teacher']);

        // Document belongs to school B
        $doc = \App\Models\Document::create([
            'school_id'    => $schoolB->id,
            'user_id'      => $outsider->id,
            'title'        => 'Private',
            'status'       => 'queued',
            'storage_path' => "schools/{$schoolB->id}/documents/x.txt",
        ]);

        // Try to access via school A URL → 404 (tenant isolation)
        $this->actingAs($outsider)
            ->getJson("/api/v1/schools/{$schoolA->id}/documents/{$doc->id}")
            ->assertStatus(404);
    }

    // ── Rate Limit Smoke Test ─────────────────────────────────────────────────

    public function test_ai_jobs_rate_limit_triggers_at_21_requests(): void
    {
        $user = User::factory()->create(['role' => 'teacher']);

        // Clear any stale rate limit entries
        \Illuminate\Support\Facades\RateLimiter::clear('ai_jobs:' . $user->id);

        // 20 requests should be accepted (Queue::fake keeps jobs synchronous-free)
        \Illuminate\Support\Facades\Queue::fake();

        for ($i = 0; $i < 20; $i++) {
            $this->actingAs($user)
                ->postJson('/api/v1/ai/jobs', ['type' => 'completion'])
                ->assertStatus(202);
        }

        // 21st request → 429
        $this->actingAs($user)
            ->postJson('/api/v1/ai/jobs', ['type' => 'completion'])
            ->assertStatus(429)
            ->assertJsonStructure(['message', 'retry_after']);
    }
}
