<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'classroom_id', 'host_id', 'code', 'status', 'mode',
        'settings', 'starts_at', 'ends_at',
    ];

    protected $casts = [
        'settings'  => 'array',
        'starts_at' => 'datetime',
        'ends_at'   => 'datetime',
    ];

    // ── Relationships ───────────────────────────────────────────────────────

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(Participant::class);
    }

    public function whiteboards(): HasMany
    {
        return $this->hasMany(Whiteboard::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(RoomEvent::class);
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(RoomSnapshot::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    // ── Domain helpers ──────────────────────────────────────────────────────

    /** Generate a unique 8-char join code (uppercase alphanum, no ambiguous chars). */
    public static function generateCode(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        do {
            $code = '';
            for ($i = 0; $i < 8; $i++) {
                $code .= $chars[random_int(0, strlen($chars) - 1)];
            }
        } while (self::where('code', $code)->exists());

        return $code;
    }

    public function isLive(): bool
    {
        return $this->status === 'live';
    }

    public function isEnded(): bool
    {
        return in_array($this->status, ['ended', 'archived'], true);
    }

    public function canTransitionTo(string $newStatus): bool
    {
        $allowed = [
            'draft'     => ['scheduled', 'lobby', 'live', 'ended'],
            'scheduled' => ['lobby', 'live', 'ended'],
            'lobby'     => ['live', 'ended'],
            'live'      => ['ended'],
            'ended'     => ['archived'],
            'archived'  => [],
        ];

        return in_array($newStatus, $allowed[$this->status] ?? [], true);
    }
}
