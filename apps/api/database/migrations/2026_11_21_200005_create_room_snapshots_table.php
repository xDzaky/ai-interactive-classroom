<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * room_snapshots — P04-T01
 * id (uuid), room_id, seq_at, state (json), created_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->unsignedBigInteger('seq_at');
            $table->json('state');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->index(['room_id', 'seq_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_snapshots');
    }
};
