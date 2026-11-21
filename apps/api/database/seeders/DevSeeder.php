<?php

namespace Database\Seeders;

use App\Models\Classroom;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * DevSeeder — creates demo data for local development and E2E tests.
 * Run with: php artisan db:seed --class=DevSeeder
 * Credentials: teacher@demo.test / password123
 */
class DevSeeder extends Seeder
{
    public function run(): void
    {
        // --- Teacher user ---
        $teacher = User::firstOrCreate(
            ['email' => 'teacher@demo.test'],
            [
                'name'     => 'Demo Teacher',
                'password' => Hash::make('password123'),
                'role'     => 'teacher',
            ]
        );

        // --- Admin user ---
        $admin = User::firstOrCreate(
            ['email' => 'admin@demo.test'],
            [
                'name'     => 'Demo Admin',
                'password' => Hash::make('password123'),
                'role'     => 'school_admin',
            ]
        );

        // --- School ---
        $school = School::firstOrCreate(
            ['slug' => 'sma-demo'],
            [
                'name'     => 'SMA Demo Nusantara',
                'settings' => ['timezone' => 'Asia/Jakarta'],
            ]
        );

        // --- Memberships ---
        SchoolMembership::firstOrCreate(
            ['school_id' => $school->id, 'user_id' => $teacher->id],
            ['role' => 'teacher']
        );
        SchoolMembership::firstOrCreate(
            ['school_id' => $school->id, 'user_id' => $admin->id],
            ['role' => 'admin']
        );

        // --- Classrooms ---
        $classrooms = [
            ['name' => 'Matematika 10A', 'subject' => 'Matematika',   'grade_level' => 'Kelas 10'],
            ['name' => 'Fisika 11B',     'subject' => 'Fisika',       'grade_level' => 'Kelas 11'],
            ['name' => 'Kimia 12C',      'subject' => 'Kimia',        'grade_level' => 'Kelas 12'],
        ];

        foreach ($classrooms as $data) {
            Classroom::firstOrCreate(
                ['school_id' => $school->id, 'name' => $data['name']],
                [...$data, 'teacher_id' => $teacher->id]
            );
        }

        $this->command->info('DevSeeder done: teacher@demo.test / password123');
    }
}
