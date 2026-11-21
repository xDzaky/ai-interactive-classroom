<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\Schema;

class MigrationP01Test extends TestCase
{
    use RefreshDatabase;

    public function test_schools_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('schools'));
    }

    public function test_schools_table_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('schools', ['id', 'name', 'slug', 'settings', 'created_at', 'updated_at']));
    }

    public function test_school_memberships_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('school_memberships'));
    }

    public function test_school_memberships_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('school_memberships', ['id', 'school_id', 'user_id', 'role']));
    }

    public function test_classrooms_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('classrooms'));
    }

    public function test_classrooms_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('classrooms', ['id', 'school_id', 'teacher_id', 'name', 'subject', 'grade_level']));
    }

    public function test_subjects_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('subjects'));
    }

    public function test_curricula_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('curricula'));
    }

    public function test_curricula_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('curricula', ['id', 'subject_id', 'name', 'version', 'content']));
    }
}
