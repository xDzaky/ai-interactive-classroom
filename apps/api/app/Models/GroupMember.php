<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * GroupMember — P06-T04
 * Maps a participant into a room group; one member can be the leader.
 */
class GroupMember extends Model
{
    use HasFactory;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'id', 'group_id', 'participant_id', 'is_leader',
    ];

    protected $casts = [
        'is_leader' => 'boolean',
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

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }
}
