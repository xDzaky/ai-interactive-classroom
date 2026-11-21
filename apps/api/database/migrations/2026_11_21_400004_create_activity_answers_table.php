<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * activity_answers — P06-T01
 * id (uuid), activity_id, question_id, participant_id, response (json), submitted_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->uuid('question_id');
            $table->uuid('participant_id');
            $table->json('response')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->foreign('activity_id')->references('id')->on('activities')->cascadeOnDelete();
            $table->foreign('question_id')->references('id')->on('activity_questions')->cascadeOnDelete();
            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();

            $table->index('activity_id');
            $table->index('participant_id');
            // Unique: one answer per participant per question
            $table->unique(['question_id', 'participant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_answers');
    }
};
