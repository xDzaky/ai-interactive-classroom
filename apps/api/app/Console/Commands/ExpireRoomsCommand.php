<?php

namespace App\Console\Commands;

use App\Models\Room;
use Illuminate\Console\Command;

/**
 * rooms:expire — Mark live/lobby rooms as ended when their ends_at has passed.
 * Schedule: every minute via Artisan scheduler.
 *
 * Usage: php artisan rooms:expire [--dry-run]
 */
class ExpireRoomsCommand extends Command
{
    protected $signature   = 'rooms:expire {--dry-run : Print what would be ended without changing DB}';
    protected $description = 'End rooms whose ends_at timestamp has passed.';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');

        $expirable = Room::whereIn('status', ['live', 'lobby', 'scheduled'])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->get();

        if ($expirable->isEmpty()) {
            $this->line('No rooms to expire.');
            return self::SUCCESS;
        }

        foreach ($expirable as $room) {
            $this->line("{'$dryRun' ? '[DRY-RUN] ' : ''}Expiring room {$room->id} (code={$room->code}, status={$room->status})");

            if (!$dryRun) {
                $room->update(['status' => 'ended']);
            }
        }

        $this->info(($dryRun ? '[DRY-RUN] Would expire' : 'Expired') . " {$expirable->count()} room(s).");

        return self::SUCCESS;
    }
}
