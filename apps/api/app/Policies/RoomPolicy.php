<?php

namespace App\Policies;

use App\Models\Classroom;
use App\Models\Room;
use App\Models\User;

class RoomPolicy
{
    /** Create a room inside a classroom — teacher or school admin only. */
    public function create(User $user, Classroom $classroom): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        // Must be the classroom teacher
        if ($classroom->teacher_id === $user->id) {
            return true;
        }

        // Or a school admin
        return $classroom->school->memberships()
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->exists();
    }

    /** View room — host or any participant with a valid session. */
    public function view(User $user, Room $room): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        return $room->host_id === $user->id
            || $room->participants()->where('user_id', $user->id)->exists();
    }

    /** Update settings / mode — host only. */
    public function update(User $user, Room $room): bool
    {
        if ($user->role === 'platform_admin') {
            return true;
        }

        return $room->host_id === $user->id;
    }

    /** End room — host only. */
    public function end(User $user, Room $room): bool
    {
        return $this->update($user, $room);
    }

    /** Regenerate join code — host only, room must not be ended/archived. */
    public function regenerateCode(User $user, Room $room): bool
    {
        if (!$this->update($user, $room)) {
            return false;
        }

        return !$room->isEnded();
    }
}
