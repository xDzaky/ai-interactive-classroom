<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * ActivityQuestion — P06-T02
 * A single question inside an Activity (poll/quiz).
 * answer_key is NEVER sent to students.
 */
class ActivityQuestion extends Model
{
    use HasFactory;

    protected $keyType      = 'string';
    public    $incrementing = false;

    protected $fillable = [
        'id', 'activity_id', 'body', 'options', 'answer_key', 'sort_order',
    ];

    protected $casts = [
        'options'    => 'array',
        'answer_key' => 'array',
    ];

    /** Fields stripped when returning question data to students. */
    public const HIDDEN_FROM_STUDENTS = ['answer_key'];

    protected static function booted(): void
    {
        static::creating(function (self $model): void {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(ActivityAnswer::class, 'question_id');
    }
}
