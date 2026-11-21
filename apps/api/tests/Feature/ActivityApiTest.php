<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityAnswer;
use App\Models\ActivityQuestion;
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
 * P06-T02: Poll/quiz API tests.
 * - create activity with questions
 * - start/stop activity (status transitions)
 * - student submits answer
 * - answer_key hidden from non-host
 * - results endpoint returns answer_key to host
 */
class ActivityApiTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function makeHostWithRoom(string $status = 'live'): array
    {
        $host    = User::factory()->create(['role' => 'teacher']);
        $school  = School::factory()->create();
        SchoolMembership::create(['school_id' => $school->id, 'user_id' => $host->id, 'role' => 'teacher']);
        $classroom = Classroom::factory()->create(['school_id' => $school->id, 'teacher_id' => $host->id]);
        $room = Room::create([
            'id'           => Str::uuid()->toString(),
            'classroom_id' => $classroom->id,
            'host_id'      => $host->id,
            'code'         => strtoupper(Str::random(8)),
            'status'       => $status,
            'mode'         => 'projector',
        ]);
        return compact('host', 'room');
    }

    /** Create a participant with a valid token for the ParticipantTokenGuard */
    private function makeParticipantToken(Room $room): array
    {
        $participantId = Str::uuid()->toString();
        $rawToken      = base64_encode($participantId) . '.' . hash_hmac('sha256', $participantId, config('app.key'));
        $participant   = Participant::create([
            'id'         => $participantId,
            'room_id'    => $room->id,
            'alias'      => 'Student A',
            'role'       => 'guest_student',
            'token_hash' => hash('sha256', $rawToken),
            'joined_at'  => now(),
        ]);
        return compact('participant', 'rawToken');
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    public function test_host_can_create_activity_with_questions(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        $response = $this->actingAs($host)->postJson("/api/v1/rooms/{$room->id}/activities", [
            'type'      => 'quiz',
            'title'     => 'Pop Quiz #1',
            'questions' => [
                ['body' => 'What is 2+2?', 'options' => ['3', '4', '5'], 'answer_key' => ['4'], 'sort_order' => 0],
                ['body' => 'Capital of Indonesia?', 'options' => ['Jakarta', 'Surabaya'], 'answer_key' => ['Jakarta'], 'sort_order' => 1],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.type', 'quiz')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonCount(2, 'data.questions');

        // answer_key must NOT appear in create response (host gets questions without answer_key on create)
        $this->assertArrayNotHasKey('answer_key', $response->json('data.questions.0'));
    }

    public function test_host_can_start_activity(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $activity = Activity::create([
            'room_id' => $room->id, 'type' => 'poll', 'title' => 'Poll A', 'status' => 'draft',
        ]);

        $this->actingAs($host)
            ->patchJson("/api/v1/rooms/{$room->id}/activities/{$activity->id}", ['status' => 'active'])
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_cannot_have_two_active_activities(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        Activity::create(['room_id' => $room->id, 'type' => 'poll', 'title' => 'A', 'status' => 'active']);
        $b = Activity::create(['room_id' => $room->id, 'type' => 'poll', 'title' => 'B', 'status' => 'draft']);

        $this->actingAs($host)
            ->patchJson("/api/v1/rooms/{$room->id}/activities/{$b->id}", ['status' => 'active'])
            ->assertStatus(422);
    }

    public function test_host_can_close_activity(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $activity = Activity::create([
            'room_id' => $room->id, 'type' => 'quiz', 'title' => 'Q', 'status' => 'active',
        ]);

        $this->actingAs($host)
            ->patchJson("/api/v1/rooms/{$room->id}/activities/{$activity->id}", ['status' => 'closed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'closed');
    }

    public function test_student_can_submit_answer(): void
    {
        ['room' => $room] = $this->makeHostWithRoom();
        $activity = Activity::create([
            'room_id' => $room->id, 'type' => 'poll', 'title' => 'P1', 'status' => 'active',
        ]);
        $question = ActivityQuestion::create([
            'activity_id' => $activity->id,
            'body'        => 'Favourite colour?',
            'options'     => ['Red', 'Blue'],
            'sort_order'  => 0,
        ]);
        ['rawToken' => $rawToken] = $this->makeParticipantToken($room);

        $this->withHeaders(['Authorization' => "Participant {$rawToken}"])
            ->postJson("/api/v1/rooms/{$room->id}/activities/{$activity->id}/answers", [
                'question_id' => $question->id,
                'response'    => ['Red'],
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('activity_answers', [
            'question_id' => $question->id,
            'response'    => json_encode(['Red']),
        ]);
    }

    public function test_student_cannot_answer_closed_activity(): void
    {
        ['room' => $room] = $this->makeHostWithRoom();
        $activity = Activity::create([
            'room_id' => $room->id, 'type' => 'poll', 'title' => 'P2', 'status' => 'closed',
        ]);
        $question = ActivityQuestion::create([
            'activity_id' => $activity->id, 'body' => 'Q?', 'sort_order' => 0,
        ]);
        ['rawToken' => $rawToken] = $this->makeParticipantToken($room);

        $this->withHeaders(['Authorization' => "Participant {$rawToken}"])
            ->postJson("/api/v1/rooms/{$room->id}/activities/{$activity->id}/answers", [
                'question_id' => $question->id,
                'response'    => ['Yes'],
            ])
            ->assertStatus(422);
    }

    public function test_results_includes_answer_key_for_host(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $activity = Activity::create([
            'room_id' => $room->id, 'type' => 'quiz', 'title' => 'QZ', 'status' => 'closed',
        ]);
        ActivityQuestion::create([
            'activity_id' => $activity->id,
            'body'        => 'Q?',
            'options'     => ['A', 'B'],
            'answer_key'  => ['A'],
            'sort_order'  => 0,
        ]);

        $response = $this->actingAs($host)
            ->getJson("/api/v1/rooms/{$room->id}/activities/{$activity->id}/results")
            ->assertOk();

        $this->assertArrayHasKey('answer_key', $response->json('data.questions.0'));
        $this->assertSame(['A'], $response->json('data.questions.0.answer_key'));
    }

    public function test_show_does_not_expose_answer_key(): void
    {
        ['room' => $room, 'host' => $host] = $this->makeHostWithRoom();
        $activity = Activity::create([
            'room_id' => $room->id, 'type' => 'quiz', 'title' => 'QZ2', 'status' => 'active',
        ]);
        ActivityQuestion::create([
            'activity_id' => $activity->id,
            'body'        => 'Q?',
            'answer_key'  => ['A'],
            'sort_order'  => 0,
        ]);

        $response = $this->actingAs($host)
            ->getJson("/api/v1/rooms/{$room->id}/activities/{$activity->id}")
            ->assertOk();

        // /show response uses questions select without answer_key
        $this->assertArrayNotHasKey('answer_key', $response->json('data.questions.0'));
    }

    public function test_index_lists_activities_for_room(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        Activity::create(['room_id' => $room->id, 'type' => 'poll', 'title' => 'A1', 'status' => 'draft']);
        Activity::create(['room_id' => $room->id, 'type' => 'quiz', 'title' => 'A2', 'status' => 'active']);

        $this->actingAs($host)
            ->getJson("/api/v1/rooms/{$room->id}/activities")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_non_host_cannot_create_activity(): void
    {
        ['room' => $room] = $this->makeHostWithRoom();
        $other = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($other)
            ->postJson("/api/v1/rooms/{$room->id}/activities", [
                'type'  => 'poll',
                'title' => 'Hacked',
            ])
            ->assertStatus(403);
    }
}
