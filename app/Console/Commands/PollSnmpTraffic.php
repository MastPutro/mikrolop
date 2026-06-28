<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SNMPService;
use App\Models\SnmpInterfaceTraffic;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class PollSnmpTraffic extends Command
{
    protected $signature = 'snmp:poll-traffic';
    protected $description = 'Poll SNMP interface traffic data and store in database (runs every minute via cron)';

    public function handle(): int
    {
        try {
            $snmpService = new SNMPService(
                host: env('MIKROTIK_HOST'),
                community: env('SNMP_COMMUNITY', 'public')
            );

            $polledAt = Carbon::now();
            $recordsCreated = 0;

            // Poll Ethernet interfaces
            $ethernetInterfaces = $snmpService->getEthernetInterfaces();
            foreach ($ethernetInterfaces as $iface) {
                try {
                    $rate = $snmpService->getInterfaceRate($iface['name'], 500);

                    SnmpInterfaceTraffic::create([
                        'interface_name' => $iface['name'],
                        'interface_type' => 'ethernet',
                        'rx_bytes' => $rate['rx_bytes'],
                        'tx_bytes' => $rate['tx_bytes'],
                        'rx_bps' => $rate['rx_bps'],
                        'tx_bps' => $rate['tx_bps'],
                        'rx_errors' => $rate['rx_errors'] ?? 0,
                        'tx_errors' => $rate['tx_errors'] ?? 0,
                        'rx_discards' => $rate['rx_discards'] ?? 0,
                        'tx_discards' => $rate['tx_discards'] ?? 0,
                        'polled_at' => $polledAt,
                    ]);
                    $recordsCreated++;
                } catch (\Exception $e) {
                    Log::warning("Failed to poll ethernet interface {$iface['name']}: " . $e->getMessage());
                }
            }

            // Poll PPPoE interfaces
            $pppInterfaces = $snmpService->getPPPInterfaces();
            foreach ($pppInterfaces as $iface) {
                try {
                    $rate = $snmpService->getInterfaceRate($iface['name'], 500);

                    SnmpInterfaceTraffic::create([
                        'interface_name' => $iface['name'],
                        'interface_type' => 'pppoe',
                        'rx_bytes' => $rate['rx_bytes'],
                        'tx_bytes' => $rate['tx_bytes'],
                        'rx_bps' => $rate['rx_bps'],
                        'tx_bps' => $rate['tx_bps'],
                        'rx_errors' => $rate['rx_errors'] ?? 0,
                        'tx_errors' => $rate['tx_errors'] ?? 0,
                        'rx_discards' => $rate['rx_discards'] ?? 0,
                        'tx_discards' => $rate['tx_discards'] ?? 0,
                        'polled_at' => $polledAt,
                    ]);
                    $recordsCreated++;
                } catch (\Exception $e) {
                    Log::warning("Failed to poll PPPoE interface {$iface['name']}: " . $e->getMessage());
                }
            }

            // Cleanup: remove data older than 24 hours
            $deleted = SnmpInterfaceTraffic::where('polled_at', '<', Carbon::now()->subHours(24))->delete();

            $this->info("Polled {$recordsCreated} interfaces. Cleaned up {$deleted} old records.");
            Log::info("SNMP poll completed: {$recordsCreated} records created, {$deleted} old records deleted.");

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error('SNMP polling failed: ' . $e->getMessage());
            Log::error('SNMP polling failed: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
