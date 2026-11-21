<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomEvent extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'room_id', 'seq', 'event_type', 'payload', 'actor_id', 'idempotency_key', 'committed_at',
    ];

    protected $casts = [
        'payload'      => 'array',
        'committed_at' => 'datetime',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
