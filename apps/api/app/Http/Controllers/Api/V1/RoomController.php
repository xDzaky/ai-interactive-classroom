<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Implemented in P04-T02 */
class RoomController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P04-T02'], 501);
    }

    public function show(Request $request, string $room): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P04-T02'], 501);
    }

    public function update(Request $request, string $room): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P04-T02'], 501);
    }

    public function end(Request $request, string $room): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P04-T02'], 501);
    }

    public function regenerateCode(Request $request, string $room): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P04-T02'], 501);
    }

    public function join(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P04-T03'], 501);
    }
}
