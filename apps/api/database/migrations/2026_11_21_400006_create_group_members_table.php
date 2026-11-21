<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * group_members — P06-T01
 * id (uuid), group_id, participant_id, is_leader (bool)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_members', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('group_id');
            $table->uuid('participant_id');
            $table->boolean('is_leader')->default(false);
            $table->timestamps();

            $table->foreign('group_id')->references('id')->on('room_groups')->cascadeOnDelete();
            $table->foreign('participant_id')->references('id')->on('participants')->cascadeOnDelete();

            $table->index('group_id');
            $table->unique(['group_id', 'participant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_members');
    }
};
