<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * LoginController — Sanctum token auth (Bearer token returned on login).
 * SPA cookie mode is also supported via statefulApi() middleware.
 * Per CONTRACTS.md: POST /auth/login → {user, token}, GET /auth/me, POST /auth/logout
 */
class LoginController extends Controller
{
    /**
     * POST /api/v1/auth/login
     * Body: {email, password}
     * Response: {user, token}
     */
    public function store(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        // Revoke previous tokens for this device (device_name from request or default)
        $deviceName = $request->input('device_name', 'web');
        $user->tokens()->where('name', $deviceName)->delete();

        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json([
            'user'  => $this->userPayload($user),
            'token' => $token,
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     * Requires auth:sanctum middleware.
     * Revokes the current token.
     */
    public function destroy(Request $request): JsonResponse
    {
        // Revoke the token that was used to authenticate this request
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    /**
     * GET /api/v1/auth/me
     * Requires auth:sanctum middleware.
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    /** Shape the user object returned to the client per CONTRACTS.md */
    private function userPayload(User $user): array
    {
        return [
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'role'      => $user->role,
            'school_id' => $user->school_id,
        ];
    }
}
