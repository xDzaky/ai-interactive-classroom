<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Room;
use App\Models\RoomSnapshot;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * P07-T01: Snapshot API tests.
 * - host can create snapshots
 * - list ordered by seq_at
 * - nearest endpoint returns closest at or before seq
 * - non-host cannot create
 * - upsert same seq_at
 */
class SnapshotApiTest extends TestCase
{
    use RefreshDatabase;

    private function makeHostWithRoom(string $status = 'live'): array
    {
        $host      = User::factory()->create(['role' => 'teacher']);
        $school    = School::factory()->create();
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $host->id, 'role' => 'teacher']);
        $classroom = Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $host->id]);
        $room      = Room::create([
            'id'           => Str::uuid()->toString(),
            'classroom_id' => $classroom->id,
            'host_id'      => $host->id,
            'code'         => strtoupper(Str::random(8)),
            'status'       => $status,
            'mode'         => 'projector',
        ]);
        return compact('host', 'room');
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_host_can_create_snapshot(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        $response = $this->actingAs($host)->postJson("/api/v1/rooms/{$room->id}/snapshots", [
            'seq_at' => 42,
            'state'  => ['objects' => [], 'version' => 1],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.room_id', $room->id)
            ->assertJsonPath('data.seq_at', 42);
    }

    public function test_host_can_list_snapshots(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        RoomSnapshot::create(['room_id' => $room->id, 'seq_at' => 10, 'state' => [], 'created_at' => now()]);
        RoomSnapshot::create(['room_id' => $room->id, 'seq_at' => 50, 'state' => [], 'created_at' => now()]);

        $response = $this->actingAs($host)->getJson("/api/v1/rooms/{$room->id}/snapshots");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
        // Should be ordered by seq_at ascending
        $this->assertEquals(10, $response->json('data.0.seq_at'));
        $this->assertEquals(50, $response->json('data.1.seq_at'));
    }

    public function test_nearest_returns_closest_snapshot_at_or_before_seq(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        RoomSnapshot::create(['room_id' => $room->id, 'seq_at' => 10, 'state' => ['v' => 10], 'created_at' => now()]);
        RoomSnapshot::create(['room_id' => $room->id, 'seq_at' => 30, 'state' => ['v' => 30], 'created_at' => now()]);
        RoomSnapshot::create(['room_id' => $room->id, 'seq_at' => 60, 'state' => ['v' => 60], 'created_at' => now()]);

        // seq=45 → nearest is seq_at=30
        $response = $this->actingAs($host)->getJson("/api/v1/rooms/{$room->id}/snapshots/nearest?seq=45");

        $response->assertStatus(200)
            ->assertJsonPath('data.seq_at', 30);
    }

    public function test_nearest_returns_null_when_no_snapshot_before_seq(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        RoomSnapshot::create(['room_id' => $room->id, 'seq_at' => 100, 'state' => [], 'created_at' => now()]);

        $response = $this->actingAs($host)->getJson("/api/v1/rooms/{$room->id}/snapshots/nearest?seq=5");

        $response->assertStatus(200)
            ->assertJsonPath('data', null);
    }

    public function test_non_host_cannot_create_snapshot(): void
    {
        ['room' => $room] = $this->makeHostWithRoom();
        $other = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($other)->postJson("/api/v1/rooms/{$room->id}/snapshots", [
            'seq_at' => 10,
            'state'  => ['objects' => []],
        ])->assertStatus(403);
    }

    public function test_upsert_same_seq_at_updates_state(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        $this->actingAs($host)->postJson("/api/v1/rooms/{$room->id}/snapshots", [
            'seq_at' => 20,
            'state'  => ['v' => 1],
        ])->assertStatus(201);

        // Post again at same seq_at with updated state
        $this->actingAs($host)->postJson("/api/v1/rooms/{$room->id}/snapshots", [
            'seq_at' => 20,
            'state'  => ['v' => 2],
        ])->assertStatus(201);

        // Only 1 row should exist
        $this->assertEquals(1, RoomSnapshot::where('room_id', $room->id)->where('seq_at', 20)->count());
        $this->assertEquals(2, RoomSnapshot::where('room_id', $room->id)->where('seq_at', 20)->value('state')['v']);
    }
}
