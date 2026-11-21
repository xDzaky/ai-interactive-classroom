<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * group_submissions — P06-T01
 * id (uuid), group_id, activity_id, content (json), submitted_by, submitted_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_submissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('group_id');
            $table->uuid('activity_id');
            $table->json('content')->nullable();
            $table->uuid('submitted_by')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->foreign('group_id')->references('id')->on('room_groups')->cascadeOnDelete();
            $table->foreign('activity_id')->references('id')->on('activities')->cascadeOnDelete();
            $table->foreign('submitted_by')->references('id')->on('participants')->nullOnDelete();

            $table->index('group_id');
            $table->index('activity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_submissions');
    }
};
