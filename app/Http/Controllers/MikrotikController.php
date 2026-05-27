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