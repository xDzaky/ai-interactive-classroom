<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * RequestLogger — P09-T06
 *
 * Logs structured JSON for every API request:
 * { level, type, method, path, status, duration_ms, timestamp }
 *
 * Uses Laravel's structured log channel (stderr/json in production).
 */
class RequestLogger
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $durationMs = round((microtime(true) - $start) * 1000, 2);

        // Only log API requests to keep noise low
        if ($request->is('api/*')) {
            Log::info('http_request', [
                'type'        => 'http_request',
                'method'      => $request->method(),
                'path'        => $request->path(),
                'status'      => $response->getStatusCode(),
                'duration_ms' => $durationMs,
                'ip'          => $request->ip(),
                'user_id'     => $request->user()?->id,
            ]);
        }

        return $response;
    }
}
