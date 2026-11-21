<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Participant;
use App\Models\Room;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P04-T03: Join flow — guest + authenticated, tokens, rate-limit basics.
 */
class RoomJoinTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeRoom(string $status = 'lobby'): array
    {
        $teacher   = User::factory()->create(['role' => 'teacher']);
        $school    = School::factory()->create();
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $teacher->id, 'role' => 'teacher']);
        $classroom = Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $teacher->id]);
        $room      = Room::create([
            'classroom_id' => $classroom->id,
            'host_id'      => $teacher->id,
            'code'         => Room::generateCode(),
            'status'       => $status,
            'mode'         => 'projector',
        ]);
        return compact('teacher', 'room');
    }

    // ── Guest join ────────────────────────────────────────────────────────────

    public function test_guest_can_join_lobby_room_with_code(): void
    {
        ['room' => $room] = $this->makeRoom('lobby');

        $resp = $this->postJson('/api/v1/rooms/join', [
            'code'  => $room->code,
            'alias' => 'Ali',
        ]);

        $resp->assertStatus(201)
             ->assertJsonStructure(['participant_token', 'participant' => ['id', 'alias', 'role']]);

        $this->assertDatabaseHas('participants', [
            'room_id' => $room->id,
            'alias'   => 'Ali',
            'role'    => 'guest_student',
        ]);
    }

    public function test_guest_join_generates_non_empty_token(): void
    {
        ['room' => $room] = $this->makeRoom('lobby');

        $resp = $this->postJson('/api/v1/rooms/join', ['code' => $room->code, 'alias' => 'Budi']);

        $token = $resp->json('participant_token');
        $this->assertNotEmpty($token);
        $this->assertStringContainsString('.', $token);
    }

    public function test_guest_token_hash_stored_in_db(): void
    {
        ['room' => $room] = $this->makeRoom('lobby');

        $resp  = $this->postJson('/api/v1/rooms/join', ['code' => $room->code, 'alias' => 'Cici']);
        $token = $resp->json('participant_token');

        $hash = hash('sha256', $token);
        $this->assertDatabaseHas('participants', ['token_hash' => $hash]);
    }

    public function test_join_generates_guest_alias_when_none_given(): void
    {
        ['room' => $room] = $this->makeRoom('lobby');

        $resp = $this->postJson('/api/v1/rooms/join', ['code' => $room->code]);

        $resp->assertStatus(201);
        $alias = $resp->json('participant.alias');
        $this->assertNotEmpty($alias);
    }

    // ── Authenticated join ────────────────────────────────────────────────────

    public function test_authenticated_student_joins_as_student_role(): void
    {
        ['room' => $room] = $this->makeRoom('lobby');
        $student = User::factory()->create();

        $resp = $this->actingAs($student)->postJson('/api/v1/rooms/join', [
            'code'  => $room->code,
            'alias' => 'Dani',
        ]);

        $resp->assertStatus(201)
             ->assertJsonPath('participant.role', 'student');
    }

    public function test_host_joins_as_teacher_host_role(): void
    {
        ['teacher' => $teacher, 'room' => $room] = $this->makeRoom('lobby');

        $resp = $this->actingAs($teacher)->postJson('/api/v1/rooms/join', [
            'code'  => $room->code,
        ]);

        $resp->assertStatus(201)
             ->assertJsonPath('participant.role', 'teacher_host');
    }

    public function test_rejoining_returns_existing_participant(): void
    {
        ['room' => $room] = $this->makeRoom('lobby');
        $student = User::factory()->create();

        // First join
        $this->actingAs($student)->postJson('/api/v1/rooms/join', ['code' => $room->code]);

        // Second join — should return existing participant, not create new
        $resp = $this->actingAs($student)->postJson('/api/v1/rooms/join', ['code' => $room->code]);

        $resp->assertOk(); // 200 not 201 on rejoin
        $this->assertDatabaseCount('participants', 1);
    }

    // ── Error cases ────────────────────────────────────────────────────────────

    public function test_join_with_wrong_code_returns_404(): void
    {
        $this->postJson('/api/v1/rooms/join', ['code' => 'ZZZZZZZZ'])
             ->assertStatus(404);
    }

    public function test_join_draft_room_returns_422(): void
    {
        ['room' => $room] = $this->makeRoom('draft');

        $this->postJson('/api/v1/rooms/join', ['code' => $room->code, 'alias' => 'Eko'])
             ->assertStatus(422);
    }

    public function test_join_ended_room_returns_422(): void
    {
        ['room' => $room] = $this->makeRoom('ended');

        $this->postJson('/api/v1/rooms/join', ['code' => $room->code, 'alias' => 'Fani'])
             ->assertStatus(422);
    }

    public function test_join_validates_code_required(): void
    {
        $this->postJson('/api/v1/rooms/join', ['alias' => 'Gina'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['code']);
    }

    public function test_join_validates_code_must_be_8_chars(): void
    {
        $this->postJson('/api/v1/rooms/join', ['code' => 'ABC'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['code']);
    }

    public function test_join_validates_alias_max_60_chars(): void
    {
        ['room' => $room] = $this->makeRoom('lobby');

        $this->postJson('/api/v1/rooms/join', [
            'code'  => $room->code,
            'alias' => str_repeat('X', 61),
        ])->assertStatus(422)->assertJsonValidationErrors(['alias']);
    }

    // ── Live room ──────────────────────────────────────────────────────────────

    public function test_guest_can_join_live_room(): void
    {
        ['room' => $room] = $this->makeRoom('live');

        $this->postJson('/api/v1/rooms/join', ['code' => $room->code, 'alias' => 'Hani'])
             ->assertStatus(201);
    }
}
