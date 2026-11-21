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

    // Room events — open to participant token OR Sanctum auth (middleware resolves both)
    Route::middleware(\App\Http\Middleware\ParticipantTokenGuard::class)->group(function () {
        Route::post('/rooms/{room}/events', [\App\Http\Controllers\Api\V1\RoomEventController::class, 'store'])
            ->name('rooms.events.store');
        Route::get('/rooms/{room}/events', [\App\Http\Controllers\Api\V1\RoomEventController::class, 'index'])
            ->name('rooms.events.index');
        // Participant list — host or any participant
        Route::get('/rooms/{room}/participants', [\App\Http\Controllers\Api\V1\RoomController::class, 'participants'])
            ->name('rooms.participants.index');
        // Current participant (me)
        Route::get('/rooms/{room}/participants/me', [\App\Http\Controllers\Api\V1\RoomController::class, 'participantMe'])
            ->name('rooms.participants.me');

        // Presenter requests — P05-T02
        Route::post('/rooms/{room}/presenter-requests', [\App\Http\Controllers\Api\V1\PresenterRequestController::class, 'store'])
            ->name('rooms.presenter-requests.store');
        Route::get('/rooms/{room}/presenter-requests', [\App\Http\Controllers\Api\V1\PresenterRequestController::class, 'index'])
            ->name('rooms.presenter-requests.index');
        Route::patch('/rooms/{room}/presenter-requests/{presenterRequest}', [\App\Http\Controllers\Api\V1\PresenterRequestController::class, 'update'])
            ->name('rooms.presenter-requests.update');
        Route::delete('/rooms/{room}/presenter-requests/{presenterRequest}', [\App\Http\Controllers\Api\V1\PresenterRequestController::class, 'destroy'])
            ->name('rooms.presenter-requests.destroy');
    });

    // AI Jobs (implemented in P08)
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/ai/jobs', [\App\Http\Controllers\Api\V1\AiJobController::class, 'store'])
            ->name('ai.jobs.store');
        Route::get('/ai/jobs/{job}', [\App\Http\Controllers\Api\V1\AiJobController::class, 'show'])
            ->name('ai.jobs.show');

        // Device pairing — P05-T04 (host: Sanctum; confirm uses token in body)
        Route::post('/rooms/{room}/devices', [\App\Http\Controllers\Api\V1\DeviceController::class, 'store'])
            ->name('rooms.devices.store');
        Route::get('/rooms/{room}/devices', [\App\Http\Controllers\Api\V1\DeviceController::class, 'index'])
            ->name('rooms.devices.index');
        Route::delete('/rooms/{room}/devices/{device}', [\App\Http\Controllers\Api\V1\DeviceController::class, 'destroy'])
            ->name('rooms.devices.destroy');
    });

    // Device confirm — open route (device presents its own token in body/header)
    Route::post('/rooms/{room}/devices/{device}/confirm', [\App\Http\Controllers\Api\V1\DeviceController::class, 'confirm'])
        ->name('rooms.devices.confirm');

    // Activities (P06-T02) — host routes require Sanctum; answer requires participant token
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/rooms/{room}/activities', [\App\Http\Controllers\Api\V1\ActivityController::class, 'index'])
            ->name('rooms.activities.index');
        Route::post('/rooms/{room}/activities', [\App\Http\Controllers\Api\V1\ActivityController::class, 'store'])
            ->name('rooms.activities.store');
        Route::get('/rooms/{room}/activities/{activity}', [\App\Http\Controllers\Api\V1\ActivityController::class, 'show'])
            ->name('rooms.activities.show');
        Route::patch('/rooms/{room}/activities/{activity}', [\App\Http\Controllers\Api\V1\ActivityController::class, 'update'])
            ->name('rooms.activities.update');
        Route::get('/rooms/{room}/activities/{activity}/results', [\App\Http\Controllers\Api\V1\ActivityController::class, 'results'])
            ->name('rooms.activities.results');
    });

    // Activity answer — participant token auth
    Route::middleware(\App\Http\Middleware\ParticipantTokenGuard::class)->group(function () {
        Route::post('/rooms/{room}/activities/{activity}/answers', [\App\Http\Controllers\Api\V1\ActivityController::class, 'answer'])
            ->name('rooms.activities.answers.store');
    });

    // Groups (P06-T04) — host routes require Sanctum; submit requires participant token
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/rooms/{room}/groups', [\App\Http\Controllers\Api\V1\GroupController::class, 'index'])
            ->name('rooms.groups.index');
        Route::post('/rooms/{room}/groups', [\App\Http\Controllers\Api\V1\GroupController::class, 'store'])
            ->name('rooms.groups.store');
        Route::delete('/rooms/{room}/groups/{group}', [\App\Http\Controllers\Api\V1\GroupController::class, 'destroy'])
            ->name('rooms.groups.destroy');
        Route::post('/rooms/{room}/groups/{group}/members', [\App\Http\Controllers\Api\V1\GroupController::class, 'addMember'])
            ->name('rooms.groups.members.store');
        Route::delete('/rooms/{room}/groups/{group}/members/{participant}', [\App\Http\Controllers\Api\V1\GroupController::class, 'removeMember'])
            ->name('rooms.groups.members.destroy');
        Route::get('/rooms/{room}/groups/{group}/submissions', [\App\Http\Controllers\Api\V1\GroupController::class, 'submissions'])
            ->name('rooms.groups.submissions.index');
    });

    // Group submit — participant token (leader only)
    Route::middleware(\App\Http\Middleware\ParticipantTokenGuard::class)->group(function () {
        Route::post('/rooms/{room}/groups/{group}/submissions', [\App\Http\Controllers\Api\V1\GroupController::class, 'submit'])
            ->name('rooms.groups.submissions.store');
    });

    // Snapshots (P07-T01) — host creates, all auth can read
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/rooms/{room}/snapshots', [\App\Http\Controllers\Api\V1\SnapshotController::class, 'index'])
            ->name('rooms.snapshots.index');
        Route::post('/rooms/{room}/snapshots', [\App\Http\Controllers\Api\V1\SnapshotController::class, 'store'])
            ->name('rooms.snapshots.store');
        Route::get('/rooms/{room}/snapshots/nearest', [\App\Http\Controllers\Api\V1\SnapshotController::class, 'nearest'])
            ->name('rooms.snapshots.nearest');
    });

    // Documents / RAG ingestion (P08-T03) — teacher or school_admin
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/schools/{school}/documents', [\App\Http\Controllers\Api\V1\DocumentController::class, 'store'])
            ->name('schools.documents.store');
        Route::get('/schools/{school}/documents/{document}', [\App\Http\Controllers\Api\V1\DocumentController::class, 'show'])
            ->name('schools.documents.show');
    });

    // Privacy / GDPR (P09-T02) — own data only
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me/export', [\App\Http\Controllers\Api\V1\PrivacyController::class, 'export'])
            ->name('me.export');
        Route::delete('/me', [\App\Http\Controllers\Api\V1\PrivacyController::class, 'destroy'])
            ->name('me.destroy');
    });
});
