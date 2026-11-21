<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * presenter_requests — P05-T01
 * id (uuid), room_id, participant_id,
 * status (enum: requested, approved, active, revoked, expired),
 * scope (enum: draw_only, object_edit, full_board), expires_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presenter_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('participant_id');
            $table->enum('status', ['requested', 'approved', 'active', 'revoked', 'expired'])
                  ->default('requested');
            $table->enum('scope', ['draw_only', 'object_edit', 'full_board'])
                  ->default('draw_only');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();

            $table->index('room_id');
            $table->index('participant_id');
            $table->index(['room_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presenter_requests');
    }
};
