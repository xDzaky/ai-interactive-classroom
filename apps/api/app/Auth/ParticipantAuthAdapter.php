<?php

namespace App\Auth;

use App\Models\Participant;
use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Wraps a Participant model so it can be used as an Authenticatable in channel guards.
 * The channel callbacks receive this adapter as $user.
 */
class ParticipantAuthAdapter implements Authenticatable
{
    public function __construct(public readonly Participant $participant) {}

    /** Used by channel callbacks: $user->id returns participant's user_id or the participant id */
    public function __get(string $name): mixed
    {
        if ($name === 'id') {
            // For channel auth checks, we look up by user_id; fall back to participant id
            return $this->participant->user_id ?? $this->participant->id;
        }

        return $this->participant->{$name} ?? null;
    }

    public function __isset(string $name): bool
    {
        return isset($this->participant->{$name});
    }

    // ── Authenticatable contract ──────────────────────────────────────────────

    public function getAuthIdentifierName(): string
    {
        return 'id';
    }

    public function getAuthIdentifier(): mixed
    {
        return $this->participant->user_id ?? $this->participant->id;
    }

    public function getAuthPasswordName(): string
    {
        return 'password';
    }

    public function getAuthPassword(): string
    {
        return '';
    }

    public function getRememberToken(): string
    {
        return '';
    }

    public function setRememberToken(mixed $value): void {}

    public function getRememberTokenName(): string
    {
        return '';
    }
}
