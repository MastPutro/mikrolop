<?php

namespace App\Http\Controllers;

use App\Services\SNMPService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class MikrotikController extends Controller
{
    private $snmpService;

    public function __construct()
    {
        try {
            $this->snmpService = new SNMPService(
                host: env('MIKROTIK_HOST'),
                community: env('SNMP_COMMUNITY', 'public')
            );
        } catch (\Exception $e) {
            Log::error('Failed to initialize SNMP Service: ' . $e->getMessage());
        }
    }

    private function getMikrotikData()
    {
        try {
            if (!$this->snmpService) {
                throw new \Exception('SNMP Service not initialized');
            }

            Log::info('Fetching MikroTik data via SNMP...');

            // Get system resources via SNMP
            $systemResources = $this->snmpService->getSystemResources();
            
            // Get all interfaces via SNMP
            $interfaces = $this->snmpService->getInterfaces();
            
            // Get ethernet interfaces via SNMP
            $ethernetInterfaces = $this->snmpService->getEthernetInterfaces();

            // Format resources to match the expected format
            $resources = $this->formatSystemResources($systemResources);

            Log::info('MikroTik data fetched successfully: ' . count($interfaces) . ' interfaces, ' . count($ethernetInterfaces) . ' ethernet');

            return [
                'resources' => $resources,
                'interfaces' => $interfaces,
                'ethernetInterfaces' => $ethernetInterfaces,
            ];
        } catch (\Exception $e) {
            Log::error('Error getting Mikrotik data via SNMP: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Format system resources to match expected format
     * 
     * @param array $systemResources Raw SNMP system resources
     * @return array
     */
    private function formatSystemResources(array $systemResources): array
    {
        // Get CPU load from SNMP service
        $cpuLoad = 0;
        try {
            $cpuLoad = $this->snmpService->getCPULoad();
        } catch (\Exception $e) {
            Log::warning('Could not fetch CPU load: ' . $e->getMessage());
            $cpuLoad = 0;
        }

        return [
            'uptime' => $systemResources['uptime'] ?? 'Unknown',
            'board-name' => $this->extractBoardNameFromDescription($systemResources['sysDescr'] ?? ''),
            'cpu-load' => $cpuLoad,
        ];
    }

    /**
     * Extract board name from system description
     * MikroTik devices typically show the model in sysDescr
     * 
     * @param string $description System description
     * @return string
     */
    private function extractBoardNameFromDescription(string $description): string
    {
        // Try to extract MikroTik model from description
        if (preg_match('/MikroTik\s+([^\s]+)/i', $description, $matches)) {
            return $matches[1];
        }

        // Fallback: return first few words from description
        $parts = explode(' ', trim($description));
        return implode(' ', array_slice($parts, 0, 2)) ?: 'Unknown';
    }

    public function index()
    {
        try {
            $data = $this->getMikrotikData();
            return Inertia::render('Mikrotik/Index', $data);
        } catch (\Exception $e) {
            Log::error('MikrotikController error: ' . $e->getMessage());
            return Inertia::render('Mikrotik/Index', [
                'resources' => $this->getDefaultResources(),
                'interfaces' => [],
                'ethernetInterfaces' => [],
                'error' => 'Gagal koneksi ke MikroTik: ' . $e->getMessage(),
            ]);
        }
    }

    public function getResourcesApi()
    {
        try {
            $data = $this->getMikrotikData();
            return response()->json($data);
        } catch (\Exception $e) {
            Log::error('MikrotikController API error: ' . $e->getMessage());
            return response()->json([
                'resources' => $this->getDefaultResources(),
                'interfaces' => [],
                'ethernetInterfaces' => [],
                'error' => 'Gagal koneksi ke MikroTik: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get bandwidth stats for specific interfaces
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getInterfaceBandwidth(Request $request)
    {
        try {
            if (!$this->snmpService) {
                throw new \Exception('SNMP Service not initialized');
            }

            // Get interface name from request, default to ether1 and ether2
            $interfaces = $request->input('interfaces', ['ether6', 'ether8']);
            
            // If string provided, convert to array
            if (is_string($interfaces)) {
                $interfaces = [$interfaces];
            }

            $bandwidthData = [];

            foreach ($interfaces as $interfaceName) {
                try {
                    // Get rate data (RX/TX rate in bps, not bytes)
                    $rate = $this->snmpService->getInterfaceRate($interfaceName);
                    
                    $bandwidthData[$interfaceName] = [
                        'name' => $rate['name'],
                        'rx_bps' => $rate['rx_bps'],
                        'tx_bps' => $rate['tx_bps'],
                        'rx_kbps' => round($rate['rx_bps'] / 1000, 2),
                        'tx_kbps' => round($rate['tx_bps'] / 1000, 2),
                        'rx_mbps' => round($rate['rx_bps'] / 1000000, 2),
                        'tx_mbps' => round($rate['tx_bps'] / 1000000, 2),
                        'rx_formatted' => $this->snmpService->formatRate($rate['rx_bps']),
                        'tx_formatted' => $this->snmpService->formatRate($rate['tx_bps']),
                        'rx_bytes' => $rate['rx_bytes'],
                        'tx_bytes' => $rate['tx_bytes'],
                        'rx_errors' => $rate['rx_errors'] ?? 0,
                        'tx_errors' => $rate['tx_errors'] ?? 0,
                        'timestamp' => $rate['timestamp'],
                    ];
                } catch (\Exception $e) {
                    Log::warning("Error getting rate for interface $interfaceName: " . $e->getMessage());
                    $bandwidthData[$interfaceName] = [
                        'name' => $interfaceName,
                        'error' => $e->getMessage(),
                        'rx_bps' => 0,
                        'tx_bps' => 0,
                        'rx_kbps' => 0,
                        'tx_kbps' => 0,
                        'rx_mbps' => 0,
                        'tx_mbps' => 0,
                        'rx_formatted' => '0 bps',
                        'tx_formatted' => '0 bps',
                        'timestamp' => now()->toIso8601String(),
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $bandwidthData,
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching interface bandwidth: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Gagal mengambil data bandwidth: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get real-time bandwidth data for monitoring (with multiple samples)
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getInterfaceBandwidthHistory(Request $request)
    {
        try {
            if (!$this->snmpService) {
                throw new \Exception('SNMP Service not initialized');
            }

            $interfaceName = $request->input('interface', 'ether6');
            $samples = $request->input('samples', 5); // Number of samples to collect
            
            // This would typically retrieve historical data
            // For now, return current data with mock history
            $currentStats = $this->snmpService->getInterfaceStats($interfaceName);
            
            $history = [];
            for ($i = 0; $i < $samples; $i++) {
                $history[] = [
                    'timestamp' => now()->subMinutes($samples - $i)->toIso8601String(),
                    'rx_bytes' => $currentStats['rx_bytes'] ?? 0,
                    'tx_bytes' => $currentStats['tx_bytes'] ?? 0,
                    'rx_bps' => rand(1000000, 10000000), // Mock data in bps
                    'tx_bps' => rand(500000, 5000000),   // Mock data in bps
                ];
            }

            return response()->json([
                'success' => true,
                'interface' => $interfaceName,
                'data' => $history,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching interface bandwidth history: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Gagal mengambil riwayat bandwidth: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get default resources when SNMP unavailable
     */
    private function getDefaultResources(): array
    {
        return [
            'uptime' => 'N/A',
            'board-name' => 'Unknown',
            'cpu-load' => 0,
        ];
    }

}