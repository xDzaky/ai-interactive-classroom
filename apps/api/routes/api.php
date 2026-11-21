<?php

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — AI Interactive Classroom
|--------------------------------------------------------------------------
| All routes are prefixed with /api (see bootstrap/app.php)
| Auth routes use Sanctum SPA cookie auth.
| Guest/controller routes use participant/device tokens.
|--------------------------------------------------------------------------
*/

// Health check — no auth required
Route::get('/health', function (): JsonResponse {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
        'version' => config('app.version', '0.1.0'),
    ]);
})->name('health');

// API v1 group
Route::prefix('v1')->name('api.v1.')->group(function () {

    // Auth (Sanctum SPA cookie)
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::post('/login', [\App\Http\Controllers\Api\V1\Auth\LoginController::class, 'store'])
            ->name('login');
        Route::post('/logout', [\App\Http\Controllers\Api\V1\Auth\LoginController::class, 'destroy'])
            ->middleware('auth:sanctum')
            ->name('logout');
        Route::get('/me', [\App\Http\Controllers\Api\V1\Auth\LoginController::class, 'show'])
            ->middleware('auth:sanctum')
            ->name('me');
    });

    // Schools & Classrooms (teacher/admin only — implemented in P01)
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('schools', \App\Http\Controllers\Api\V1\SchoolController::class)
            ->only(['index', 'store', 'show', 'update']);

        Route::prefix('schools/{school}')->name('schools.classrooms.')->group(function () {
            Route::get('/classrooms', [\App\Http\Controllers\Api\V1\ClassroomController::class, 'index'])
                ->name('index');
            Route::post('/classrooms', [\App\Http\Controllers\Api\V1\ClassroomController::class, 'store'])
                ->name('store');
        });

        Route::apiResource('classrooms', \App\Http\Controllers\Api\V1\ClassroomController::class)
            ->only(['show', 'update']);
    });

    // Rooms (implemented in P04)
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('rooms', \App\Http\Controllers\Api\V1\RoomController::class)
            ->only(['store', 'show', 'update']);
        Route::post('/rooms/{room}/end', [\App\Http\Controllers\Api\V1\RoomController::class, 'end'])
            ->name('rooms.end');
        Route::post('/rooms/{room}/regenerate-code', [\App\Http\Controllers\Api\V1\RoomController::class, 'regenerateCode'])
            ->name('rooms.regenerate-code');
    });

    // Room join (guest or account) — rate-limited: 10 attempts/minute per IP
    Route::middleware('throttle:10,1')
         ->post('/rooms/join', [\App\Http\Controllers\Api\V1\RoomController::class, 'join'])
         ->name('rooms.join');

    // AI Jobs (implemented in P08)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/ai/jobs', [\App\Http\Controllers\Api\V1\AiJobController::class, 'store'])
            ->name('ai.jobs.store');
        Route::get('/ai/jobs/{job}', [\App\Http\Controllers\Api\V1\AiJobController::class, 'show'])
            ->name('ai.jobs.show');
    });
});
