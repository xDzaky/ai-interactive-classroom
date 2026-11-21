<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomSnapshot extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = ['room_id', 'seq_at', 'state', 'created_at'];

    protected $casts = [
        'state'      => 'array',
        'created_at' => 'datetime',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
