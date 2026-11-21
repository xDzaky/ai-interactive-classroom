<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentChunk extends Model
{
    use HasUuids;

    protected $fillable = [
        'document_id',
        'chunk_index',
        'text',
        'embedding',
    ];

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
