<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Participant;
use App\Models\PresenterRequest;
use App\Models\Room;
use App\Models\RoomDevice;
use App\Models\RoomPermission;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * P05-T07: Ending a room cascades revocation to participants, presenter_requests,
 * room_permissions, and room_devices (FR-016).
 */
class EndRoomCascadeTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeHostWithRoom(): array
    {
        $host     = User::factory()->create(['role' => 'teacher']);
        $school   = School::factory()->create();
        SchoolMembership::create([
            'school_id' => $school->id,
            'user_id'   => $host->id,
            'role'      => 'teacher',
        ]);
        $classroom = Classroom::factory()->create([
            'school_id'  => $school->id,
            'teacher_id' => $host->id,
        ]);
        $room = Room::create([
            'id'           => Str::uuid()->toString(),
            'classroom_id' => $classroom->id,
            'host_id'      => $host->id,
            'code'         => strtoupper(Str::random(8)),
            'status'       => 'live',
            'mode'         => 'projector',
        ]);
        return compact('host', 'room');
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_ending_room_marks_active_participants_as_left(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        // 3 active participants
        Participant::factory()->count(3)->create([
            'room_id' => $room->id,
            'left_at' => null,
        ]);
        // 1 already-left participant — should be untouched
        Participant::factory()->create([
            'room_id' => $room->id,
            'left_at' => now()->subMinutes(5),
        ]);

        $this->actingAs($host)
            ->postJson("/api/v1/rooms/{$room->id}/end")
            ->assertOk();

        $this->assertSame(
            0,
            Participant::where('room_id', $room->id)->whereNull('left_at')->count(),
        );
        // 4 total (3 just set + 1 already set)
        $this->assertSame(
            4,
            Participant::where('room_id', $room->id)->whereNotNull('left_at')->count(),
        );
    }

    public function test_ending_room_revokes_active_presenter_requests(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $participant = Participant::factory()->create(['room_id' => $room->id]);

        foreach (['requested', 'approved', 'active'] as $status) {
            PresenterRequest::factory()->create([
                'room_id'        => $room->id,
                'participant_id' => $participant->id,
                'status'         => $status,
            ]);
        }
        // Already expired — should stay expired
        PresenterRequest::factory()->create([
            'room_id'        => $room->id,
            'participant_id' => $participant->id,
            'status'         => 'expired',
        ]);

        $this->actingAs($host)
            ->postJson("/api/v1/rooms/{$room->id}/end")
            ->assertOk();

        $this->assertSame(
            3,
            PresenterRequest::where('room_id', $room->id)->where('status', 'revoked')->count(),
        );
        $this->assertSame(
            1,
            PresenterRequest::where('room_id', $room->id)->where('status', 'expired')->count(),
        );
    }

    public function test_ending_room_revokes_active_room_permissions(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $participant = Participant::factory()->create(['room_id' => $room->id]);

        RoomPermission::factory()->count(2)->create([
            'room_id'        => $room->id,
            'participant_id' => $participant->id,
            'revoked_at'     => null,
        ]);
        // Already revoked
        RoomPermission::factory()->create([
            'room_id'        => $room->id,
            'participant_id' => $participant->id,
            'revoked_at'     => now()->subMinutes(10),
        ]);

        $this->actingAs($host)
            ->postJson("/api/v1/rooms/{$room->id}/end")
            ->assertOk();

        $this->assertSame(
            0,
            RoomPermission::where('room_id', $room->id)->whereNull('revoked_at')->count(),
        );
    }

    public function test_ending_room_revokes_paired_devices(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        RoomDevice::factory()->count(2)->create([
            'room_id'    => $room->id,
            'revoked_at' => null,
        ]);
        // Already revoked device
        RoomDevice::factory()->create([
            'room_id'    => $room->id,
            'revoked_at' => now()->subMinutes(5),
        ]);

        $this->actingAs($host)
            ->postJson("/api/v1/rooms/{$room->id}/end")
            ->assertOk();

        $this->assertSame(
            0,
            RoomDevice::where('room_id', $room->id)->whereNull('revoked_at')->count(),
        );
    }

    public function test_ending_already_ended_room_returns_422(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $room->update(['status' => 'ended', 'ends_at' => now()]);

        $this->actingAs($host)
            ->postJson("/api/v1/rooms/{$room->id}/end")
            ->assertStatus(422);
    }
}
