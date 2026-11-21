<?php

namespace App\Auth;

use App\Models\Participant;
use Illuminate\Auth\GuardHelpers;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Http\Request;

/**
 * Custom auth guard for participant tokens.
 *
 * Token format: base64url(participantId) . '.' . HMAC-SHA256(participantId, APP_KEY)
 * This guard wraps the participant in a simple object that satisfies Authenticatable.
 */
class ParticipantGuard implements Guard
{
    use GuardHelpers;

    public function __construct(private Request $request) {}

    public function user(): ?\Illuminate\Contracts\Auth\Authenticatable
    {
        if ($this->user !== null) {
            return $this->user;
        }

        $rawToken = $this->extractToken();
        if (! $rawToken) {
            return null;
        }

        $tokenHash   = hash('sha256', $rawToken);
        $participant = Participant::where('token_hash', $tokenHash)
            ->whereNull('left_at')
            ->first();

        if (! $participant) {
            return null;
        }

        // Wrap participant in authenticatable adapter
        $this->user = new ParticipantAuthAdapter($participant);

        return $this->user;
    }

    public function validate(array $credentials = []): bool
    {
        return false; // token-only guard
    }

    private function extractToken(): ?string
    {
        $authHeader = $this->request->header('Authorization', '');
        if (str_starts_with($authHeader, 'Participant ')) {
            return substr($authHeader, 12);
        }

        return $this->request->header('X-Participant-Token')
            ?? $this->request->input('participant_token');
    }
}
