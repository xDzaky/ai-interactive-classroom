<?php

namespace App\Policies;

use App\Models\School;
use App\Models\User;

class SchoolPolicy
{
    /**
     * platform_admin sees all schools; others only see schools they're members of.
     */
    public function viewAny(User $user): bool
    {
        return true; // filtered in controller
    }

    public function view(User $user, School $school): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        return $school->memberships()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['platform_admin', 'school_admin'], true);
    }

    public function update(User $user, School $school): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        return $school->memberships()
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();
    }
}
