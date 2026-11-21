<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SnapshotController — P07-T01
 *
 * Routes:
 *   GET  /rooms/{room}/snapshots          → index   (all auth — used by replay engine)
 *   POST /rooms/{room}/snapshots          → store   (host only: Sanctum)
 *   GET  /rooms/{room}/snapshots/nearest  → nearest (all auth — closest snapshot at or before seq)
 *
 * Snapshots store a complete BoardState JSON blob at a given seq_at.
 * The replay engine uses the nearest snapshot + subsequent events to reconstruct state.
 */
class SnapshotController extends Controller
{
    // ── GET /rooms/{room}/snapshots ───────────────────────────────────────────

    public function index(Request $request, Room $room): JsonResponse
    {
        $snapshots = RoomSnapshot::where('room_id', $room->id)
            ->orderBy('seq_at')
            ->get(['id', 'room_id', 'seq_at', 'created_at']);

        return response()->json(['data' => $snapshots]);
    }

    // ── POST /rooms/{room}/snapshots ──────────────────────────────────────────

    public function store(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $data = $request->validate([
            'seq_at' => ['required', 'integer', 'min:0'],
            'state'  => ['required', 'array'],
        ]);

        // Avoid duplicate snapshot at the same seq (upsert by room + seq_at)
        $snapshot = RoomSnapshot::updateOrCreate(
            ['room_id' => $room->id, 'seq_at' => $data['seq_at']],
            ['state' => $data['state'], 'created_at' => now()],
        );

        return response()->json(['data' => $snapshot], 201);
    }

    // ── GET /rooms/{room}/snapshots/nearest ───────────────────────────────────

    /**
     * Returns the closest snapshot at or before the given seq.
     * Query param: ?seq=<integer>
     */
    public function nearest(Request $request, Room $room): JsonResponse
    {
        $seq = (int) $request->query('seq', 0);

        $snapshot = RoomSnapshot::where('room_id', $room->id)
            ->where('seq_at', '<=', $seq)
            ->orderByDesc('seq_at')
            ->first();

        if (! $snapshot) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => $snapshot]);
    }
}
