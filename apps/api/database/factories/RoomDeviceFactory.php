<?php

namespace Database\Factories;

use App\Models\Room;
use App\Models\RoomDevice;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RoomDeviceFactory extends Factory
{
    protected $model = RoomDevice::class;

    public function definition(): array
    {
        return [
            'id'          => Str::uuid()->toString(),
            'room_id'     => Room::factory(),
            'device_id'   => Str::uuid()->toString(),
            'device_name' => 'Mobile Controller',
            'token_hash'  => hash('sha256', Str::random(64)),
            'paired_at'   => now(),
            'revoked_at'  => null,
        ];
    }
}
