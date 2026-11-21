<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolMembership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SchoolController extends Controller
{
    /**
     * GET /api/v1/schools
     * platform_admin: all schools; others: only schools they're members of.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === 'platform_admin') {
            $schools = School::orderBy('name')->get();
        } else {
            $schools = School::whereHas('memberships', fn ($q) => $q->where('user_id', $user->id))
                ->orderBy('name')
                ->get();
        }

        return response()->json(['data' => $schools]);
    }

    /**
     * POST /api/v1/schools
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', School::class);

        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'slug'     => ['nullable', 'string', 'max:100', 'unique:schools,slug', 'regex:/^[a-z0-9-]+$/'],
            'settings' => ['nullable', 'array'],
        ]);

        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        $school = School::create($data);

        // Auto-enroll creator as school admin
        SchoolMembership::create([
            'school_id' => $school->id,
            'user_id'   => $request->user()->id,
            'role'      => 'admin',
        ]);

        return response()->json(['data' => $school], 201);
    }

    /**
     * GET /api/v1/schools/{school}
     */
    public function show(Request $request, School $school): JsonResponse
    {
        $this->authorize('view', $school);

        return response()->json(['data' => $school]);
    }

    /**
     * PATCH /api/v1/schools/{school}
     */
    public function update(Request $request, School $school): JsonResponse
    {
        $this->authorize('update', $school);

        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255'],
            'settings' => ['sometimes', 'nullable', 'array'],
        ]);

        $school->update($data);

        return response()->json(['data' => $school->fresh()]);
    }
}
