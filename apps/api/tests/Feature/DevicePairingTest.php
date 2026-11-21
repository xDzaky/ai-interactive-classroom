<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\Room;
use App\Models\RoomDevice;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * P05-T04: Device pairing API — POST/GET/DELETE /rooms/{room}/devices + confirm
 */
class DevicePairingTest extends TestCase
{
    use RefreshDatabase;

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function makeHostWithRoom(): array
    {
        $host    = User::factory()->create(['role' => 'teacher']);
        $school  = School::factory()->create();
        SchoolMembership::create([
            'school_id' => $school->id,
            'user_id'   => $host->id,
            'role'      => 'teacher',
        ]);
        $classroom = Classroom::factory()->create([
            'school_id'  => $school->id,
            'teacher_id' => $host->id,
        ]);
        $room = Room::create([
            'id'           => Str::uuid()->toString(),
            'classroom_id' => $classroom->id,
            'host_id'      => $host->id,
            'code'         => 'DEV001',
            'status'       => 'live',
            'mode'         => 'mobile_host',
        ]);
        return compact('host', 'room');
    }

    private function makeDeviceToken(string $deviceId): string
    {
        $appKey  = config('app.key');
        $payload = base64_encode($deviceId);
        $sig     = hash_hmac('sha256', $deviceId, $appKey);
        return $payload . '.' . $sig;
    }

    // ── POST /rooms/{room}/devices ────────────────────────────────────────────

    public function test_host_can_initiate_device_pairing(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        $res = $this->actingAs($host)->postJson("/api/v1/rooms/{$room->id}/devices", [
            'device_name' => 'iPad Pro',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.device_name', 'iPad Pro')
            ->assertJsonStructure(['data' => ['id', 'device_id', 'token', 'paired_at']]);

        $this->assertDatabaseHas('room_devices', [
            'room_id'     => $room->id,
            'device_name' => 'iPad Pro',
        ]);
    }

    public function test_pairing_fails_when_room_not_live(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();
        $room->update(['status' => 'lobby']);

        $this->actingAs($host)->postJson("/api/v1/rooms/{$room->id}/devices", [])
            ->assertStatus(422);
    }

    public function test_unauthenticated_cannot_initiate_pairing(): void
    {
        ['room' => $room] = $this->makeHostWithRoom();
        $this->postJson("/api/v1/rooms/{$room->id}/devices", [])
            ->assertStatus(401);
    }

    // ── POST /rooms/{room}/devices/{device}/confirm ──────────────────────────

    public function test_device_can_confirm_pairing_with_valid_token(): void
    {
        ['room' => $room] = $this->makeHostWithRoom();

        $deviceId  = Str::uuid()->toString();
        $rawToken  = $this->makeDeviceToken($deviceId);
        $device    = RoomDevice::create([
            'room_id'    => $room->id,
            'device_id'  => $deviceId,
            'token_hash' => hash('sha256', $rawToken),
        ]);

        $res = $this->postJson("/api/v1/rooms/{$room->id}/devices/{$device->id}/confirm", [
            'token' => $rawToken,
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.device_id', $deviceId);
    }

    public function test_confirm_fails_with_invalid_token(): void
    {
        ['room' => $room] = $this->makeHostWithRoom();

        $deviceId = Str::uuid()->toString();
        $device   = RoomDevice::create([
            'room_id'    => $room->id,
            'device_id'  => $deviceId,
            'token_hash' => hash('sha256', 'correct-token'),
        ]);

        $this->postJson("/api/v1/rooms/{$room->id}/devices/{$device->id}/confirm", [
            'token' => 'wrong-token',
        ])->assertStatus(401);
    }

    // ── DELETE /rooms/{room}/devices/{device} ─────────────────────────────────

    public function test_host_can_revoke_device(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        $device = RoomDevice::create([
            'room_id'    => $room->id,
            'device_id'  => Str::uuid()->toString(),
            'token_hash' => hash('sha256', 'tok'),
        ]);

        $this->actingAs($host)
            ->deleteJson("/api/v1/rooms/{$room->id}/devices/{$device->id}")
            ->assertStatus(204);

        $this->assertNotNull($device->fresh()->revoked_at);
    }

    // ── GET /rooms/{room}/devices ─────────────────────────────────────────────

    public function test_host_can_list_active_devices(): void
    {
        ['host' => $host, 'room' => $room] = $this->makeHostWithRoom();

        RoomDevice::create([
            'room_id'    => $room->id,
            'device_id'  => Str::uuid()->toString(),
            'token_hash' => hash('sha256', 'tok1'),
        ]);

        // Revoked device — should not appear
        RoomDevice::create([
            'room_id'    => $room->id,
            'device_id'  => Str::uuid()->toString(),
            'token_hash' => hash('sha256', 'tok2'),
            'revoked_at' => now(),
        ]);

        $res = $this->actingAs($host)->getJson("/api/v1/rooms/{$room->id}/devices");

        $res->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }
}
