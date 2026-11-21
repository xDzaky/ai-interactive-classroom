<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Participant;
use App\Models\Room;
use App\Models\RoomEvent;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomEventTest extends TestCase
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
            'status'       => 'live',
        ]);

        $this->hostToken       = $this->makeToken('host-p-uuid');
        $this->hostParticipant = Participant::factory()->create([
            'id'         => 'host-p-uuid',
            'room_id'    => $this->room->id,
            'user_id'    => $this->teacher->id,
            'role'       => 'teacher_host',
            'token_hash' => hash('sha256', $this->hostToken),
        ]);

        $this->studentToken       = $this->makeToken('student-p-uuid');
        $this->studentParticipant = Participant::factory()->create([
            'id'         => 'student-p-uuid',
            'room_id'    => $this->room->id,
            'user_id'    => null,
            'role'       => 'guest_student',
            'alias'      => 'Ani',
            'token_hash' => hash('sha256', $this->studentToken),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeToken(string $participantId): string
    {
        $appKey  = config('app.key');
        $payload = base64_encode($participantId);
        $sig     = hash_hmac('sha256', $participantId, $appKey);

        return $payload . '.' . $sig;
    }

    private function postEvent(array $body, ?string $token = null, ?User $user = null): \Illuminate\Testing\TestResponse
    {
        $headers = ['Accept' => 'application/json'];
        if ($token) {
            $headers['Authorization'] = 'Participant ' . $token;
        }

        $req = $this->withHeaders($headers);
        if ($user) {
            $req = $req->actingAs($user, 'sanctum');
        }

        return $req->postJson("/api/v1/rooms/{$this->room->id}/events", $body);
    }

    private function getEvents(int $after = 0, ?string $token = null): \Illuminate\Testing\TestResponse
    {
        $headers = ['Accept' => 'application/json'];
        if ($token) {
            $headers['Authorization'] = 'Participant ' . $token;
        }

        return $this->withHeaders($headers)
            ->getJson("/api/v1/rooms/{$this->room->id}/events?after={$after}");
    }

    // ── POST /rooms/{room}/events ─────────────────────────────────────────────

    public function test_participant_can_ingest_event(): void
    {
        $response = $this->postEvent([
            'event_type' => 'stroke.committed',
            'payload'    => ['id' => 'stroke-1', 'points' => [[0, 0, 1]], 'color' => '#000', 'width' => 2, 'tool' => 'pen'],
        ], $this->studentToken);

        $response->assertStatus(201);
        $response->assertJsonStructure(['id', 'seq', 'event_type', 'payload', 'actor_id', 'committed_at']);
        $this->assertEquals('stroke.committed', $response->json('event_type'));
        $this->assertEquals(1, $response->json('seq'));
        $this->assertEquals('student-p-uuid', $response->json('actor_id'));
    }

    public function test_host_can_ingest_event_via_sanctum(): void
    {
        $response = $this->postEvent([
            'event_type' => 'scene.changed',
            'payload'    => ['scene_id' => 'scene-1'],
        ], null, $this->teacher);

        $response->assertStatus(201);
        $this->assertEquals('scene.changed', $response->json('event_type'));
    }

    public function test_seq_increments_per_room(): void
    {
        $this->postEvent(['event_type' => 'stroke.committed', 'payload' => ['id' => 's1']], $this->studentToken);
        $this->postEvent(['event_type' => 'object.created', 'payload' => ['id' => 'o1', 'object_type' => 'rect', 'props' => []]], $this->studentToken);
        $r3 = $this->postEvent(['event_type' => 'object.deleted', 'payload' => ['id' => 'o1']], $this->studentToken);

        $r3->assertStatus(201);
        $this->assertEquals(3, $r3->json('seq'));
    }

    public function test_idempotency_key_returns_same_event(): void
    {
        $body = [
            'event_type'      => 'stroke.committed',
            'payload'         => ['id' => 'stroke-idempotent'],
            'idempotency_key' => 'idem-key-abc123',
        ];

        $r1 = $this->postEvent($body, $this->studentToken);
        $r2 = $this->postEvent($body, $this->studentToken);

        $r1->assertStatus(201);
        $r2->assertStatus(200);
        // Same id and seq returned on duplicate
        $this->assertEquals($r1->json('id'), $r2->json('id'));
        $this->assertEquals($r1->json('seq'), $r2->json('seq'));
        // Only one DB row
        $this->assertEquals(1, RoomEvent::where('room_id', $this->room->id)->count());
    }

    public function test_invalid_event_type_rejected(): void
    {
        $response = $this->postEvent([
            'event_type' => 'malicious.event',
            'payload'    => ['data' => 'bad'],
        ], $this->studentToken);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_request_rejected(): void
    {
        $response = $this->postJson("/api/v1/rooms/{$this->room->id}/events", [
            'event_type' => 'stroke.committed',
            'payload'    => ['id' => 'x'],
        ]);

        $response->assertStatus(403);
    }

    public function test_participant_from_different_room_rejected(): void
    {
        $otherRoom        = Room::factory()->create([
            'classroom_id' => $this->room->classroom_id,
            'host_id'      => $this->teacher->id,
            'status'       => 'live',
        ]);
        $otherToken       = $this->makeToken('other-part-uuid');
        $otherParticipant = Participant::factory()->create([
            'id'         => 'other-part-uuid',
            'room_id'    => $otherRoom->id,
            'user_id'    => null,
            'token_hash' => hash('sha256', $otherToken),
        ]);

        $response = $this->postEvent([
            'event_type' => 'stroke.committed',
            'payload'    => ['id' => 'x'],
        ], $otherToken);

        $response->assertStatus(403);
    }

    public function test_ephemeral_event_not_persisted(): void
    {
        $response = $this->postEvent([
            'event_type' => 'device.pointer.moved',
            'payload'    => ['x' => 100, 'y' => 200],
        ], $this->studentToken);

        $response->assertStatus(200);
        $response->assertJson(['ephemeral' => true]);
        $this->assertEquals(0, RoomEvent::where('room_id', $this->room->id)->count());
    }

    // ── GET /rooms/{room}/events ──────────────────────────────────────────────

    public function test_participant_can_fetch_events(): void
    {
        $this->postEvent(['event_type' => 'stroke.committed', 'payload' => ['id' => 's1']], $this->studentToken);
        $this->postEvent(['event_type' => 'stroke.committed', 'payload' => ['id' => 's2']], $this->studentToken);

        $response = $this->getEvents(0, $this->studentToken);

        $response->assertStatus(200);
        $response->assertJsonStructure(['events', 'next_seq']);
        $this->assertCount(2, $response->json('events'));
        $this->assertEquals(2, $response->json('next_seq'));
    }

    public function test_events_fetched_after_given_seq(): void
    {
        $this->postEvent(['event_type' => 'stroke.committed', 'payload' => ['id' => 's1']], $this->studentToken);
        $this->postEvent(['event_type' => 'stroke.committed', 'payload' => ['id' => 's2']], $this->studentToken);
        $this->postEvent(['event_type' => 'stroke.committed', 'payload' => ['id' => 's3']], $this->studentToken);

        $response = $this->getEvents(1, $this->studentToken);

        $response->assertStatus(200);
        $this->assertCount(2, $response->json('events'));
        $this->assertEquals(2, $response->json('events.0.seq'));
    }

    public function test_events_fetch_unauthenticated_rejected(): void
    {
        $response = $this->getJson("/api/v1/rooms/{$this->room->id}/events");
        $response->assertStatus(403);
    }
}
