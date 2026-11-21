<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\School;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassroomController extends Controller
{
    /**
     * GET /api/v1/schools/{school}/classrooms
     */
    public function index(Request $request, School $school): JsonResponse
    {
        $this->authorize('viewAny', [Classroom::class, $school]);

        $classrooms = $school->classrooms()
            ->with('teacher:id,name,email')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $classrooms]);
    }

    /**
     * POST /api/v1/schools/{school}/classrooms
     */
    public function store(Request $request, School $school): JsonResponse
    {
        $this->authorize('create', [Classroom::class, $school]);

        $data = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'subject'     => ['nullable', 'string', 'max:100'],
            'grade_level' => ['nullable', 'string', 'max:50'],
            'teacher_id'  => ['nullable', 'uuid', 'exists:users,id'],
        ]);

        $classroom = $school->classrooms()->create([
            'name'        => $data['name'],
            'subject'     => $data['subject'] ?? null,
            'grade_level' => $data['grade_level'] ?? null,
            'teacher_id'  => $data['teacher_id'] ?? $request->user()->id,
            'school_id'   => $school->id,
        ]);

        return response()->json(['data' => $classroom->load('teacher:id,name,email')], 201);
    }

    /**
     * GET /api/v1/classrooms/{classroom}
     */
    public function show(Request $request, Classroom $classroom): JsonResponse
    {
        $this->authorize('view', $classroom);

        return response()->json(['data' => $classroom->load('teacher:id,name,email', 'school:id,name,slug')]);
    }

    /**
     * PATCH /api/v1/classrooms/{classroom}
     */
    public function update(Request $request, Classroom $classroom): JsonResponse
    {
        $this->authorize('update', $classroom);

        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:255'],
            'subject'     => ['sometimes', 'nullable', 'string', 'max:100'],
            'grade_level' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        $classroom->update($data);

        return response()->json(['data' => $classroom->fresh()->load('teacher:id,name,email')]);
    }
}
