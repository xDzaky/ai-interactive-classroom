<?php

namespace Tests\Feature;

use App\Models\Room;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P09-T02: Privacy — data export, erasure, and room retention command.
 *
 * Tests:
 * - GET /me/export returns user's own data
 * - GET /me/export requires auth (401)
 * - DELETE /me anonymizes user record
 * - DELETE /me requires auth (401)
 * - rooms:prune --dry-run does not change DB
 * - rooms:prune archives rooms older than threshold
 * - rooms:prune skips rooms newer than threshold
 */
class PrivacyTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeUser(string $role = 'teacher'): User
    {
        return User::factory()->create(['role' => $role]);
    }

    // ── Export Tests ──────────────────────────────────────────────────────────

    public function test_export_requires_auth(): void
    {
        $this->getJson('/api/v1/me/export')->assertStatus(401);
    }

    public function test_export_returns_user_data(): void
    {
        $user = $this->makeUser();

        $response = $this->actingAs($user)
            ->getJson('/api/v1/me/export')
            ->assertStatus(200);

        $response->assertJsonStructure([
            'exported_at',
            'user' => ['id', 'name', 'email', 'role'],
            'rooms',
            'ai_jobs',
        ]);

        $response->assertJsonFragment(['id' => $user->id, 'email' => $user->email]);
    }

    public function test_export_includes_own_rooms_only(): void
    {
        $userA = $this->makeUser();
        $userB = $this->makeUser();

        $school  = School::factory()->create();
        $classroom = \App\Models\Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $userA->id]);

        Room::factory()->create(['host_id' => $userA->id, 'classroom_id' => $classroom->id]);
        Room::factory()->create(['host_id' => $userB->id, 'classroom_id' => $classroom->id]);

        $response = $this->actingAs($userA)
            ->getJson('/api/v1/me/export')
            ->assertStatus(200);

        // userA should see only their own room
        $this->assertCount(1, $response->json('rooms'));
    }

    // ── Erasure Tests ─────────────────────────────────────────────────────────

    public function test_erasure_requires_auth(): void
    {
        $this->deleteJson('/api/v1/me')->assertStatus(401);
    }

    public function test_erasure_anonymizes_user(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user)
            ->deleteJson('/api/v1/me')
            ->assertStatus(200)
            ->assertJsonFragment(['message' => 'Account anonymized successfully.']);

        $this->assertDatabaseHas('users', [
            'id'   => $user->id,
            'name' => 'Deleted User',
        ]);

        $this->assertDatabaseMissing('users', [
            'id'    => $user->id,
            'email' => $user->email, // original email must be gone
        ]);
    }

    // ── Retention Command Tests ───────────────────────────────────────────────

    public function test_rooms_prune_dry_run_does_not_change_db(): void
    {
        $school     = School::factory()->create();
        $teacher    = $this->makeUser();
        $classroom  = \App\Models\Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $teacher->id]);

        Room::factory()->create([
            'host_id'      => $teacher->id,
            'classroom_id' => $classroom->id,
            'status'       => 'ended',
            'ends_at'      => now()->subDays(100),
        ]);

        $this->artisan('rooms:prune --dry-run')->assertExitCode(0);

        $this->assertDatabaseHas('rooms', ['status' => 'ended']);
    }

    public function test_rooms_prune_archives_old_ended_rooms(): void
    {
        $school    = School::factory()->create();
        $teacher   = $this->makeUser();
        $classroom = \App\Models\Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $teacher->id]);

        $oldRoom = Room::factory()->create([
            'host_id'      => $teacher->id,
            'classroom_id' => $classroom->id,
            'status'       => 'ended',
            'ends_at'      => now()->subDays(100),
        ]);

        $this->artisan('rooms:prune --days=90')->assertExitCode(0);

        $this->assertDatabaseHas('rooms', ['id' => $oldRoom->id, 'status' => 'archived']);
    }

    public function test_rooms_prune_skips_recent_ended_rooms(): void
    {
        $school    = School::factory()->create();
        $teacher   = $this->makeUser();
        $classroom = \App\Models\Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $teacher->id]);

        $recentRoom = Room::factory()->create([
            'host_id'      => $teacher->id,
            'classroom_id' => $classroom->id,
            'status'       => 'ended',
            'ends_at'      => now()->subDays(10),
        ]);

        $this->artisan('rooms:prune --days=90')->assertExitCode(0);

        // Recent room should still be 'ended', not 'archived'
        $this->assertDatabaseHas('rooms', ['id' => $recentRoom->id, 'status' => 'ended']);
    }
}
