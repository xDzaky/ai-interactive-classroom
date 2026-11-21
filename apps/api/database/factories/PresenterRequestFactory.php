<?php

namespace Database\Factories;

use App\Models\Participant;
use App\Models\PresenterRequest;
use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PresenterRequestFactory extends Factory
{
    protected $model = PresenterRequest::class;

    public function definition(): array
    {
        return [
            'id'             => Str::uuid()->toString(),
            'room_id'        => Room::factory(),
            'participant_id' => Participant::factory(),
            'status'         => 'requested',
            'scope'          => 'draw_only',
            'expires_at'     => null,
        ];
    }
}
