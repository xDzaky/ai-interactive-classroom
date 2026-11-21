<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Implemented in P01-T03 */
class SchoolController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P01-T03'], 501);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P01-T03'], 501);
    }

    public function show(Request $request, string $school): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P01-T03'], 501);
    }

    public function update(Request $request, string $school): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P01-T03'], 501);
    }
}
