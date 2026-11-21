<?php

namespace Database\Factories;

use App\Models\Participant;
use App\Models\Room;
use App\Models\RoomPermission;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RoomPermissionFactory extends Factory
{
    protected $model = RoomPermission::class;

    public function definition(): array
    {
        return [
            'id'             => Str::uuid()->toString(),
            'room_id'        => Room::factory(),
            'participant_id' => Participant::factory(),
            'permission'     => 'draw_only',
            'granted_by'     => null,
            'granted_at'     => now(),
            'revoked_at'     => null,
        ];
    }
}
