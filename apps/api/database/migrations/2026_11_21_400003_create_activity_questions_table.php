<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * activity_questions — P06-T01
 * id (uuid), activity_id, body (text), options (json), answer_key (json, hidden from students),
 * sort_order (int)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('activity_id');
            $table->text('body');
            $table->json('options')->nullable();
            $table->json('answer_key')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('activity_id')->references('id')->on('activities')->cascadeOnDelete();
            $table->index('activity_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_questions');
    }
};
