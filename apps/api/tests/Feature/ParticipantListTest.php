<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Participant;
use App\Models\Room;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * P04-T09: Participant list endpoints — GET /participants, GET /participants/me
 */
class ParticipantListTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeTeacherWithRoom(): array
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
        $room = Room::create([
            'id'           => Str::uuid()->toString(),
            'classroom_id' => $classroom->id,
            'host_id'      => $teacher->id,
            'code'         => 'ABCD12',
            'status'       => 'live',
            'mode'         => 'projector',
        ]);
        return compact('teacher', 'room');
    }

    private function makeParticipantToken(string $participantId): string
    {
        $appKey  = config('app.key');
        $payload = base64_encode($participantId);
        $sig     = hash_hmac('sha256', $participantId, $appKey);
        return $payload . '.' . $sig;
    }

    private function createParticipant(Room $room, string $alias, string $role, ?User $user = null): array
    {
        $pid = Str::uuid()->toString();
        $raw = $this->makeParticipantToken($pid);
        $p   = Participant::create([
            'id'         => $pid,
            'room_id'    => $room->id,
            'user_id'    => $user?->id,
            'alias'      => $alias,
            'role'       => $role,
            'token_hash' => hash('sha256', $raw),
        ]);
        return ['participant' => $p, 'token' => $raw];
    }

    // ── GET /rooms/{room}/participants ────────────────────────────────────────

    public function test_host_can_list_participants(): void
    {
        ['teacher' => $teacher, 'room' => $room] = $this->makeTeacherWithRoom();
        $this->createParticipant($room, 'Alice', 'guest_student');
        $this->createParticipant($room, 'Bob',   'student');

        $response = $this->actingAs($teacher)
            ->getJson("/api/v1/rooms/{$room->id}/participants");

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.alias', 'Alice');
    }

    public function test_participant_token_can_list_participants(): void
    {
        ['room' => $room] = $this->makeTeacherWithRoom();
        ['token' => $token] = $this->createParticipant($room, 'Alice', 'guest_student');
        $this->createParticipant($room, 'Bob', 'student');

        $response = $this->withHeaders(['Authorization' => "Participant {$token}"])
            ->getJson("/api/v1/rooms/{$room->id}/participants");

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_unauthenticated_cannot_list_participants(): void
    {
        ['room' => $room] = $this->makeTeacherWithRoom();
        $this->getJson("/api/v1/rooms/{$room->id}/participants")
            ->assertStatus(403);
    }

    public function test_left_participants_are_excluded(): void
    {
        ['teacher' => $teacher, 'room' => $room] = $this->makeTeacherWithRoom();
        $this->createParticipant($room, 'Alice', 'guest_student');
        // Participant who already left
        $pid = Str::uuid()->toString();
        $raw = $this->makeParticipantToken($pid);
        Participant::create([
            'id'         => $pid,
            'room_id'    => $room->id,
            'user_id'    => null,
            'alias'      => 'Bob',
            'role'       => 'guest_student',
            'token_hash' => hash('sha256', $raw),
            'left_at'    => now(),
        ]);

        $response = $this->actingAs($teacher)
            ->getJson("/api/v1/rooms/{$room->id}/participants");

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    // ── GET /rooms/{room}/participants/me ─────────────────────────────────────

    public function test_participant_can_fetch_their_own_record(): void
    {
        ['room' => $room] = $this->makeTeacherWithRoom();
        ['participant' => $p, 'token' => $token] = $this->createParticipant($room, 'Alice', 'guest_student');

        $response = $this->withHeaders(['Authorization' => "Participant {$token}"])
            ->getJson("/api/v1/rooms/{$room->id}/participants/me");

        $response->assertOk()
            ->assertJsonPath('id', $p->id)
            ->assertJsonPath('role', 'guest_student');
    }

    public function test_host_can_fetch_their_own_participant_record(): void
    {
        ['teacher' => $teacher, 'room' => $room] = $this->makeTeacherWithRoom();
        $this->createParticipant($room, 'Teacher', 'teacher_host', $teacher);

        $response = $this->actingAs($teacher)
            ->getJson("/api/v1/rooms/{$room->id}/participants/me");

        $response->assertOk()
            ->assertJsonPath('role', 'teacher_host');
    }

    public function test_returns_403_when_not_a_participant(): void
    {
        ['room' => $room] = $this->makeTeacherWithRoom();
        $stranger = User::factory()->create();

        $this->actingAs($stranger)
            ->getJson("/api/v1/rooms/{$room->id}/participants/me")
            ->assertStatus(403);
    }
}
