<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * room_events — P04-T01
 * id (uuid), room_id, seq (bigint auto-increment), event_type (varchar), payload (json),
 * actor_id (uuid), idempotency_key (varchar nullable unique per room), committed_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            // seq is per-room, managed in application layer (not global auto-increment)
            $table->unsignedBigInteger('seq');
            $table->string('event_type', 60);
            $table->json('payload');
            $table->uuid('actor_id')->nullable();
            // unique per room (NULL keys are not unique in SQL — nulls allowed)
            $table->string('idempotency_key', 100)->nullable();
            $table->timestamp('committed_at')->useCurrent();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();

            $table->index(['room_id', 'seq']);
            $table->index(['room_id', 'idempotency_key']);
            // Unique idempotency per room (partial index on non-null)
            $table->unique(['room_id', 'idempotency_key'], 'room_events_room_idempotency_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_events');
    }
};
