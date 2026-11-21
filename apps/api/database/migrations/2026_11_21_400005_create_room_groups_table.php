<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * room_groups — P06-T01
 * id (uuid), room_id, name, whiteboard_id (nullable — each group may have its own board)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('room_groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->string('name', 120);
            $table->uuid('whiteboard_id')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->foreign('whiteboard_id')->references('id')->on('whiteboards')->nullOnDelete();
            $table->index('room_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('room_groups');
    }
};
