<?php

namespace App\Policies;

use App\Models\Classroom;
use App\Models\School;
use App\Models\User;

class ClassroomPolicy
{
    public function viewAny(User $user, School $school): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        return $school->memberships()->where('user_id', $user->id)->exists();
    }

    public function view(User $user, Classroom $classroom): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        // Teacher owns the classroom, or member of the school
        return $classroom->teacher_id === $user->id
            || $classroom->school->memberships()->where('user_id', $user->id)->exists();
    }

    public function create(User $user, School $school): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        return $school->memberships()
            ->where('user_id', $user->id)
            ->whereIn('role', ['admin', 'teacher'])
            ->exists();
    }

    public function update(User $user, Classroom $classroom): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        // Only the classroom teacher or school admin can update
        if ($classroom->teacher_id === $user->id) {
            return true;
        }

        return $classroom->school->memberships()
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();
    }
}
