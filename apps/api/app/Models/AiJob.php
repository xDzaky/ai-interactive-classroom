<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * AiJob — P08-T05
 * Represents an async AI job submitted by a user.
 *
 * @property string $id
 * @property string|null $room_id
 * @property string $user_id
 * @property string $type
 * @property string $status  pending|running|done|failed
 * @property array|null $payload
 * @property array|null $result
 * @property int $tokens_used
 * @property \Carbon\Carbon|null $finished_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class AiJob extends Model
{
    use HasUuids;

    protected $table = 'ai_jobs';

    protected $fillable = [
        'room_id',
        'user_id',
        'type',
        'status',
        'payload',
        'result',
        'tokens_used',
        'finished_at',
    ];

    protected $casts = [
        'payload'     => 'array',
        'result'      => 'array',
        'tokens_used' => 'integer',
        'finished_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function usageLogs(): HasMany
    {
        return $this->hasMany(AiUsageLog::class, 'job_id');
    }
}
