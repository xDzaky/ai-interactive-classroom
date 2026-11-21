<?php

use App\Auth\ParticipantAuthAdapter;
use App\Models\Participant;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channel Definitions
|--------------------------------------------------------------------------
|
| Channel names and permissions are defined in ai-plan/CONTRACTS.md §Channels.
|
| Channels (after prefix normalization by Pusher broadcaster):
|   room.{roomId}       — private + presence: any active participant
|   room.{roomId}.host  — private: host only
|
| Note: Pusher normalises 'private-X' and 'presence-X' to 'X' before
| matching channel patterns. So 'presence-room.{id}' maps to 'room.{id}'.
| Returning an array grants presence auth; returning true grants private auth;
| returning false denies.
|
| Auth strategies:
|   1. Sanctum SPA cookie auth → $user is the User model
|   2. Participant token guard  → $user is ParticipantAuthAdapter
|
*/

// ── room.{roomId} — any active participant (private + presence) ───────────────
//
// Private channels (private-room.{id}) expect true/false.
// Presence channels (presence-room.{id}) expect array/false.
// Both normalise to room.{roomId}, so we always return the participant array
// (which is truthy and also carries presence identity).
Broadcast::channel('room.{roomId}', function ($user, string $roomId): array|false {
    // ParticipantAuthAdapter path (guest or token-authenticated participant)
    if ($user instanceof ParticipantAuthAdapter) {
        $p = $user->participant;
        if ($p->room_id === $roomId && $p->left_at === null) {
            return [
                'id'    => $p->id,
                'alias' => $p->alias,
                'role'  => $p->role,
            ];
        }

        return false;
    }

    // Sanctum user path
    if ($user && $user->id) {
        $participant = Participant::where('room_id', $roomId)
            ->where('user_id', $user->id)
            ->whereNull('left_at')
            ->first();

        if ($participant) {
            return [
                'id'    => $participant->id,
                'alias' => $participant->alias,
                'role'  => $participant->role,
            ];
        }
    }

    return false;
}, ['guards' => ['sanctum', 'participant']]);

// ── room.{roomId}.host — host only (private) ─────────────────────────────────
Broadcast::channel('room.{roomId}.host', function ($user, string $roomId): array|false {
    // ParticipantAuthAdapter path
    if ($user instanceof ParticipantAuthAdapter) {
        $p = $user->participant;
        if ($p->room_id === $roomId && $p->role === 'teacher_host' && $p->left_at === null) {
            return [
                'id'    => $p->id,
                'alias' => $p->alias,
                'role'  => $p->role,
            ];
        }

        return false;
    }

    // Sanctum user path
    if ($user && $user->id) {
        $participant = Participant::where('room_id', $roomId)
            ->where('user_id', $user->id)
            ->where('role', 'teacher_host')
            ->whereNull('left_at')
            ->first();

        if ($participant) {
            return [
                'id'    => $participant->id,
                'alias' => $participant->alias,
                'role'  => $participant->role,
            ];
        }
    }

    return false;
}, ['guards' => ['sanctum', 'participant']]);
