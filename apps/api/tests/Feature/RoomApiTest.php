<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Room;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P04-T02: Room domain API — create, show, update, end, regenerate-code.
 */
class RoomApiTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeTeacherWithClassroom(): array
    {
        $teacher = User::factory()->create(['role' => 'teacher']);
        $school  = School::factory()->create();
        SchoolMembership::create([
            'school_id' => $school->id,
            'user_id'   => $teacher->id,
            'role'      => 'teacher',
        ]);
        $classroom = Classroom::factory()->create([
            'school_id'  => $school->id,
            'teacher_id' => $teacher->id,
        ]);
        return compact('teacher', 'school', 'classroom');
    }

    private function makeRoom(Classroom $classroom, User $host, array $attrs = []): Room
    {
        return Room::create(array_merge([
            'classroom_id' => $classroom->id,
            'host_id'      => $host->id,
            'code'         => Room::generateCode(),
            'status'       => 'draft',
            'mode'         => 'projector',
        ], $attrs));
    }

    // ── POST /api/v1/rooms ────────────────────────────────────────────────────

    public function test_teacher_can_create_room(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();

        $resp = $this->actingAs($teacher)->postJson('/api/v1/rooms', [
            'classroom_id' => $classroom->id,
            'mode'         => 'projector',
        ]);

        $resp->assertStatus(201)
             ->assertJsonPath('data.classroom_id', $classroom->id)
             ->assertJsonPath('data.status', 'draft')
             ->assertJsonStructure(['data' => ['id', 'code', 'status', 'mode']]);
    }

    public function test_create_room_generates_unique_code(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();

        $r1 = $this->actingAs($teacher)->postJson('/api/v1/rooms', ['classroom_id' => $classroom->id]);
        $r2 = $this->actingAs($teacher)->postJson('/api/v1/rooms', ['classroom_id' => $classroom->id]);

        $r1->assertStatus(201);
        $r2->assertStatus(201);
        $this->assertNotEquals($r1->json('data.code'), $r2->json('data.code'));
    }

    public function test_other_user_cannot_create_room_in_classroom(): void
    {
        ['classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $other = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($other)
             ->postJson('/api/v1/rooms', ['classroom_id' => $classroom->id])
             ->assertStatus(403);
    }

    public function test_create_room_validates_required_classroom_id(): void
    {
        ['teacher' => $teacher] = $this->makeTeacherWithClassroom();

        $this->actingAs($teacher)
             ->postJson('/api/v1/rooms', [])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['classroom_id']);
    }

    // ── GET /api/v1/rooms/{room} ──────────────────────────────────────────────

    public function test_host_can_view_room(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $room = $this->makeRoom($classroom, $teacher);

        $this->actingAs($teacher)
             ->getJson("/api/v1/rooms/{$room->id}")
             ->assertOk()
             ->assertJsonPath('data.id', $room->id);
    }

    public function test_non_participant_cannot_view_room(): void
    {
        ['classroom' => $classroom, 'teacher' => $teacher] = $this->makeTeacherWithClassroom();
        $room  = $this->makeRoom($classroom, $teacher);
        $other = User::factory()->create();

        $this->actingAs($other)
             ->getJson("/api/v1/rooms/{$room->id}")
             ->assertStatus(403);
    }

    // ── PATCH /api/v1/rooms/{room} ────────────────────────────────────────────

    public function test_host_can_update_room_status(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $room = $this->makeRoom($classroom, $teacher);

        $this->actingAs($teacher)
             ->patchJson("/api/v1/rooms/{$room->id}", ['status' => 'lobby'])
             ->assertOk()
             ->assertJsonPath('data.status', 'lobby');
    }

    public function test_invalid_status_transition_returns_422(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $room = $this->makeRoom($classroom, $teacher, ['status' => 'ended']);

        $this->actingAs($teacher)
             ->patchJson("/api/v1/rooms/{$room->id}", ['status' => 'live'])
             ->assertStatus(422);
    }

    public function test_non_host_cannot_update_room(): void
    {
        ['classroom' => $classroom, 'teacher' => $teacher] = $this->makeTeacherWithClassroom();
        $room  = $this->makeRoom($classroom, $teacher);
        $other = User::factory()->create();

        $this->actingAs($other)
             ->patchJson("/api/v1/rooms/{$room->id}", ['status' => 'lobby'])
             ->assertStatus(403);
    }

    // ── POST /api/v1/rooms/{room}/end ─────────────────────────────────────────

    public function test_host_can_end_room(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $room = $this->makeRoom($classroom, $teacher, ['status' => 'live']);

        $this->actingAs($teacher)
             ->postJson("/api/v1/rooms/{$room->id}/end")
             ->assertOk()
             ->assertJsonPath('data.status', 'ended');
    }

    public function test_cannot_end_already_ended_room(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $room = $this->makeRoom($classroom, $teacher, ['status' => 'ended']);

        $this->actingAs($teacher)
             ->postJson("/api/v1/rooms/{$room->id}/end")
             ->assertStatus(422);
    }

    // ── POST /api/v1/rooms/{room}/regenerate-code ─────────────────────────────

    public function test_host_can_regenerate_code(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $room    = $this->makeRoom($classroom, $teacher);
        $oldCode = $room->code;

        $resp = $this->actingAs($teacher)
                     ->postJson("/api/v1/rooms/{$room->id}/regenerate-code");

        $resp->assertOk()
             ->assertJsonStructure(['data' => ['code']]);

        $this->assertNotEquals($oldCode, $resp->json('data.code'));
    }

    public function test_cannot_regenerate_code_on_ended_room(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();
        $room = $this->makeRoom($classroom, $teacher, ['status' => 'ended']);

        $this->actingAs($teacher)
             ->postJson("/api/v1/rooms/{$room->id}/regenerate-code")
             ->assertStatus(403);
    }

    // ── Expiry command ────────────────────────────────────────────────────────

    public function test_expire_rooms_command_ends_expired_rooms(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();

        $expired = $this->makeRoom($classroom, $teacher, [
            'status'  => 'live',
            'ends_at' => now()->subMinutes(5),
        ]);
        $active = $this->makeRoom($classroom, $teacher, [
            'status'  => 'live',
            'ends_at' => now()->addHour(),
        ]);

        $this->artisan('rooms:expire')->assertSuccessful();

        $this->assertDatabaseHas('rooms', ['id' => $expired->id, 'status' => 'ended']);
        $this->assertDatabaseHas('rooms', ['id' => $active->id, 'status' => 'live']);
    }

    public function test_expire_rooms_dry_run_does_not_change_db(): void
    {
        ['teacher' => $teacher, 'classroom' => $classroom] = $this->makeTeacherWithClassroom();

        $expired = $this->makeRoom($classroom, $teacher, [
            'status'  => 'live',
            'ends_at' => now()->subMinutes(5),
        ]);

        $this->artisan('rooms:expire --dry-run')->assertSuccessful();

        $this->assertDatabaseHas('rooms', ['id' => $expired->id, 'status' => 'live']);
    }
}
