<?php

namespace Tests\Feature;

use App\Models\Classroom;
use App\Models\School;
use App\Models\SchoolMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SchoolClassroomTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role = 'teacher'): User
    {
        static $n = 0;
        $n++;
        return User::create([
            'name'     => "User {$n}",
            'email'    => "user{$n}@test.com",
            'password' => Hash::make('password'),
            'role'     => $role,
        ]);
    }

    private function makeSchool(string $name = 'Test School'): School
    {
        static $n = 0;
        $n++;
        return School::create(['name' => $name, 'slug' => "test-school-{$n}"]);
    }

    private function enroll(User $user, School $school, string $role = 'teacher'): SchoolMembership
    {
        return SchoolMembership::create([
            'school_id' => $school->id,
            'user_id'   => $user->id,
            'role'      => $role,
        ]);
    }

    // ── Schools ────────────────────────────────────────────────────────────

    public function test_school_admin_can_create_school(): void
    {
        $user = $this->makeUser('school_admin');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/schools', ['name' => 'My School'])
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'My School');
    }

    public function test_teacher_cannot_create_school(): void
    {
        $user = $this->makeUser('teacher');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/schools', ['name' => 'Fake School'])
            ->assertStatus(403);
    }

    public function test_member_can_view_their_school(): void
    {
        $user   = $this->makeUser('teacher');
        $school = $this->makeSchool();
        $this->enroll($user, $school);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/schools/{$school->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.id', $school->id);
    }

    public function test_non_member_cannot_view_other_school(): void
    {
        $user   = $this->makeUser('teacher');
        $school = $this->makeSchool('Other School');

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/schools/{$school->id}")
            ->assertStatus(403);
    }

    public function test_schools_index_only_returns_own_schools(): void
    {
        $user    = $this->makeUser('teacher');
        $mySchool    = $this->makeSchool('My School');
        $otherSchool = $this->makeSchool('Other School');
        $this->enroll($user, $mySchool);

        $resp = $this->actingAs($user, 'sanctum')->getJson('/api/v1/schools');
        $resp->assertStatus(200);
        $ids = collect($resp->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($mySchool->id));
        $this->assertFalse($ids->contains($otherSchool->id));
    }

    public function test_school_admin_member_can_update_school(): void
    {
        $user   = $this->makeUser('teacher');
        $school = $this->makeSchool();
        $this->enroll($user, $school, 'admin');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/v1/schools/{$school->id}", ['name' => 'Updated Name'])
            ->assertStatus(200)
            ->assertJsonPath('data.name', 'Updated Name');
    }

    public function test_non_admin_member_cannot_update_school(): void
    {
        $user   = $this->makeUser('teacher');
        $school = $this->makeSchool();
        $this->enroll($user, $school, 'teacher');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/v1/schools/{$school->id}", ['name' => 'Hacked Name'])
            ->assertStatus(403);
    }

    // ── Classrooms ─────────────────────────────────────────────────────────

    public function test_teacher_can_create_classroom_in_their_school(): void
    {
        $user   = $this->makeUser('teacher');
        $school = $this->makeSchool();
        $this->enroll($user, $school, 'teacher');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/schools/{$school->id}/classrooms", [
                'name'    => 'Math 101',
                'subject' => 'Mathematics',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'Math 101');
    }

    public function test_teacher_cannot_create_classroom_in_another_school(): void
    {
        $user        = $this->makeUser('teacher');
        $otherSchool = $this->makeSchool('Other');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/schools/{$otherSchool->id}/classrooms", ['name' => 'Injected Class'])
            ->assertStatus(403);
    }

    public function test_member_can_list_classrooms_in_their_school(): void
    {
        $user   = $this->makeUser('teacher');
        $school = $this->makeSchool();
        $this->enroll($user, $school);
        Classroom::create([
            'school_id'  => $school->id,
            'teacher_id' => $user->id,
            'name'       => 'Science 101',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/schools/{$school->id}/classrooms")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_non_member_cannot_list_classrooms(): void
    {
        $user   = $this->makeUser('teacher');
        $school = $this->makeSchool();

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/schools/{$school->id}/classrooms")
            ->assertStatus(403);
    }

    public function test_classroom_show_requires_membership(): void
    {
        $owner      = $this->makeUser('teacher');
        $outsider   = $this->makeUser('teacher');
        $school     = $this->makeSchool();
        $this->enroll($owner, $school);
        $classroom  = Classroom::create([
            'school_id'  => $school->id,
            'teacher_id' => $owner->id,
            'name'       => 'Private Class',
        ]);

        // owner can see it
        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/v1/classrooms/{$classroom->id}")
            ->assertStatus(200);

        // outsider cannot
        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/v1/classrooms/{$classroom->id}")
            ->assertStatus(403);
    }
}
