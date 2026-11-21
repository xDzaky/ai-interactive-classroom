<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Participant;
use App\Models\Room;
use App\Models\RoomEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RoomEventController extends Controller
{
    // ── Allowlist from CONTRACTS.md §Whiteboard event types ─────────────────
    private const ALLOWED_EVENTS = [
        'stroke.committed',
        'object.created',
        'object.updated',
        'object.deleted',
        'object.transform',
        'scene.changed',
        'viz.solid.created',
        'viz.solid.updated',
        'viz.graph.created',
        'viz.graph.updated',
        'annotation.created',
        'annotation.deleted',
        'device.pointer.moved', // ephemeral — received but not persisted
        'device.action',
    ];

    // Ephemeral events: broadcast only, no DB row
    private const EPHEMERAL_EVENTS = ['device.pointer.moved'];

    // ── POST /api/v1/rooms/{room}/events ────────────────────────────────────
    /**
     * Ingest a whiteboard event from an authorised participant.
     *
     * Body: { event_type, payload, idempotency_key? }
     * Returns: { id, seq, event_type, payload, actor_id, committed_at }
     */
    public function store(Request $request, Room $room): JsonResponse
    {
        $this->authorizeParticipant($request, $room);

        $data = $request->validate([
            'event_type'      => ['required', 'string', Rule::in(self::ALLOWED_EVENTS)],
            'payload'         => ['required', 'array'],
            'idempotency_key' => ['nullable', 'string', 'max:128'],
        ]);

        $actor = $this->resolveActor($request, $room);

        // Idempotency: if key already exists for this room, return existing event
        if (! empty($data['idempotency_key'])) {
            $existing = RoomEvent::where('room_id', $room->id)
                ->where('idempotency_key', $data['idempotency_key'])
                ->first();

            if ($existing) {
                return response()->json($this->formatEvent($existing), 200);
            }
        }

        // Ephemeral events: broadcast only, do not persist
        if (in_array($data['event_type'], self::EPHEMERAL_EVENTS, true)) {
            $this->broadcastEvent($room, [
                'seq'          => null,
                'event_type'   => $data['event_type'],
                'payload'      => $data['payload'],
                'actor_id'     => $actor?->id,
                'committed_at' => now()->toIso8601String(),
            ]);

            return response()->json(['ephemeral' => true], 200);
        }

        // Persist event with per-room auto-increment seq
        $event = DB::transaction(function () use ($room, $data, $actor): RoomEvent {
            // Per-room seq: MAX(seq)+1 — serialised inside transaction
            $seq = (RoomEvent::where('room_id', $room->id)->max('seq') ?? 0) + 1;

            return RoomEvent::create([
                'id'              => Str::uuid()->toString(),
                'room_id'         => $room->id,
                'seq'             => $seq,
                'event_type'      => $data['event_type'],
                'payload'         => $data['payload'],
                'actor_id'        => $actor?->id,
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'committed_at'    => now(),
            ]);
        });

        $this->broadcastEvent($room, $this->formatEvent($event));

        return response()->json($this->formatEvent($event), 201);
    }

    // ── GET /api/v1/rooms/{room}/events ─────────────────────────────────────
    /**
     * Return events after a given seq (for gap-fill / catch-up).
     *
     * Query: ?after={seq}  (default 0)
     * Returns: { events: [...], next_seq: int }
     */
    public function index(Request $request, Room $room): JsonResponse
    {
        $this->authorizeParticipant($request, $room);

        $after = max(0, (int) $request->query('after', 0));
        $limit = min(500, (int) $request->query('limit', 200));

        $events = RoomEvent::where('room_id', $room->id)
            ->where('seq', '>', $after)
            ->orderBy('seq')
            ->limit($limit)
            ->get()
            ->map(fn ($e) => $this->formatEvent($e));

        $nextSeq = $events->last()['seq'] ?? $after;

        return response()->json([
            'events'   => $events,
            'next_seq' => $nextSeq,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Ensure the request is from an active participant (Sanctum user OR participant token).
     * Throws 403 if not authorised.
     */
    private function authorizeParticipant(Request $request, Room $room): void
    {
        // Check participant token (from ParticipantTokenGuard middleware attribute)
        $participant = $request->attributes->get('participant');
        if ($participant && $participant->room_id === $room->id) {
            return;
        }

        // Check Sanctum authenticated user
        $user = $request->user('sanctum');
        if ($user) {
            $exists = Participant::where('room_id', $room->id)
                ->where('user_id', $user->id)
                ->whereNull('left_at')
                ->exists();
            if ($exists) {
                return;
            }
        }

        abort(403, 'You are not an active participant of this room.');
    }

    /**
     * Resolve the Participant record for the requesting actor.
     */
    private function resolveActor(Request $request, Room $room): ?Participant
    {
        $p = $request->attributes->get('participant');
        if ($p) {
            return $p;
        }

        $user = $request->user('sanctum');
        if ($user) {
            return Participant::where('room_id', $room->id)
                ->where('user_id', $user->id)
                ->whereNull('left_at')
                ->first();
        }

        return null;
    }

    private function formatEvent(RoomEvent $event): array
    {
        return [
            'id'              => $event->id,
            'seq'             => $event->seq,
            'event_type'      => $event->event_type,
            'payload'         => $event->payload,
            'actor_id'        => $event->actor_id,
            'idempotency_key' => $event->idempotency_key,
            'committed_at'    => $event->committed_at?->toIso8601String(),
        ];
    }

    private function broadcastEvent(Room $room, array $data): void
    {
        try {
            Broadcast::on("room.{$room->id}")
                ->as('whiteboard.event.applied')
                ->with($data)
                ->sendNow();
        } catch (\Throwable) {
            // Reverb unavailable (dev/test): swallow broadcast errors, persist succeeded
        }
    }
}
