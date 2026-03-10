<?php
// app/Console/Commands/SyncCustomerStatusCommand.php

namespace App\Console\Commands;

use App\Services\MikrotikStatusSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncCustomerStatusCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'customer:sync-status {--details : Include detailed information} {--show-detail : Show detailed output}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync customer status from Mikrotik PPP connections';

    protected $syncService;

    public function __construct(MikrotikStatusSyncService $syncService)
    {
        parent::__construct();
        $this->syncService = $syncService;
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting customer status sync from Mikrotik...');
        Log::info('Syncing customer status via artisan command');

        try {
            if ($this->option('details')) {
                $results = $this->syncWithDetails();
            } else {
                $results = $this->syncSimple();
            }

            $this->displayResults($results);
            
            Log::info('Customer status sync completed successfully');
            $this->info('✓ Sync completed successfully');
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('✗ Sync failed: ' . $e->getMessage());
            Log::error('Customer status sync failed: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Simple sync without details
     */
    private function syncSimple(): array
    {
        $results = $this->syncService->syncCustomerStatus();
        return $results;
    }

    /**
     * Sync with detailed information
     */
    private function syncWithDetails(): array
    {
        $results = $this->syncService->syncCustomerStatusWithDetails();
        return $results;
    }

    /**
     * Display sync results
     */
    private function displayResults(array $results)
    {
        if (isset($results['updated'])) {
            // Simple sync results
            $this->line('');
            $this->info('Sync Statistics:');
            $this->line('├─ Total Customers: ' . $results['total_customers']);
            $this->line('├─ Updated: ' . $results['updated']);
            $this->line('├─ Activated: ' . $results['activated']);
            $this->line('├─ Suspended: ' . $results['suspended']);
            $this->line('├─ Already Synced: ' . ($results['already_synced'] ?? 0));
            $this->line('├─ Not Found: ' . $results['not_found']);
            
            if (!empty($results['errors'])) {
                $this->line('└─ Errors: ' . count($results['errors']));
                $this->warn('');
                $this->warn('Errors encountered:');
                foreach ($results['errors'] as $error) {
                    $this->line("  - {$error['customer_name']}: {$error['error']}");
                }
            }
        } else {
            // Detailed sync results
            $this->line('');
            $this->info('Detailed Sync Results:');
            $this->line('├─ Total Customers: ' . $results['total_customers']);
            $this->line('├─ Successfully Synced: ' . count($results['synced']));
            $this->line('├─ Not Found in Mikrotik: ' . count($results['not_found']));
            
            if ($this->option('show-detail')) {
                if (!empty($results['synced'])) {
                    $this->line('');
                    $this->info('Synced Customers:');
                    foreach ($results['synced'] as $customer) {
                        $status = $customer['status'] === 'active' ? '<fg=green>Active</>' : '<fg=yellow>Suspended</>';
                        $this->line("  - {$customer['name']}: {$status}");
                    }
                }

                if (!empty($results['not_found'])) {
                    $this->line('');
                    $this->warn('Not Found in Mikrotik:');
                    foreach ($results['not_found'] as $customer) {
                        $this->line("  - {$customer['name']}");
                    }
                }
            }

            if (!empty($results['errors'])) {
                $this->line('└─ Errors: ' . count($results['errors']));
                $this->warn('');
                $this->warn('Errors encountered:');
                foreach ($results['errors'] as $error) {
                    $this->line("  - {$error['customer_name']}: {$error['error']}");
                }
            }
        }
    }
}
