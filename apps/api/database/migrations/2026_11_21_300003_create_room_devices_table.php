<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * room_devices — P05-T01
 * id (uuid), room_id, device_id (uuid), device_name,
 * token_hash, paired_at, revoked_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('device_id')->unique();
            $table->string('device_name', 120)->default('Mobile Controller');
            $table->string('token_hash', 64);
            $table->timestamp('paired_at')->useCurrent();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();

            $table->index('room_id');
            $table->index('token_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_devices');
    }
};
