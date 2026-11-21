<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        channels: __DIR__.'/../routes/channels.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Security headers on every response
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        // Structured request logging for API routes
        $middleware->append(\App\Http\Middleware\RequestLogger::class);

        // Sanctum SPA cookie auth — stateful domains
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON for API and JSON-expecting requests
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Format validation errors as per CONTRACTS.md error format
        $exceptions->renderable(function (ValidationException $e, Request $request): JsonResponse {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'errors' => $e->errors(),
                    'code' => 'VALIDATION_ERROR',
                ], 422);
            }
        });
    })->create();
