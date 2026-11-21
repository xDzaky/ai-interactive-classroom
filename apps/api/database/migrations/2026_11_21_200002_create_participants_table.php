<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * participants — P04-T01
 * id (uuid), room_id, user_id (nullable), alias, role (enum: teacher_host, presenter, student, guest_student, group_leader),
 * token_hash, joined_at, left_at
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->uuid('user_id')->nullable();
            $table->string('alias', 60);
            $table->enum('role', ['teacher_host', 'presenter', 'student', 'guest_student', 'group_leader'])->default('student');
            $table->string('token_hash', 64);
            $table->timestamp('joined_at')->nullable();
            $table->timestamp('left_at')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            $table->index('room_id');
            $table->index('user_id');
            // token_hash index for fast lookup on join
            $table->index('token_hash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participants');
    }
};
