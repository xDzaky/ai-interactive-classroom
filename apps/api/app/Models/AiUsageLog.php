<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AiUsageLog — P08-T05
 * Append-only token usage record per AI job.
 *
 * @property string $id
 * @property string $user_id
 * @property string|null $school_id
 * @property string $job_id
 * @property string $model
 * @property int $prompt_tokens
 * @property int $completion_tokens
 * @property float $cost_usd
 * @property \Carbon\Carbon $created_at
 */
class AiUsageLog extends Model
{
    use HasUuids;

    protected $table = 'ai_usage_logs';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'school_id',
        'job_id',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'cost_usd',
    ];

    protected $casts = [
        'prompt_tokens'     => 'integer',
        'completion_tokens' => 'integer',
        'cost_usd'          => 'float',
        'created_at'        => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(AiJob::class, 'job_id');
    }
}
