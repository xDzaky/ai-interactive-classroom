<?php

namespace Database\Factories;

use App\Models\Participant;
use App\Models\Room;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ParticipantFactory extends Factory
{
    protected $model = Participant::class;

    public function definition(): array
    {
        return [
            'id'         => Str::uuid()->toString(),
            'room_id'    => Room::factory(),
            'user_id'    => null,
            'alias'      => $this->faker->firstName(),
            'role'       => 'guest_student',
            'token_hash' => hash('sha256', Str::random(64)),
            'joined_at'  => now(),
            'left_at'    => null,
        ];
    }

    public function host(): static
    {
        return $this->state(['role' => 'teacher_host', 'user_id' => User::factory()]);
    }

    public function student(): static
    {
        return $this->state(['role' => 'student']);
    }

    public function left(): static
    {
        return $this->state(['left_at' => now()]);
    }
}
