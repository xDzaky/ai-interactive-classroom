<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Classroom;
use App\Models\GroupMember;
use App\Models\GroupSubmission;
use App\Models\Participant;
use App\Models\Room;
use App\Models\RoomGroup;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * P06-T04: Group workspace — CRUD, member assignment, leader submission.
 */
class GroupApiTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    /** Create a participant with a valid participant token */
    private function makeParticipantToken(Room $room, string $role = 'guest_student'): array
    {
        $participantId = Str::uuid()->toString();
        $rawToken      = base64_encode($participantId) . '.' . hash_hmac('sha256', $participantId, config('app.key'));
        $participant   = Participant::create([
            'id'         => $participantId,
            'room_id'    => $room->id,
            'alias'      => 'Tester',
            'role'       => $role,
            'token_hash' => hash('sha256', $rawToken),
            'joined_at'  => now(),
        ]);
        return compact('participant', 'rawToken');
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_host_can_create_group(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        $response = $this->actingAs($host)->postJson("/api/v1/rooms/{$room->id}/groups", [
            'name' => 'Team Alpha',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Team Alpha')
            ->assertJsonPath('data.room_id', $room->id);
    }

    public function test_host_can_list_groups(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        RoomGroup::create(['room_id' => $room->id, 'name' => 'Group 1']);
        RoomGroup::create(['room_id' => $room->id, 'name' => 'Group 2']);

        $response = $this->actingAs($host)->getJson("/api/v1/rooms/{$room->id}/groups");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    public function test_host_can_delete_group(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Team Beta']);

        $this->actingAs($host)->deleteJson("/api/v1/rooms/{$room->id}/groups/{$group->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('room_groups', ['id' => $group->id]);
    }

    public function test_host_can_add_member_to_group(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Group C']);
        ['participant' => $participant] = $this->makeParticipantToken($room);

        $response = $this->actingAs($host)->postJson(
            "/api/v1/rooms/{$room->id}/groups/{$group->id}/members",
            ['participant_id' => $participant->id, 'is_leader' => false],
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.group_id', $group->id)
            ->assertJsonPath('data.participant_id', $participant->id);
    }

    public function test_host_can_set_group_leader(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Group D']);
        ['participant' => $participant] = $this->makeParticipantToken($room);

        $this->actingAs($host)->postJson(
            "/api/v1/rooms/{$room->id}/groups/{$group->id}/members",
            ['participant_id' => $participant->id, 'is_leader' => true],
        )->assertStatus(201);

        $this->assertDatabaseHas('group_members', [
            'group_id'       => $group->id,
            'participant_id' => $participant->id,
            'is_leader'      => true,
        ]);
    }

    public function test_host_can_remove_member(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Group E']);
        ['participant' => $participant] = $this->makeParticipantToken($room);
        GroupMember::create(['group_id' => $group->id, 'participant_id' => $participant->id, 'is_leader' => false]);

        $this->actingAs($host)
            ->deleteJson("/api/v1/rooms/{$room->id}/groups/{$group->id}/members/{$participant->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('group_members', ['group_id' => $group->id, 'participant_id' => $participant->id]);
    }

    public function test_leader_can_submit_group_work(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Group F']);
        ['participant' => $participant, 'rawToken' => $rawToken] = $this->makeParticipantToken($room);
        GroupMember::create(['group_id' => $group->id, 'participant_id' => $participant->id, 'is_leader' => true]);

        // Create a group_task activity
        $activity = Activity::create([
            'room_id' => $room->id,
            'type'    => 'group_task',
            'title'   => 'Build a poster',
            'status'  => 'active',
        ]);

        $response = $this->withHeaders(['X-Participant-Token' => $rawToken])
            ->postJson("/api/v1/rooms/{$room->id}/groups/{$group->id}/submissions", [
                'activity_id' => $activity->id,
                'content'     => ['text' => 'Our final answer'],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.group_id', $group->id)
            ->assertJsonPath('data.activity_id', $activity->id);
    }

    public function test_non_leader_cannot_submit(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Group G']);
        ['participant' => $participant, 'rawToken' => $rawToken] = $this->makeParticipantToken($room);
        // is_leader = false
        GroupMember::create(['group_id' => $group->id, 'participant_id' => $participant->id, 'is_leader' => false]);

        $activity = Activity::create([
            'room_id' => $room->id,
            'type'    => 'group_task',
            'title'   => 'Build a poster',
            'status'  => 'active',
        ]);

        $this->withHeaders(['X-Participant-Token' => $rawToken])
            ->postJson("/api/v1/rooms/{$room->id}/groups/{$group->id}/submissions", [
                'activity_id' => $activity->id,
                'content'     => ['text' => 'Trying to submit'],
            ])
            ->assertStatus(403);
    }

    public function test_host_can_see_submissions(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Group H']);
        ['participant' => $participant] = $this->makeParticipantToken($room);
        $activity = Activity::create([
            'room_id' => $room->id,
            'type'    => 'group_task',
            'title'   => 'Build a poster',
            'status'  => 'closed',
        ]);
        GroupSubmission::create([
            'group_id'    => $group->id,
            'activity_id' => $activity->id,
            'content'     => ['text' => 'done'],
            'submitted_by' => $participant->id,
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($host)
            ->getJson("/api/v1/rooms/{$room->id}/groups/{$group->id}/submissions");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_participant_outside_room_cannot_be_added(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $group = RoomGroup::create(['room_id' => $room->id, 'name' => 'Group I']);

        // Create a participant in a DIFFERENT room
        ['room' => $otherRoom] = $this->makeHostWithRoom();
        ['participant' => $outsider] = $this->makeParticipantToken($otherRoom);

        $this->actingAs($host)->postJson(
            "/api/v1/rooms/{$room->id}/groups/{$group->id}/members",
            ['participant_id' => $outsider->id, 'is_leader' => false],
        )->assertStatus(422);
    }
}
