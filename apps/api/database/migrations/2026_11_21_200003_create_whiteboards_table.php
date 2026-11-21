<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * whiteboards — P04-T01
 * id (uuid), room_id, name, scene_data (json)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whiteboards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('room_id');
            $table->string('name', 120)->default('Whiteboard');
            $table->json('scene_data')->nullable();
            $table->timestamps();

            $table->foreign('room_id')->references('id')->on('rooms')->cascadeOnDelete();
            $table->index('room_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whiteboards');
    }
};
