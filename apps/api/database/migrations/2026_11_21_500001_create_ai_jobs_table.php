<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P08-T05 — AI Jobs + Usage Logs tables.
 * Contracts: ai_jobs (id, room_id, user_id, type, status, result, tokens_used, finished_at)
 *            ai_usage_logs (id, user_id, school_id, job_id, model, prompt_tokens, completion_tokens, cost_usd)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id')->nullable();
            $table->uuid('user_id');
            $table->string('type', 64);
            $table->enum('status', ['pending', 'running', 'done', 'failed'])->default('pending');
            $table->json('payload')->nullable();
            $table->json('result')->nullable();
            $table->unsignedInteger('tokens_used')->default(0);
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['user_id', 'created_at']);
            $table->index(['room_id', 'created_at']);
        });

        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('school_id')->nullable();
            $table->uuid('job_id');
            $table->string('model', 128);
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->decimal('cost_usd', 10, 6)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('job_id')->references('id')->on('ai_jobs')->onDelete('cascade');
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_jobs');
    }
};
