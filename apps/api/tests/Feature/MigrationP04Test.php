<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\Schema;

/**
 * P04-T01: Verify rooms, participants, whiteboards, room_events, room_snapshots, audit_logs migrations.
 */
class MigrationP04Test extends TestCase
{
    use RefreshDatabase;

    // ── rooms ───────────────────────────────────────────────────────────────

    public function test_rooms_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('rooms'));
    }

    public function test_rooms_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('rooms', [
            'id', 'classroom_id', 'host_id', 'code', 'status', 'mode',
            'settings', 'starts_at', 'ends_at', 'created_at', 'updated_at',
        ]));
    }

    // ── participants ─────────────────────────────────────────────────────────

    public function test_participants_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('participants'));
    }

    public function test_participants_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('participants', [
            'id', 'room_id', 'user_id', 'alias', 'role',
            'token_hash', 'joined_at', 'left_at',
        ]));
    }

    // ── whiteboards ──────────────────────────────────────────────────────────

    public function test_whiteboards_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('whiteboards'));
    }

    public function test_whiteboards_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('whiteboards', [
            'id', 'room_id', 'name', 'scene_data',
        ]));
    }

    // ── room_events ──────────────────────────────────────────────────────────

    public function test_room_events_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('room_events'));
    }

    public function test_room_events_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('room_events', [
            'id', 'room_id', 'seq', 'event_type', 'payload',
            'actor_id', 'idempotency_key', 'committed_at',
        ]));
    }

    // ── room_snapshots ───────────────────────────────────────────────────────

    public function test_room_snapshots_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('room_snapshots'));
    }

    public function test_room_snapshots_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('room_snapshots', [
            'id', 'room_id', 'seq_at', 'state', 'created_at',
        ]));
    }

    // ── audit_logs ───────────────────────────────────────────────────────────

    public function test_audit_logs_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('audit_logs'));
    }

    public function test_audit_logs_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('audit_logs', [
            'id', 'room_id', 'actor_id', 'action', 'metadata', 'created_at',
        ]));
    }
}
