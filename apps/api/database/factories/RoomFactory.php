<?php

namespace Database\Factories;

use App\Models\Classroom;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RoomFactory extends Factory
{
    protected $model = Room::class;

    public function definition(): array
    {
        return [
            'id'           => Str::uuid()->toString(),
            'classroom_id' => Classroom::factory(),
            'host_id'      => User::factory(),
            'code'         => strtoupper(Str::random(6)),
            'status'       => 'lobby',
            'mode'         => 'projector',
            'starts_at'    => now(),
            'ends_at'      => now()->addHours(2),
        ];
    }

    public function active(): static
    {
        return $this->state(['status' => 'lobby']);
    }

    public function live(): static
    {
        return $this->state(['status' => 'live']);
    }

    public function ended(): static
    {
        return $this->state(['status' => 'ended', 'ends_at' => now()->subMinutes(5)]);
    }
}
