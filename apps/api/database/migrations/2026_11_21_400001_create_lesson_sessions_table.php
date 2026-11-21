<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * lesson_sessions — P06-T01
 * id (uuid), room_id, started_at, ended_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->index('room_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_sessions');
    }
};
