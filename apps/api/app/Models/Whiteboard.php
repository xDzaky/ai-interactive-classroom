<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Whiteboard extends Model
{
    use HasUuids;

    protected $fillable = ['room_id', 'name', 'scene_data'];

    protected $casts = ['scene_data' => 'array'];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }
}
