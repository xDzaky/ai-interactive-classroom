<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AiJob;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * PrivacyController — P09-T02
 *
 * Routes (all require auth:sanctum):
 *   GET    /api/v1/me/export  → user's own data export (GDPR)
 *   DELETE /api/v1/me         → anonymize account (GDPR erasure)
 */
class PrivacyController extends Controller
{
    /**
     * Export the authenticated user's own data.
     * GET /api/v1/me/export
     */
    public function export(Request $request): JsonResponse
    {
        $user = $request->user();

        $rooms = Room::query()
            ->where('host_id', $user->id)
            ->select(['id', 'code', 'status', 'mode', 'starts_at', 'ends_at', 'created_at'])
            ->get();

        $aiJobs = AiJob::query()
            ->where('user_id', $user->id)
            ->select(['id', 'type', 'status', 'tokens_used', 'created_at', 'finished_at'])
            ->get();

        return response()->json([
            'exported_at' => now()->toISOString(),
            'user'        => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->role,
                'created_at' => $user->created_at?->toISOString(),
            ],
            'rooms'       => $rooms,
            'ai_jobs'     => $aiJobs,
        ]);
    }

    /**
     * Anonymize the authenticated user's account (GDPR right to erasure).
     * DELETE /api/v1/me
     *
     * Anonymizes PII; does not hard-delete to preserve room/event audit trails.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke all Sanctum tokens first
        $user->tokens()->delete();

        // Anonymize PII fields
        DB::table('users')->where('id', $user->id)->update([
            'name'       => 'Deleted User',
            'email'      => 'deleted+' . $user->id . '@anon.invalid',
            'password'   => '',
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Account anonymized successfully.'], 200);
    }
}
