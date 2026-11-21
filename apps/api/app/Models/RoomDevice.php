<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * RoomDevice — P05-T02
 * A paired mobile controller device for a room.
 */
class RoomDevice extends Model
{
    use HasFactory;
    protected $keyType   = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'id', 'room_id', 'device_id', 'device_name', 'token_hash',
        'paired_at', 'revoked_at',
    ];

    protected $casts = [
        'paired_at'  => 'datetime',
        'revoked_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
            if (empty($model->device_id)) {
                $model->device_id = (string) Str::uuid();
            }
        });
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
