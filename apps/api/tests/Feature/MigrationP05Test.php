<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\Schema;

/**
 * P05-T01: Verify presenter_requests, room_permissions, room_devices migrations.
 */
class MigrationP05Test extends TestCase
{
    use RefreshDatabase;

    // ── presenter_requests ───────────────────────────────────────────────────

    public function test_presenter_requests_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('presenter_requests'));
    }

    public function test_presenter_requests_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('presenter_requests', [
            'id', 'room_id', 'participant_id', 'status', 'scope', 'expires_at',
            'created_at', 'updated_at',
        ]));
    }

    // ── room_permissions ─────────────────────────────────────────────────────

    public function test_room_permissions_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('room_permissions'));
    }

    public function test_room_permissions_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('room_permissions', [
            'id', 'room_id', 'participant_id', 'permission', 'granted_by',
            'granted_at', 'revoked_at', 'created_at', 'updated_at',
        ]));
    }

    // ── room_devices ─────────────────────────────────────────────────────────

    public function test_room_devices_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('room_devices'));
    }

    public function test_room_devices_has_expected_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('room_devices', [
            'id', 'room_id', 'device_id', 'device_name', 'token_hash',
            'paired_at', 'revoked_at', 'created_at', 'updated_at',
        ]));
    }
}
