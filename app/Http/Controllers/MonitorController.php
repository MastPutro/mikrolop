<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SnmpInterfaceTraffic;
use App\Services\SNMPService;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MonitorController extends Controller
{
    /**
     * Display the MikroTik monitoring page
     */
    public function index()
    {
        return Inertia::render('Monitor/Server');
    }

    /**
     * API: Get traffic data for all interfaces (last 24 hours)
     */
    public function getTrafficData(Request $request)
    {
        try {
            // Get system info
            $systemInfo = $this->getSystemInfo();

            // Determine time range from request (in minutes), default 1440 (24h)
            $minutes = (int) $request->input('minutes', 1440);
            $allowedRanges = [10, 30, 60, 360, 720, 1440];
            if (!in_array($minutes, $allowedRanges)) {
                $minutes = 1440;
            }

            // Get traffic data for the selected time range
            $trafficData = SnmpInterfaceTraffic::where('polled_at', '>=', now()->subMinutes($minutes))
                ->orderBy('polled_at', 'asc')
                ->get();

            // Group by interface type, then by interface name
            $ethernet = [];
            $pppoe = [];

            $grouped = $trafficData->groupBy('interface_name');

            foreach ($grouped as $ifName => $records) {
                $type = $records->first()->interface_type;
                
                // Build history array
                $history = $records->map(function ($r) {
                    return [
                        'time' => Carbon::parse($r->polled_at)->format('H:i'),
                        'timestamp' => $r->polled_at->toIso8601String(),
                        'rx_bps' => (int) $r->rx_bps,
                        'tx_bps' => (int) $r->tx_bps,
                        'rx_errors' => (int) $r->rx_errors,
                        'tx_errors' => (int) $r->tx_errors,
                        'rx_discards' => (int) $r->rx_discards,
                        'tx_discards' => (int) $r->tx_discards,
                    ];
                })->values()->toArray();

                // Calculate stats
                $rxBpsValues = $records->pluck('rx_bps')->map(fn($v) => (int)$v);
                $txBpsValues = $records->pluck('tx_bps')->map(fn($v) => (int)$v);

                $stats = [
                    'rx' => [
                        'last' => $rxBpsValues->last() ?? 0,
                        'min' => $rxBpsValues->min() ?? 0,
                        'avg' => (int) ($rxBpsValues->avg() ?? 0),
                        'max' => $rxBpsValues->max() ?? 0,
                    ],
                    'tx' => [
                        'last' => $txBpsValues->last() ?? 0,
                        'min' => $txBpsValues->min() ?? 0,
                        'avg' => (int) ($txBpsValues->avg() ?? 0),
                        'max' => $txBpsValues->max() ?? 0,
                    ],
                    'rx_errors' => [
                        'last' => (int) ($records->last()->rx_errors ?? 0),
                        'min' => (int) ($records->min('rx_errors') ?? 0),
                        'avg' => (int) ($records->avg('rx_errors') ?? 0),
                        'max' => (int) ($records->max('rx_errors') ?? 0),
                    ],
                    'tx_errors' => [
                        'last' => (int) ($records->last()->tx_errors ?? 0),
                        'min' => (int) ($records->min('tx_errors') ?? 0),
                        'avg' => (int) ($records->avg('tx_errors') ?? 0),
                        'max' => (int) ($records->max('tx_errors') ?? 0),
                    ],
                    'rx_discards' => [
                        'last' => (int) ($records->last()->rx_discards ?? 0),
                        'min' => (int) ($records->min('rx_discards') ?? 0),
                        'avg' => (int) ($records->avg('rx_discards') ?? 0),
                        'max' => (int) ($records->max('rx_discards') ?? 0),
                    ],
                    'tx_discards' => [
                        'last' => (int) ($records->last()->tx_discards ?? 0),
                        'min' => (int) ($records->min('tx_discards') ?? 0),
                        'avg' => (int) ($records->avg('tx_discards') ?? 0),
                        'max' => (int) ($records->max('tx_discards') ?? 0),
                    ],
                ];

                $interfaceData = [
                    'name' => $ifName,
                    'type' => $type,
                    'history' => $history,
                    'stats' => $stats,
                ];

                if ($type === 'ethernet') {
                    $ethernet[] = $interfaceData;
                } else {
                    $pppoe[] = $interfaceData;
                }
            }

            // Sort by name
            usort($ethernet, fn($a, $b) => strnatcmp($a['name'], $b['name']));
            usort($pppoe, fn($a, $b) => strnatcmp($a['name'], $b['name']));

            return response()->json([
                'success' => true,
                'data' => [
                    'system' => $systemInfo,
                    'ethernet' => $ethernet,
                    'pppoe' => $pppoe,
                    'last_updated' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching traffic data: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Gagal memuat data monitoring: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get system info from SNMP
     */
    private function getSystemInfo(): array
    {
        try {
            $snmpService = new SNMPService(
                host: env('MIKROTIK_HOST'),
                community: env('SNMP_COMMUNITY', 'public')
            );

            $resources = $snmpService->getSystemResources();
            $cpuLoad = $snmpService->getCPULoad();

            // Extract board name
            $boardName = 'Mikrotik';
            $sysDescr = $resources['sysDescr'] ?? '';
            if (preg_match('/RouterOS\s+(\S+)/i', $sysDescr, $m)) {
                $boardName = 'Mikrotik ' . $m[1];
            } elseif (!empty($sysDescr)) {
                $parts = explode(' ', trim($sysDescr));
                $boardName = implode(' ', array_slice($parts, 0, 3));
            }

            return [
                'board_name' => $boardName,
                'uptime' => $resources['uptime'] ?? 'N/A',
                'cpu_load' => $cpuLoad,
                'sys_name' => $resources['sysName'] ?? 'N/A',
            ];
        } catch (\Exception $e) {
            Log::warning('Could not fetch system info: ' . $e->getMessage());
            return [
                'board_name' => 'Mikrotik',
                'uptime' => 'N/A',
                'cpu_load' => 0,
                'sys_name' => 'N/A',
            ];
        }
    }
}
