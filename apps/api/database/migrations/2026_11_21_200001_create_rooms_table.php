<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * rooms — P04-T01
 * id (uuid), classroom_id, host_id, code (unique), status (enum: draft, scheduled, lobby, live, ended, archived),
 * mode (enum: projector, smart_display, mobile_host, group), settings (json), starts_at, ends_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('classroom_id');
            $table->uuid('host_id');
            $table->string('code', 12)->unique();
            $table->enum('status', ['draft', 'scheduled', 'lobby', 'live', 'ended', 'archived'])->default('draft');
            $table->enum('mode', ['projector', 'smart_display', 'mobile_host', 'group'])->default('projector');
            $table->json('settings')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->foreign('classroom_id')->references('id')->on('classrooms')->cascadeOnDelete();
            $table->foreign('host_id')->references('id')->on('users')->cascadeOnDelete();

            $table->index('classroom_id');
            $table->index('host_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
