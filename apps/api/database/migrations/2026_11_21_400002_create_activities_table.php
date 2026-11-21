<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * activities — P06-T01
 * id (uuid), room_id, lesson_session_id, type (enum: poll, quiz, group_task),
 * title, config (json), status (enum: draft, active, closed)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('lesson_session_id')->nullable();
            $table->enum('type', ['poll', 'quiz', 'group_task']);
            $table->string('title', 255);
            $table->json('config')->nullable();
            $table->enum('status', ['draft', 'active', 'closed'])->default('draft');
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('lesson_session_id')
                  ->references('id')->on('lesson_sessions')->nullOnDelete();

            $table->index('room_id');
            $table->index(['room_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
