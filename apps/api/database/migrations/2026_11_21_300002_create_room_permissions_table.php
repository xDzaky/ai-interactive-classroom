<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * room_permissions — P05-T01
 * id (uuid), room_id, participant_id, permission,
 * granted_by (uuid, fk participants), granted_at, revoked_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('participant_id');
            $table->string('permission', 60);
            $table->uuid('granted_by')->nullable();
            $table->timestamp('granted_at')->useCurrent();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();
            $table->foreign('granted_by')->references('id')->on('participants')->nullOnDelete();

            $table->index('room_id');
            $table->index('participant_id');
            $table->index(['room_id', 'participant_id', 'permission']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_permissions');
    }
};
