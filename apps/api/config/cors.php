<?php

return [

    /*
    |--------------------------------------------------------------------------
    | CORS Configuration — AI Interactive Classroom
    |--------------------------------------------------------------------------
    | The web frontend (Vite dev server) runs on :5173.
    | The Laravel API runs on :8000.
    | For production, set CORS_ALLOWED_ORIGINS in .env.
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000')),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // Must be true for Sanctum SPA cookie auth (credentials must be included in XHR)
    'supports_credentials' => true,

];
