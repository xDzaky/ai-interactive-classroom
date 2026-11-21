<?php

namespace App\Http\Middleware;

use App\Models\Participant;
use Closure;
use Illuminate\Http\Request;

/**
 * Resolves a participant from the Authorization: Participant <raw_token> header
 * and sets request('participant') for use in channel auth callbacks.
 *
 * Token format: base64url(participantId) . '.' . HMAC-SHA256(participantId, APP_KEY)
 * Stored in DB as: hash('sha256', rawToken) in participants.token_hash
 */
class ParticipantTokenGuard
{
    public function handle(Request $request, Closure $next): mixed
    {
        $authHeader = $request->header('Authorization', '');

        if (str_starts_with($authHeader, 'Participant ')) {
            $rawToken = substr($authHeader, 12); // "Participant " is 12 chars
            $this->resolveParticipant($request, $rawToken);
        }

        // Also check X-Participant-Token header (alternative for WS handshake)
        if (! $request->attributes->has('participant')) {
            $rawToken = $request->header('X-Participant-Token') ?? $request->input('participant_token');
            if ($rawToken) {
                $this->resolveParticipant($request, $rawToken);
            }
        }

        return $next($request);
    }

    private function resolveParticipant(Request $request, string $rawToken): void
    {
        $tokenHash   = hash('sha256', $rawToken);
        $participant = Participant::where('token_hash', $tokenHash)
            ->whereNull('left_at')
            ->first();

        if ($participant) {
            $request->attributes->set('participant', $participant);
        }
    }
}
