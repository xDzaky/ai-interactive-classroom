<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Room;
use App\Models\RoomDevice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * DeviceController — P05-T04
 *
 * Routes:
 *   POST   /rooms/{room}/devices                    — host initiates pairing (Sanctum)
 *   POST   /rooms/{room}/devices/{device}/confirm   — device confirms pairing (Sanctum or participant token)
 *   DELETE /rooms/{room}/devices/{device}           — host revokes device (Sanctum)
 *   GET    /rooms/{room}/devices                    — host lists paired devices (Sanctum)
 *
 * Device token format: same HMAC scheme as participant token.
 * Stored as SHA-256 hash in room_devices.token_hash.
 */
class DeviceController extends Controller
{
    // ── POST /rooms/{room}/devices ───────────────────────────────────────────

    /**
     * Host initiates device pairing. Returns a one-time QR payload with token.
     */
    public function store(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        if ($room->status !== 'live') {
            return response()->json(['message' => 'Room is not live.'], 422);
        }

        $data = $request->validate([
            'device_name' => ['sometimes', 'string', 'max:120'],
        ]);

        $deviceId  = (string) Str::uuid();
        $rawToken  = $this->generateDeviceToken($deviceId);
        $tokenHash = hash('sha256', $rawToken);

        $device = RoomDevice::create([
            'room_id'     => $room->id,
            'device_id'   => $deviceId,
            'device_name' => $data['device_name'] ?? 'Mobile Controller',
            'token_hash'  => $tokenHash,
        ]);

        $this->log($room->id, $request->user()->id, 'device.initiated', ['device_id' => $deviceId]);

        return response()->json([
            'data' => [
                'id'          => $device->id,
                'device_id'   => $deviceId,
                'device_name' => $device->device_name,
                'token'       => $rawToken,   // sent once for QR display; never stored
                'paired_at'   => $device->paired_at,
            ],
        ], 201);
    }

    // ── POST /rooms/{room}/devices/{device}/confirm ──────────────────────────

    /**
     * Device confirms pairing by presenting its token.
     * Returns confirmation (the device is now "active" for the room).
     */
    public function confirm(Request $request, Room $room, RoomDevice $device): JsonResponse
    {
        if ($device->room_id !== $room->id) {
            return response()->json(['message' => 'Device does not belong to this room.'], 404);
        }

        if ($device->revoked_at !== null) {
            return response()->json(['message' => 'Device has been revoked.'], 403);
        }

        // Verify the token presented by the device
        $rawToken = $request->input('token') ?? $request->header('X-Device-Token');
        if (!$rawToken || !hash_equals($device->token_hash, hash('sha256', $rawToken))) {
            return response()->json(['message' => 'Invalid device token.'], 401);
        }

        $this->log($room->id, $device->id, 'device.confirmed', ['device_id' => $device->device_id]);

        return response()->json([
            'data' => [
                'id'          => $device->id,
                'device_id'   => $device->device_id,
                'device_name' => $device->device_name,
                'paired_at'   => $device->paired_at,
                'room_id'     => $room->id,
            ],
        ]);
    }

    // ── DELETE /rooms/{room}/devices/{device} ────────────────────────────────

    /**
     * Host revokes a paired device.
     */
    public function destroy(Request $request, Room $room, RoomDevice $device): JsonResponse
    {
        $this->authorize('update', $room);

        if ($device->room_id !== $room->id) {
            return response()->json(['message' => 'Device does not belong to this room.'], 404);
        }

        $device->update(['revoked_at' => now()]);

        $this->log($room->id, $request->user()->id, 'device.revoked', ['device_id' => $device->device_id]);

        return response()->json(null, 204);
    }

    // ── GET /rooms/{room}/devices ────────────────────────────────────────────

    /**
     * List all (non-revoked) paired devices for a room.
     */
    public function index(Request $request, Room $room): JsonResponse
    {
        $this->authorize('update', $room);

        $devices = RoomDevice::where('room_id', $room->id)
            ->whereNull('revoked_at')
            ->orderBy('paired_at')
            ->get(['id', 'device_id', 'device_name', 'paired_at']);

        return response()->json(['data' => $devices]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Generate a HMAC-signed device token (same scheme as participant tokens).
     * Format: base64url(deviceId) . '.' . HMAC-SHA256(deviceId, APP_KEY)
     */
    private function generateDeviceToken(string $deviceId): string
    {
        $appKey  = config('app.key');
        $payload = base64_encode($deviceId);
        $sig     = hash_hmac('sha256', $deviceId, $appKey);
        return $payload . '.' . $sig;
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
