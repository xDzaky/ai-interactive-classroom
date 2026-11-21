<?php

namespace App\Providers;

use App\Models\Classroom;
use App\Models\Room;
use App\Models\School;
use App\Policies\ClassroomPolicy;
use App\Policies\RoomPolicy;
use App\Policies\SchoolPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Register policies (Laravel 11: use Gate::policy in boot())
        Gate::policy(School::class, SchoolPolicy::class);
        Gate::policy(Classroom::class, ClassroomPolicy::class);
        Gate::policy(Room::class, RoomPolicy::class);
    }
}
