<?php

namespace Tests\Feature;

use App\Models\AiJob;
use App\Models\Classroom;
use App\Models\Room;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * P08-T05: Laravel AI job layer tests.
 * - POST /ai/jobs → 202 + job_id (authenticated user)
 * - GET /ai/jobs/{id} → status (own job only)
 * - 403 on other user's job
 * - 401 without auth
 * - Rate limit: >20 requests → 429
 * - 422 on missing type
 * - 404 on non-existent job
 * - 200 with result when status=done
 */
class AiJobApiTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeUser(): User
    {
        return User::factory()->create(['role' => 'teacher']);
    }

    private function makeRoom(User $host): Room
    {
        $school    = School::factory()->create();
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $host->id, 'role' => 'teacher']);
        $classroom = Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $host->id]);
        return Room::create([
            'id'           => Str::uuid()->toString(),
            'classroom_id' => $classroom->id,
            'host_id'      => $host->id,
            'code'         => strtoupper(Str::random(8)),
            'status'       => 'live',
            'mode'         => 'projector',
        ]);
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    /** POST /ai/jobs → 202 + job_id */
    public function test_store_returns_202_with_job_id(): void
    {
        Queue::fake();
        $user = $this->makeUser();

        $response = $this->actingAs($user)->postJson('/api/v1/ai/jobs', [
            'type'    => 'completion',
            'payload' => ['messages' => [['role' => 'user', 'content' => 'Hello']]],
        ]);

        $response->assertStatus(202)
            ->assertJsonStructure(['job_id', 'status'])
            ->assertJsonPath('status', 'pending');

        $this->assertDatabaseHas('ai_jobs', [
            'user_id' => $user->id,
            'type'    => 'completion',
            'status'  => 'pending',
        ]);
    }

    /** POST /ai/jobs with room_id → 202 */
    public function test_store_with_room_id_returns_202(): void
    {
        Queue::fake();
        $user = $this->makeUser();
        $room = $this->makeRoom($user);

        $response = $this->actingAs($user)->postJson('/api/v1/ai/jobs', [
            'type'    => 'completion',
            'room_id' => $room->id,
        ]);

        $response->assertStatus(202);
        $this->assertDatabaseHas('ai_jobs', [
            'room_id' => $room->id,
            'user_id' => $user->id,
        ]);
    }

    /** POST /ai/jobs without auth → 401 */
    public function test_store_requires_auth(): void
    {
        $response = $this->postJson('/api/v1/ai/jobs', ['type' => 'completion']);
        $response->assertStatus(401);
    }

    /** POST /ai/jobs without type → 422 */
    public function test_store_requires_type(): void
    {
        Queue::fake();
        $user = $this->makeUser();

        $response = $this->actingAs($user)->postJson('/api/v1/ai/jobs', []);
        $response->assertStatus(422)->assertJsonValidationErrors(['type']);
    }

    /** GET /ai/jobs/{id} → 200 with status */
    public function test_show_returns_job_status(): void
    {
        $user = $this->makeUser();
        $job  = AiJob::create([
            'user_id' => $user->id,
            'type'    => 'completion',
            'status'  => 'pending',
        ]);

        $response = $this->actingAs($user)->getJson("/api/v1/ai/jobs/{$job->id}");

        $response->assertStatus(200)
            ->assertJsonStructure(['job_id', 'type', 'status', 'tokens_used', 'created_at'])
            ->assertJsonPath('status', 'pending');
    }

    /** GET /ai/jobs/{id} → 403 for different user */
    public function test_show_forbids_other_user(): void
    {
        $owner = $this->makeUser();
        $other = $this->makeUser();
        $job   = AiJob::create([
            'user_id' => $owner->id,
            'type'    => 'completion',
            'status'  => 'pending',
        ]);

        $response = $this->actingAs($other)->getJson("/api/v1/ai/jobs/{$job->id}");
        $response->assertStatus(403);
    }

    /** GET /ai/jobs/{id} → 404 for non-existent */
    public function test_show_returns_404_for_missing_job(): void
    {
        $user     = $this->makeUser();
        $fakeId   = Str::uuid()->toString();

        $response = $this->actingAs($user)->getJson("/api/v1/ai/jobs/{$fakeId}");
        $response->assertStatus(404);
    }

    /** GET /ai/jobs/{id} → result included when status=done */
    public function test_show_includes_result_when_done(): void
    {
        $user = $this->makeUser();
        $job  = AiJob::create([
            'user_id'     => $user->id,
            'type'        => 'completion',
            'status'      => 'done',
            'result'      => ['content' => 'Hello world'],
            'tokens_used' => 42,
            'finished_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson("/api/v1/ai/jobs/{$job->id}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'done')
            ->assertJsonPath('result.content', 'Hello world')
            ->assertJsonPath('tokens_used', 42);
    }

    /** Rate limit: >20 AI jobs per hour → 429 */
    public function test_rate_limit_returns_429_after_20_requests(): void
    {
        Queue::fake();
        $user = $this->makeUser();

        // Send 20 successful requests to hit the limit
        for ($i = 0; $i < 20; $i++) {
            $this->actingAs($user)->postJson('/api/v1/ai/jobs', ['type' => 'completion'])
                ->assertStatus(202);
        }

        // 21st should be rate limited
        $response = $this->actingAs($user)->postJson('/api/v1/ai/jobs', ['type' => 'completion']);
        $response->assertStatus(429)
            ->assertJsonStructure(['message', 'retry_after']);
    }
}
