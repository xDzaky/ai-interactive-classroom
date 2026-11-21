<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Classroom;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    // ── POST /api/v1/rooms/join (stub — full impl in P04-T03) ───────────────

    public function join(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P04-T03'], 501);
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
