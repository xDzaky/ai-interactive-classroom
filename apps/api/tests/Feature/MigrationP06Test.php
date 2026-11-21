<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * P06-T01: Verify activities phase migrations.
 */
class MigrationP06Test extends TestCase
{
    use RefreshDatabase;

    // ── lesson_sessions ──────────────────────────────────────────────────────

    public function test_lesson_sessions_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('lesson_sessions'));
    }

    public function test_lesson_sessions_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('lesson_sessions', [
            'id', 'room_id', 'started_at', 'ended_at', 'created_at', 'updated_at',
        ]));
    }

    // ── activities ───────────────────────────────────────────────────────────

    public function test_activities_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('activities'));
    }

    public function test_activities_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('activities', [
            'id', 'room_id', 'lesson_session_id', 'type', 'title', 'config', 'status',
            'created_at', 'updated_at',
        ]));
    }

    // ── activity_questions ───────────────────────────────────────────────────

    public function test_activity_questions_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('activity_questions'));
    }

    public function test_activity_questions_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('activity_questions', [
            'id', 'activity_id', 'body', 'options', 'answer_key', 'sort_order',
            'created_at', 'updated_at',
        ]));
    }

    // ── activity_answers ─────────────────────────────────────────────────────

    public function test_activity_answers_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('activity_answers'));
    }

    public function test_activity_answers_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('activity_answers', [
            'id', 'activity_id', 'question_id', 'participant_id', 'response', 'submitted_at',
            'created_at', 'updated_at',
        ]));
    }

    // ── room_groups ───────────────────────────────────────────────────────────

    public function test_room_groups_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('room_groups'));
    }

    public function test_room_groups_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('room_groups', [
            'id', 'room_id', 'name', 'whiteboard_id', 'created_at', 'updated_at',
        ]));
    }

    // ── group_members ─────────────────────────────────────────────────────────

    public function test_group_members_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('group_members'));
    }

    public function test_group_members_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('group_members', [
            'id', 'group_id', 'participant_id', 'is_leader', 'created_at', 'updated_at',
        ]));
    }

    // ── group_submissions ─────────────────────────────────────────────────────

    public function test_group_submissions_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('group_submissions'));
    }

    public function test_group_submissions_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('group_submissions', [
            'id', 'group_id', 'activity_id', 'content', 'submitted_by', 'submitted_at',
            'created_at', 'updated_at',
        ]));
    }
}
