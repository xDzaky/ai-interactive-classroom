<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Participant;
use App\Models\PresenterRequest;
use App\Models\Room;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * P05-T02: PresenterRequest CRUD — POST/GET/PATCH/DELETE /rooms/{room}/presenter-requests
 */
class PresenterRequestTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeRoom(): array
    {
        $teacher   = User::factory()->create(['role' => 'teacher']);
        $school    = School::factory()->create();
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
            'code'         => 'PRES01',
            'status'       => 'live',
            'mode'         => 'projector',
        ]);
        return compact('teacher', 'room');
    }

    private function makeToken(string $participantId): string
    {
        $appKey  = config('app.key');
        $payload = base64_encode($participantId);
        $sig     = hash_hmac('sha256', $participantId, $appKey);
        return $payload . '.' . $sig;
    }

    private function createParticipant(Room $room, string $alias, string $role, ?User $user = null): array
    {
        $pid = Str::uuid()->toString();
        $raw = $this->makeToken($pid);
        $p   = Participant::create([
            'id'         => $pid,
            'room_id'    => $room->id,
            'user_id'    => $user?->id,
            'alias'      => $alias,
            'role'       => $role,
            'token_hash' => hash('sha256', $raw),
            'joined_at'  => now(),
        ]);
        return ['participant' => $p, 'token' => $raw];
    }

    // ── POST /presenter-requests ─────────────────────────────────────────────

    public function test_student_can_raise_hand(): void
    {
        ['room' => $room] = $this->makeRoom();
        ['participant' => $student, 'token' => $tok] = $this->createParticipant($room, 'Alice', 'student');

        $res = $this->postJson("/api/v1/rooms/{$room->id}/presenter-requests", ['scope' => 'draw_only'], [
            'Authorization' => "Participant {$tok}",
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.status', 'requested')
            ->assertJsonPath('data.scope', 'draw_only');

        $this->assertDatabaseHas('presenter_requests', [
            'room_id'        => $room->id,
            'participant_id' => $student->id,
            'status'         => 'requested',
        ]);
    }

    public function test_teacher_cannot_raise_hand(): void
    {
        ['teacher' => $teacher, 'room' => $room] = $this->makeRoom();
        ['token' => $tok] = $this->createParticipant($room, 'T', 'teacher_host', $teacher);

        $res = $this->postJson("/api/v1/rooms/{$room->id}/presenter-requests", [], [
            'Authorization' => "Participant {$tok}",
        ]);

        $res->assertStatus(403);
    }

    public function test_duplicate_request_returns_409(): void
    {
        ['room' => $room] = $this->makeRoom();
        ['participant' => $student, 'token' => $tok] = $this->createParticipant($room, 'Bob', 'student');

        // First request
        $this->postJson("/api/v1/rooms/{$room->id}/presenter-requests", [], [
            'Authorization' => "Participant {$tok}",
        ])->assertStatus(201);

        // Duplicate
        $this->postJson("/api/v1/rooms/{$room->id}/presenter-requests", [], [
            'Authorization' => "Participant {$tok}",
        ])->assertStatus(409);
    }

    // ── GET /presenter-requests ──────────────────────────────────────────────

    public function test_host_sees_all_requests(): void
    {
        ['room' => $room] = $this->makeRoom();
        ['participant' => $host, 'token' => $hostTok] = $this->createParticipant($room, 'Host', 'teacher_host');
        ['token' => $sTok] = $this->createParticipant($room, 'Student', 'student');

        $this->postJson("/api/v1/rooms/{$room->id}/presenter-requests", [], [
            'Authorization' => "Participant {$sTok}",
        ])->assertStatus(201);

        $res = $this->getJson("/api/v1/rooms/{$room->id}/presenter-requests", [
            'Authorization' => "Participant {$hostTok}",
        ]);

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_student_sees_only_own_request(): void
    {
        ['room' => $room] = $this->makeRoom();
        ['token' => $sTok] = $this->createParticipant($room, 'Student', 'student');

        $this->postJson("/api/v1/rooms/{$room->id}/presenter-requests", [], [
            'Authorization' => "Participant {$sTok}",
        ])->assertStatus(201);

        $res = $this->getJson("/api/v1/rooms/{$room->id}/presenter-requests", [
            'Authorization' => "Participant {$sTok}",
        ]);

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    // ── PATCH /presenter-requests/{id} ───────────────────────────────────────

    public function test_host_can_approve_request(): void
    {
        ['room' => $room] = $this->makeRoom();
        ['participant' => $host, 'token' => $hostTok] = $this->createParticipant($room, 'Host', 'teacher_host');
        ['participant' => $student, 'token' => $sTok] = $this->createParticipant($room, 'Student', 'student');

        $pr = PresenterRequest::create([
            'room_id'        => $room->id,
            'participant_id' => $student->id,
            'status'         => 'requested',
            'scope'          => 'draw_only',
        ]);

        $res = $this->patchJson(
            "/api/v1/rooms/{$room->id}/presenter-requests/{$pr->id}",
            ['status' => 'approved'],
            ['Authorization' => "Participant {$hostTok}"]
        );

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('presenter_requests', ['id' => $pr->id, 'status' => 'approved']);
    }

    public function test_student_cannot_approve_request(): void
    {
        ['room' => $room] = $this->makeRoom();
        ['participant' => $student, 'token' => $sTok] = $this->createParticipant($room, 'Student', 'student');

        $pr = PresenterRequest::create([
            'room_id'        => $room->id,
            'participant_id' => $student->id,
            'status'         => 'requested',
            'scope'          => 'draw_only',
        ]);

        $this->patchJson(
            "/api/v1/rooms/{$room->id}/presenter-requests/{$pr->id}",
            ['status' => 'approved'],
            ['Authorization' => "Participant {$sTok}"]
        )->assertStatus(403);
    }

    // ── DELETE /presenter-requests/{id} ──────────────────────────────────────

    public function test_student_can_delete_own_request(): void
    {
        ['room' => $room] = $this->makeRoom();
        ['participant' => $student, 'token' => $sTok] = $this->createParticipant($room, 'Student', 'student');

        $pr = PresenterRequest::create([
            'room_id'        => $room->id,
            'participant_id' => $student->id,
            'status'         => 'requested',
            'scope'          => 'draw_only',
        ]);

        $this->deleteJson(
            "/api/v1/rooms/{$room->id}/presenter-requests/{$pr->id}",
            [],
            ['Authorization' => "Participant {$sTok}"]
        )->assertStatus(204);

        $this->assertDatabaseHas('presenter_requests', ['id' => $pr->id, 'status' => 'revoked']);
    }
}
