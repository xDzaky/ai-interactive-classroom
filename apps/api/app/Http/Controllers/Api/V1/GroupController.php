<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\GroupMember;
use App\Models\GroupSubmission;
use App\Models\Participant;
use App\Models\Room;
use App\Models\RoomGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * GroupController — P06-T04
 *
 * Routes:
 *   GET    /rooms/{room}/groups                                     → index      (all auth)
 *   POST   /rooms/{room}/groups                                     → store      (host: Sanctum)
 *   DELETE /rooms/{room}/groups/{group}                             → destroy    (host: Sanctum)
 *   POST   /rooms/{room}/groups/{group}/members                     → addMember  (host: Sanctum)
 *   DELETE /rooms/{room}/groups/{group}/members/{participant}       → removeMember (host: Sanctum)
 *   POST   /rooms/{room}/groups/{group}/submissions                 → submit     (group leader: participant token)
 *   GET    /rooms/{room}/groups/{group}/submissions                 → submissions (host: Sanctum)
 *
 * Security:
 *   - Only host can create/delete groups and assign members.
 *   - Only the group leader (is_leader=true) can submit.
 *   - Submission list is host-only.
 */
class GroupController extends Controller
{
    // ── GET /rooms/{room}/groups ──────────────────────────────────────────────

    public function index(Request $request, Room $room): JsonResponse
    {
        $groups = RoomGroup::where('room_id', $room->id)
            ->with(['members:id,group_id,participant_id,is_leader'])
            ->orderBy('created_at')
            ->get(['id', 'room_id', 'name', 'whiteboard_id', 'created_at', 'updated_at']);

        return response()->json(['data' => $groups]);
    }

    // ── POST /rooms/{room}/groups ─────────────────────────────────────────────

    public function store(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:120'],
            'whiteboard_id' => ['sometimes', 'nullable', 'uuid', 'exists:whiteboards,id'],
        ]);

        $group = RoomGroup::create([
            'room_id'       => $room->id,
            'name'          => $data['name'],
            'whiteboard_id' => $data['whiteboard_id'] ?? null,
        ]);

        $this->log($room->id, $request->user()->id, 'group.created', ['group_id' => $group->id]);

        return response()->json(['data' => $group], 201);
    }

    // ── DELETE /rooms/{room}/groups/{group} ───────────────────────────────────

    public function destroy(Request $request, Room $room, RoomGroup $group): JsonResponse
    {
        $this->authorize('update', $room);

        if ($group->room_id !== $room->id) {
            return response()->json(['message' => 'Group not found.'], 404);
        }

        $this->log($room->id, $request->user()->id, 'group.deleted', ['group_id' => $group->id]);
        $group->delete();

        return response()->json(null, 204);
    }

    // ── POST /rooms/{room}/groups/{group}/members ─────────────────────────────

    public function addMember(Request $request, Room $room, RoomGroup $group): JsonResponse
    {
        $this->authorize('update', $room);

        if ($group->room_id !== $room->id) {
            return response()->json(['message' => 'Group not found.'], 404);
        }

        $data = $request->validate([
            'participant_id' => ['required', 'uuid', 'exists:participants,id'],
            'is_leader'      => ['sometimes', 'boolean'],
        ]);

        // Guard: participant must belong to this room
        $participant = Participant::where('id', $data['participant_id'])
            ->where('room_id', $room->id)
            ->first();

        if (! $participant) {
            return response()->json(['message' => 'Participant not in this room.'], 422);
        }

        // Upsert (participant may already be in the group — just update is_leader)
        $member = GroupMember::updateOrCreate(
            ['group_id' => $group->id, 'participant_id' => $data['participant_id']],
            ['is_leader' => $data['is_leader'] ?? false],
        );

        return response()->json(['data' => $member], 201);
    }

    // ── DELETE /rooms/{room}/groups/{group}/members/{participant} ─────────────

    public function removeMember(Request $request, Room $room, RoomGroup $group, Participant $participant): JsonResponse
    {
        $this->authorize('update', $room);

        if ($group->room_id !== $room->id) {
            return response()->json(['message' => 'Group not found.'], 404);
        }

        $deleted = GroupMember::where('group_id', $group->id)
            ->where('participant_id', $participant->id)
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Member not in group.'], 404);
        }

        return response()->json(null, 204);
    }

    // ── POST /rooms/{room}/groups/{group}/submissions ─────────────────────────

    /**
     * Group leader submits work for a group_task activity.
     * Requires participant token auth and is_leader = true.
     */
    public function submit(Request $request, Room $room, RoomGroup $group): JsonResponse
    {
        if ($group->room_id !== $room->id) {
            return response()->json(['message' => 'Group not found.'], 404);
        }

        // ParticipantTokenGuard sets the participant attribute
        $participant = $request->attributes->get('participant');
        if (! $participant) {
            return response()->json(['message' => 'Participant authentication required.'], 401);
        }

        // Only the leader may submit
        $isLeader = GroupMember::where('group_id', $group->id)
            ->where('participant_id', $participant->id)
            ->where('is_leader', true)
            ->exists();

        if (! $isLeader) {
            return response()->json(['message' => 'Only the group leader may submit.'], 403);
        }

        $data = $request->validate([
            'activity_id' => ['required', 'uuid', 'exists:activities,id'],
            'content'     => ['required', 'array'],
        ]);

        $submission = GroupSubmission::updateOrCreate(
            ['group_id' => $group->id, 'activity_id' => $data['activity_id']],
            [
                'content'      => $data['content'],
                'submitted_by' => $participant->id,
                'submitted_at' => now(),
            ],
        );

        return response()->json(['data' => $submission], 201);
    }

    // ── GET /rooms/{room}/groups/{group}/submissions ──────────────────────────

    public function submissions(Request $request, Room $room, RoomGroup $group): JsonResponse
    {
        $this->authorize('update', $room);

        if ($group->room_id !== $room->id) {
            return response()->json(['message' => 'Group not found.'], 404);
        }

        $submissions = GroupSubmission::where('group_id', $group->id)
            ->orderBy('submitted_at')
            ->get();

        return response()->json(['data' => $submissions]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function log(string $roomId, string $userId, string $action, array $context = []): void
    {
        AuditLog::create([
            'room_id' => $roomId,
            'user_id' => $userId,
            'action'  => $action,
            'context' => $context,
        ]);
    }
}
