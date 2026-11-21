<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityAnswer;
use App\Models\ActivityQuestion;
use App\Models\AuditLog;
use App\Models\Participant;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ActivityController — P06-T02
 *
 * Routes:
 *   GET    /rooms/{room}/activities                       → index   (all auth)
 *   POST   /rooms/{room}/activities                       → store   (host: Sanctum)
 *   GET    /rooms/{room}/activities/{activity}            → show    (all auth)
 *   PATCH  /rooms/{room}/activities/{activity}            → update  (host: status/start/stop)
 *   POST   /rooms/{room}/activities/{activity}/answers    → answer  (participant token)
 *   GET    /rooms/{room}/activities/{activity}/results    → results (host only)
 *
 * Security:
 *   - answer_key is NEVER included in responses to students.
 *   - results endpoint (with answer_key) requires Sanctum (host).
 */
class ActivityController extends Controller
{
    // ── GET /rooms/{room}/activities ─────────────────────────────────────────

    public function index(Request $request, Room $room): JsonResponse
    {
        $activities = Activity::where('room_id', $room->id)
            ->with('questions:id,activity_id,body,options,sort_order')
            ->orderBy('created_at')
            ->get(['id', 'room_id', 'lesson_session_id', 'type', 'title', 'config', 'status', 'created_at', 'updated_at']);

        return response()->json(['data' => $activities]);
    }

    // ── POST /rooms/{room}/activities ────────────────────────────────────────

    public function store(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $data = $request->validate([
            'type'              => ['required', 'in:poll,quiz,group_task'],
            'title'             => ['required', 'string', 'max:255'],
            'config'            => ['sometimes', 'nullable', 'array'],
            'lesson_session_id' => ['sometimes', 'nullable', 'uuid', 'exists:lesson_sessions,id'],
            'questions'         => ['sometimes', 'array', 'max:50'],
            'questions.*.body'       => ['required_with:questions', 'string'],
            'questions.*.options'    => ['sometimes', 'nullable', 'array'],
            'questions.*.answer_key' => ['sometimes', 'nullable', 'array'],
            'questions.*.sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $activity = Activity::create([
            'room_id'           => $room->id,
            'lesson_session_id' => $data['lesson_session_id'] ?? null,
            'type'              => $data['type'],
            'title'             => $data['title'],
            'config'            => $data['config'] ?? null,
            'status'            => 'draft',
        ]);

        // Create questions if provided
        foreach (($data['questions'] ?? []) as $i => $q) {
            ActivityQuestion::create([
                'activity_id' => $activity->id,
                'body'        => $q['body'],
                'options'     => $q['options'] ?? null,
                'answer_key'  => $q['answer_key'] ?? null,
                'sort_order'  => $q['sort_order'] ?? $i,
            ]);
        }

        $this->log($room->id, $request->user()->id, 'activity.created', ['activity_id' => $activity->id]);

        return response()->json([
            'data' => $activity->load('questions:id,activity_id,body,options,sort_order'),
        ], 201);
    }

    // ── GET /rooms/{room}/activities/{activity} ──────────────────────────────

    public function show(Request $request, Room $room, Activity $activity): JsonResponse
    {
        if ($activity->room_id !== $room->id) {
            return response()->json(['message' => 'Activity not found.'], 404);
        }

        return response()->json([
            'data' => $activity->load('questions:id,activity_id,body,options,sort_order'),
        ]);
    }

    // ── PATCH /rooms/{room}/activities/{activity} ────────────────────────────

    public function update(Request $request, Room $room, Activity $activity): JsonResponse
    {
        $this->authorize('update', $room);

        if ($activity->room_id !== $room->id) {
            return response()->json(['message' => 'Activity not found.'], 404);
        }

        $data = $request->validate([
            'status' => ['sometimes', 'in:draft,active,closed'],
            'title'  => ['sometimes', 'string', 'max:255'],
            'config' => ['sometimes', 'nullable', 'array'],
        ]);

        // Guard: can only open one active activity at a time per room
        if (($data['status'] ?? null) === 'active') {
            $alreadyActive = Activity::where('room_id', $room->id)
                ->where('status', 'active')
                ->where('id', '!=', $activity->id)
                ->exists();
            if ($alreadyActive) {
                return response()->json(['message' => 'Another activity is already active.'], 422);
            }
        }

        $activity->update($data);
        $this->log($room->id, $request->user()->id, 'activity.updated', [
            'activity_id' => $activity->id,
            'status'      => $activity->status,
        ]);

        return response()->json(['data' => $activity->fresh()]);
    }

    // ── POST /rooms/{room}/activities/{activity}/answers ─────────────────────

    /**
     * Student submits an answer. Requires participant token auth.
     * One answer per participant per question (upsert by unique constraint).
     */
    public function answer(Request $request, Room $room, Activity $activity): JsonResponse
    {
        if ($activity->room_id !== $room->id) {
            return response()->json(['message' => 'Activity not found.'], 404);
        }

        if ($activity->status !== 'active') {
            return response()->json(['message' => 'Activity is not accepting answers.'], 422);
        }

        // Participant is set by ParticipantTokenGuard
        $participant = $request->attributes->get('participant');
        if (! $participant) {
            return response()->json(['message' => 'Participant authentication required.'], 401);
        }

        $data = $request->validate([
            'question_id' => ['required', 'uuid', 'exists:activity_questions,id'],
            'response'    => ['required', 'array'],
        ]);

        // Verify the question belongs to this activity
        $question = ActivityQuestion::where('id', $data['question_id'])
            ->where('activity_id', $activity->id)
            ->first();
        if (! $question) {
            return response()->json(['message' => 'Question not found in this activity.'], 404);
        }

        // Upsert — one answer per participant per question
        $answer = ActivityAnswer::updateOrCreate(
            [
                'question_id'    => $question->id,
                'participant_id' => $participant->id,
            ],
            [
                'activity_id'  => $activity->id,
                'response'     => $data['response'],
                'submitted_at' => now(),
            ],
        );

        return response()->json(['data' => $answer], $answer->wasRecentlyCreated ? 201 : 200);
    }

    // ── GET /rooms/{room}/activities/{activity}/results ───────────────────────

    /**
     * Host-only: returns answers with the answer_key included for each question.
     * Requires Sanctum auth (not participant token).
     */
    public function results(Request $request, Room $room, Activity $activity): JsonResponse
    {
        $this->authorize('update', $room);

        if ($activity->room_id !== $room->id) {
            return response()->json(['message' => 'Activity not found.'], 404);
        }

        // Questions with answer_key (host sees everything)
        $questions = $activity->questions()
            ->with(['answers:id,question_id,participant_id,response,submitted_at'])
            ->get(['id', 'activity_id', 'body', 'options', 'answer_key', 'sort_order']);

        return response()->json([
            'data' => [
                'activity'  => $activity->only(['id', 'type', 'title', 'status']),
                'questions' => $questions,
            ],
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function log(string $roomId, string $userId, string $action, array $meta = []): void
    {
        AuditLog::create([
            'room_id' => $roomId,
            'user_id' => $userId,
            'action'  => $action,
            'meta'    => $meta,
        ]);
    }
}
