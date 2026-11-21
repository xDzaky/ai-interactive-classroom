<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Participant;
use App\Models\Room;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChannelAuthTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;
    private Room $room;
    private Participant $hostParticipant;
    private Participant $studentParticipant;
    private string $hostToken;
    private string $studentToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $school        = School::factory()->create();
        $classroom     = Classroom::factory()->create(['school_id' => $school->id]);

        $this->room = Room::factory()->create([
            'classroom_id' => $classroom->id,
            'host_id'      => $this->teacher->id,
            'status'       => 'lobby',
        ]);

        // Host participant (authenticated user)
        $this->hostToken       = $this->makeToken('host-part-uuid');
        $this->hostParticipant = Participant::factory()->create([
            'id'         => 'host-part-uuid',
            'room_id'    => $this->room->id,
            'user_id'    => $this->teacher->id,
            'role'       => 'teacher_host',
            'token_hash' => hash('sha256', $this->hostToken),
            'left_at'    => null,
        ]);

        // Student participant (guest, no user_id)
        $this->studentToken       = $this->makeToken('student-part-uuid');
        $this->studentParticipant = Participant::factory()->create([
            'id'         => 'student-part-uuid',
            'room_id'    => $this->room->id,
            'user_id'    => null,
            'role'       => 'guest_student',
            'alias'      => 'Budi',
            'token_hash' => hash('sha256', $this->studentToken),
            'left_at'    => null,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Generate a participant token (same format as RoomController::generateParticipantToken)
     */
    private function makeToken(string $participantId): string
    {
        $appKey  = config('app.key');
        $payload = base64_encode($participantId);
        $sig     = hash_hmac('sha256', $participantId, $appKey);

        return $payload . '.' . $sig;
    }

    /**
     * Post to broadcasting/auth simulating Pusher JS client.
     */
    private function broadcastAuth(string $channelName, ?string $participantToken = null, ?User $user = null): \Illuminate\Testing\TestResponse
    {
        $headers = ['X-Requested-With' => 'XMLHttpRequest'];

        if ($participantToken) {
            $headers['Authorization'] = 'Participant ' . $participantToken;
        }

        $request = $this->withHeaders($headers);
        if ($user) {
            $request = $request->actingAs($user, 'sanctum');
        }

        return $request->post('/broadcasting/auth', [
            'socket_id'    => '1234.5678',
            'channel_name' => $channelName,
        ]);
    }

    // ── room.{roomId} ─────────────────────────────────────────────────────────

    public function test_room_channel_allows_host_via_participant_token(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}", $this->hostToken);
        $response->assertStatus(200);
    }

    public function test_room_channel_allows_student_via_participant_token(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}", $this->studentToken);
        $response->assertStatus(200);
    }

    public function test_room_channel_allows_authenticated_user_participant(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}", null, $this->teacher);
        $response->assertStatus(200);
    }

    public function test_room_channel_denies_invalid_token(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}", 'invalid.token');
        $response->assertStatus(403);
    }

    public function test_room_channel_denies_unauthenticated(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}");
        $response->assertStatus(403);
    }

    public function test_room_channel_denies_wrong_room(): void
    {
        $otherRoom = Room::factory()->create([
            'classroom_id' => $this->room->classroom_id,
            'host_id'      => $this->teacher->id,
            'status'       => 'lobby',
        ]);
        $response = $this->broadcastAuth("private-room.{$otherRoom->id}", $this->studentToken);
        $response->assertStatus(403);
    }
    public function test_room_channel_denies_left_participant(): void
    {
        $this->studentParticipant->update(['left_at' => now()]);
        $response = $this->broadcastAuth("private-room.{$this->room->id}", $this->studentToken);
        $response->assertStatus(403);
    }

    // ── room.{roomId}.host ────────────────────────────────────────────────────

    public function test_host_channel_allows_host_via_participant_token(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}.host", $this->hostToken);
        $response->assertStatus(200);
    }

    public function test_host_channel_denies_student_via_participant_token(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}.host", $this->studentToken);
        $response->assertStatus(403);
    }

    public function test_host_channel_allows_authenticated_host_user(): void
    {
        $response = $this->broadcastAuth("private-room.{$this->room->id}.host", null, $this->teacher);
        $response->assertStatus(200);
    }

    public function test_host_channel_denies_authenticated_non_host(): void
    {
        $otherUser = User::factory()->create();
        // Other user has no participant record → denied
        $response = $this->broadcastAuth("private-room.{$this->room->id}.host", null, $otherUser);
        $response->assertStatus(403);
    }

    // ── presence-room.{roomId} ───────────────────────────────────────────────

    public function test_presence_channel_allows_host_via_participant_token(): void
    {
        $response = $this->broadcastAuth("presence-room.{$this->room->id}", $this->hostToken);
        $response->assertStatus(200);
        // Presence auth returns Pusher HMAC signature with 'auth' key
        $response->assertJsonStructure(['auth']);
    }

    public function test_presence_channel_allows_student_via_participant_token(): void
    {
        $response = $this->broadcastAuth("presence-room.{$this->room->id}", $this->studentToken);
        $response->assertStatus(200);
        // Presence auth returns Pusher HMAC with auth + channel_data keys
        $response->assertJsonStructure(['auth']);
        // Verify user info is encoded in response content
        $this->assertStringContainsString('Budi', $response->getContent());
        $this->assertStringContainsString('student-part-uuid', $response->getContent());
    }

    public function test_presence_channel_denies_invalid_token(): void
    {
        $response = $this->broadcastAuth("presence-room.{$this->room->id}", 'bad.token');
        $response->assertStatus(403);
    }
}
