<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class School extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'slug', 'settings'];

    protected $casts = [
        'settings' => 'array',
    ];

    public function memberships(): HasMany
    {
        return $this->hasMany(SchoolMembership::class);
    }

    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }
}
