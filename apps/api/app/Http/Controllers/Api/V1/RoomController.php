<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Participant;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoomController extends Controller
{
    // ── POST /api/v1/rooms ──────────────────────────────────────────────────

    /**
     * Create a new room inside a classroom.
     * Body: { classroom_id, mode?, settings?, starts_at?, ends_at? }
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'classroom_id' => ['required', 'uuid', 'exists:classrooms,id'],
            'mode'         => ['sometimes', Rule::in(['projector', 'smart_display', 'mobile_host', 'group'])],
            'settings'     => ['sometimes', 'array'],
            'starts_at'    => ['sometimes', 'nullable', 'date'],
            'ends_at'      => ['sometimes', 'nullable', 'date', 'after:starts_at'],
        ]);

        $classroom = Classroom::findOrFail($data['classroom_id']);

        $this->authorize('create', [Room::class, $classroom]);

        $room = Room::create([
            'classroom_id' => $classroom->id,
            'host_id'      => $request->user()->id,
            'code'         => Room::generateCode(),
            'status'       => 'draft',
            'mode'         => $data['mode'] ?? 'projector',
            'settings'     => $data['settings'] ?? null,
            'starts_at'    => $data['starts_at'] ?? null,
            'ends_at'      => $data['ends_at'] ?? null,
        ]);

        $this->log($room->id, $request->user()->id, 'room.created');

        return response()->json(['data' => $room->load('host:id,name,email')], 201);
    }

    // ── GET /api/v1/rooms/{room} ────────────────────────────────────────────

    public function show(Request $request, Room $room): JsonResponse
    {
        $this->authorize('view', $room);

        return response()->json([
            'data' => $room->load('host:id,name,email', 'classroom:id,name,school_id'),
        ]);
    }

    // ── PATCH /api/v1/rooms/{room} ──────────────────────────────────────────

    /**
     * Update room settings / status transition.
     * Body: { status?, mode?, settings?, starts_at?, ends_at? }
     */
    public function update(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $data = $request->validate([
            'status'    => ['sometimes', Rule::in(['draft', 'scheduled', 'lobby', 'live', 'ended', 'archived'])],
            'mode'      => ['sometimes', Rule::in(['projector', 'smart_display', 'mobile_host', 'group'])],
            'settings'  => ['sometimes', 'array'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at'   => ['sometimes', 'nullable', 'date'],
        ]);

        // Validate status transition
        if (isset($data['status']) && $data['status'] !== $room->status) {
            if (!$room->canTransitionTo($data['status'])) {
                return response()->json([
                    'message' => "Cannot transition room from '{$room->status}' to '{$data['status']}'.",
                ], 422);
            }
        }

        $room->update($data);

        $this->log($room->id, $request->user()->id, 'room.updated', ['fields' => array_keys($data)]);

        return response()->json(['data' => $room->fresh()->load('host:id,name,email')]);
    }

    // ── POST /api/v1/rooms/{room}/end ───────────────────────────────────────

    public function end(Request $request, Room $room): JsonResponse
    {
        $this->authorize('end', $room);

        if ($room->isEnded()) {
            return response()->json(['message' => 'Room is already ended.'], 422);
        }

        $room->update(['status' => 'ended', 'ends_at' => now()]);

        $this->log($room->id, $request->user()->id, 'room.ended');

        return response()->json(['data' => $room->fresh()]);
    }

    // ── POST /api/v1/rooms/{room}/regenerate-code ───────────────────────────

    public function regenerateCode(Request $request, Room $room): JsonResponse
    {
        $this->authorize('regenerateCode', $room);

        $newCode = Room::generateCode();
        $room->update(['code' => $newCode]);

        $this->log($room->id, $request->user()->id, 'room.code_regenerated');

        return response()->json(['data' => ['code' => $room->code]]);
    }

    // ── POST /api/v1/rooms/join ─────────────────────────────────────────────

    /**
     * Join a room by code.
     * Authenticated users keep their identity; unauthenticated users are guests.
     * Body: { code, alias? }
     * Returns: { participant_token, participant: {...} }
     */
    public function join(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'  => ['required', 'string', 'size:8'],
            'alias' => ['sometimes', 'nullable', 'string', 'max:60'],
        ]);

        $room = Room::where('code', strtoupper($data['code']))->first();

        if (!$room) {
            return response()->json(['message' => 'Room not found.'], 404);
        }

        if (!in_array($room->status, ['lobby', 'live'], true)) {
            return response()->json([
                'message' => 'Room is not accepting participants right now.',
            ], 422);
        }

        $user = $request->user('sanctum');

        // Determine role and alias
        $isHost = $user && $user->id === $room->host_id;
        $role   = $isHost ? 'teacher_host' : ($user ? 'student' : 'guest_student');
        $alias  = $data['alias'] ?? ($user?->name ?? 'Guest-' . Str::upper(Str::random(4)));

        // If authenticated user is already in room, return existing participant
        if ($user) {
            $existing = Participant::where('room_id', $room->id)
                ->where('user_id', $user->id)
                ->whereNull('left_at')
                ->first();

            if ($existing) {
                $token = $this->generateParticipantToken($existing->id);
                return response()->json([
                    'participant_token' => $token,
                    'participant'       => $existing,
                ]);
            }
        }

        // Create participant
        $participantId = Str::uuid()->toString();
        $rawToken      = $this->generateParticipantToken($participantId);
        $tokenHash     = hash('sha256', $rawToken);

        $participant = Participant::create([
            'id'         => $participantId,
            'room_id'    => $room->id,
            'user_id'    => $user?->id,
            'alias'      => $alias,
            'role'       => $role,
            'token_hash' => $tokenHash,
            'joined_at'  => now(),
        ]);

        $this->log($room->id, $user?->id, 'participant.joined', ['alias' => $alias, 'role' => $role]);

        return response()->json([
            'participant_token' => $rawToken,
            'participant'       => $participant,
        ], 201);
    }

    /**
     * Generate a signed participant token.
     * Format: base64url(participantId) . '.' . HMAC-SHA256(participantId, APP_KEY)
     * Not a JWT — just a simple verifiable token stored hashed server-side.
     */
    private function generateParticipantToken(string $participantId): string
    {
        $appKey  = config('app.key');
        $payload = base64_encode($participantId);
        $sig     = hash_hmac('sha256', $participantId, $appKey);
        return $payload . '.' . $sig;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function log(string $roomId, ?string $actorId, string $action, array $metadata = []): void
    {
        AuditLog::create([
            'room_id'    => $roomId,
            'actor_id'   => $actorId,
            'action'     => $action,
            'metadata'   => $metadata ?: null,
            'created_at' => now(),
        ]);
    }
}
