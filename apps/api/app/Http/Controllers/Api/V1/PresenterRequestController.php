<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Participant;
use App\Models\PresenterRequest;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * PresenterRequestController — P05-T02
 *
 * Routes (all under ParticipantTokenGuard middleware):
 *   POST   /rooms/{room}/presenter-requests         — student raises hand
 *   GET    /rooms/{room}/presenter-requests         — host sees queue
 *   PATCH  /rooms/{room}/presenter-requests/{presenterRequest} — approve/reject
 *   DELETE /rooms/{room}/presenter-requests/{presenterRequest} — revoke
 *
 * Access rules:
 *   - student/guest_student: may POST (raise hand) + DELETE own request
 *   - teacher_host: may GET (all) + PATCH + DELETE any request
 *   - presenter: may GET own status
 */
class PresenterRequestController extends Controller
{
    // ── POST /rooms/{room}/presenter-requests ────────────────────────────────

    /**
     * Student raises hand to become presenter.
     */
    public function store(Request $request, Room $room): JsonResponse
    {
        $participant = $this->resolveParticipant($request, $room);

        if (!$participant) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        // Only students / guests may raise hand
        if (!in_array($participant->role, ['student', 'guest_student', 'presenter'])) {
            return response()->json(['message' => 'Only students may raise hand.'], 403);
        }

        if ($room->status !== 'live') {
            return response()->json(['message' => 'Room is not live.'], 422);
        }

        // Prevent duplicate pending request
        $existing = PresenterRequest::where('room_id', $room->id)
            ->where('participant_id', $participant->id)
            ->whereIn('status', ['requested', 'approved', 'active'])
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending or active request.',
                'data'    => $existing,
            ], 409);
        }

        $data = $request->validate([
            'scope' => ['sometimes', Rule::in(['draw_only', 'object_edit', 'full_board'])],
        ]);

        $pr = PresenterRequest::create([
            'room_id'        => $room->id,
            'participant_id' => $participant->id,
            'status'         => 'requested',
            'scope'          => $data['scope'] ?? 'draw_only',
        ]);

        $this->log($room->id, $participant->id, 'presenter_request.created', ['request_id' => $pr->id]);

        return response()->json(['data' => $pr->load('participant:id,alias,role')], 201);
    }

    // ── GET /rooms/{room}/presenter-requests ─────────────────────────────────

    /**
     * Host sees the full queue; presenter sees own request.
     */
    public function index(Request $request, Room $room): JsonResponse
    {
        $participant = $this->resolveParticipant($request, $room);

        if (!$participant) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if ($participant->role === 'teacher_host') {
            $requests = PresenterRequest::where('room_id', $room->id)
                ->with('participant:id,alias,role')
                ->orderBy('created_at')
                ->get();
        } else {
            // Students / presenters can only see their own request
            $requests = PresenterRequest::where('room_id', $room->id)
                ->where('participant_id', $participant->id)
                ->with('participant:id,alias,role')
                ->get();
        }

        return response()->json(['data' => $requests]);
    }

    // ── PATCH /rooms/{room}/presenter-requests/{presenterRequest} ────────────

    /**
     * Host approves or rejects a presenter request.
     * Body: { status: approved|revoked|expired, scope?: draw_only|object_edit|full_board }
     */
    public function update(Request $request, Room $room, PresenterRequest $presenterRequest): JsonResponse
    {
        $participant = $this->resolveParticipant($request, $room);

        if (!$participant || $participant->role !== 'teacher_host') {
            return response()->json(['message' => 'Only the host may approve requests.'], 403);
        }

        if ($presenterRequest->room_id !== $room->id) {
            return response()->json(['message' => 'Request does not belong to this room.'], 404);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'active', 'revoked', 'expired'])],
            'scope'  => ['sometimes', Rule::in(['draw_only', 'object_edit', 'full_board'])],
        ]);

        // Validate transition
        $allowed = [
            'requested' => ['approved', 'revoked'],
            'approved'  => ['active', 'revoked', 'expired'],
            'active'    => ['revoked', 'expired'],
        ];

        if (!in_array($data['status'], $allowed[$presenterRequest->status] ?? [])) {
            return response()->json([
                'message' => "Cannot transition from '{$presenterRequest->status}' to '{$data['status']}'.",
            ], 422);
        }

        $update = ['status' => $data['status']];
        if (isset($data['scope'])) {
            $update['scope'] = $data['scope'];
        }

        // When approving/activating, update participant role to presenter
        if (in_array($data['status'], ['approved', 'active'])) {
            $presenterRequest->participant->update(['role' => 'presenter']);
        }

        // When revoking, revert participant role back to student
        if (in_array($data['status'], ['revoked', 'expired'])) {
            $presenterRequest->participant->update(['role' => 'student']);
        }

        $presenterRequest->update($update);

        $this->log($room->id, $participant->id, 'presenter_request.updated', [
            'request_id' => $presenterRequest->id,
            'status'     => $data['status'],
        ]);

        return response()->json(['data' => $presenterRequest->fresh()->load('participant:id,alias,role')]);
    }

    // ── DELETE /rooms/{room}/presenter-requests/{presenterRequest} ───────────

    /**
     * Host or the requesting participant may revoke/cancel.
     */
    public function destroy(Request $request, Room $room, PresenterRequest $presenterRequest): JsonResponse
    {
        $participant = $this->resolveParticipant($request, $room);

        if (!$participant) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if ($presenterRequest->room_id !== $room->id) {
            return response()->json(['message' => 'Request does not belong to this room.'], 404);
        }

        // Host can delete any; students can only delete their own
        if (
            $participant->role !== 'teacher_host' &&
            $presenterRequest->participant_id !== $participant->id
        ) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $presenterRequest->update(['status' => 'revoked']);
        // Revert role if student was promoted
        if (in_array($presenterRequest->status, ['approved', 'active'])) {
            $presenterRequest->participant->update(['role' => 'student']);
        }

        $this->log($room->id, $participant->id, 'presenter_request.revoked', [
            'request_id' => $presenterRequest->id,
        ]);

        return response()->json(null, 204);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Resolve participant from request attributes (set by ParticipantTokenGuard)
     * OR from Sanctum authenticated user (teacher using their account token).
     */
    private function resolveParticipant(Request $request, Room $room): ?Participant
    {
        /** @var Participant|null $p */
        $p = $request->attributes->get('participant');
        if ($p) {
            return $p;
        }

        // Sanctum-authenticated teacher: look up their active participant row
        $user = $request->user();
        if ($user) {
            return Participant::where('room_id', $room->id)
                ->where('user_id', $user->id)
                ->whereNull('left_at')
                ->first();
        }

        return null;
    }

    private function log(string $roomId, string $actorId, string $action, array $meta = []): void
    {
        AuditLog::create([
            'room_id'  => $roomId,
            'actor_id' => $actorId,
            'action'   => $action,
            'metadata' => $meta ?: null,
        ]);
    }
}
