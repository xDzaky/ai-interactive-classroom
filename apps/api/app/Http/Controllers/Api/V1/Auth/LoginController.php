<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * LoginController — Sanctum SPA cookie auth.
 * Implemented fully in P01-T02.
 */
class LoginController extends Controller
{
    /** POST /api/v1/auth/login */
    public function store(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P01-T02'], 501);
    }

    /** POST /api/v1/auth/logout */
    public function destroy(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P01-T02'], 501);
    }

    /** GET /api/v1/auth/me */
    public function show(Request $request): JsonResponse
    {
        return response()->json(['message' => 'Not implemented — see P01-T02'], 501);
    }
}
