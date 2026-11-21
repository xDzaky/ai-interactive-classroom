<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * GroupSubmission — P06-T04
 * A group leader's submission for a group_task activity.
 */
class GroupSubmission extends Model
{
    use HasFactory;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'id', 'group_id', 'activity_id', 'content', 'submitted_by', 'submitted_at',
    ];

    protected $casts = [
        'content'      => 'array',
        'submitted_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(RoomGroup::class, 'group_id');
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(Participant::class, 'submitted_by');
    }
}
