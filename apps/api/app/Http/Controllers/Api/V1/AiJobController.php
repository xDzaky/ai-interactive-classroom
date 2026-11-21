<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Implemented in P08-T05 */
class AiJobController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P08-T05'], 501);
    }

    public function show(Request $request, string $job): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P08-T05'], 501);
    }
}
