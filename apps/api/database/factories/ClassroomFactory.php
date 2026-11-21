<?php

namespace Database\Factories;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Classroom>
 */
class ClassroomFactory extends Factory
{
    public function definition(): array
    {
        return [
            'school_id'   => School::factory(),
            'teacher_id'  => User::factory(),
            'name'        => $this->faker->words(3, true) . ' Class',
            'subject'     => $this->faker->randomElement(['Mathematics', 'Physics', 'Chemistry', 'Biology', 'History']),
            'grade_level' => $this->faker->randomElement(['X', 'XI', 'XII']),
        ];
    }
}
