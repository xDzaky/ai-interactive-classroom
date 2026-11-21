<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * DeleteOldRooms — P09-T02
 *
 * Soft-deletes (marks archived) rooms that ended more than 90 days ago.
 * Dispatched nightly via scheduler.
 *
 * Usage: php artisan rooms:prune [--days=90] [--dry-run]
 */
class DeleteOldRooms extends Command
{
    protected $signature = 'rooms:prune
        {--days=90 : Rooms ended more than this many days ago are pruned}
        {--dry-run : Show what would be deleted without deleting}';

    protected $description = 'Archive old ended rooms (data retention policy, default: 90 days)';

    public function handle(): int
    {
        $days      = (int) $this->option('days');
        $dryRun    = (bool) $this->option('dry-run');
        $threshold = now()->subDays($days);

        $query = DB::table('rooms')
            ->where('status', 'ended')
            ->where('ends_at', '<', $threshold);

        $count = $query->count();

        if ($dryRun) {
            $this->info("[dry-run] Would archive {$count} room(s) ended before {$threshold->toDateString()}.");
            return self::SUCCESS;
        }

        // Mark rooms as archived rather than hard-deleting (preserves audit trail)
        $updated = DB::table('rooms')
            ->where('status', 'ended')
            ->where('ends_at', '<', $threshold)
            ->update(['status' => 'archived', 'updated_at' => now()]);

        $this->info("Archived {$updated} room(s) ended before {$threshold->toDateString()}.");

        return self::SUCCESS;
    }
}
