<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\ODP;
use App\Models\Customer;
use App\Services\SNMPService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class GISMapController extends Controller
{
    /**
     * Display the GIS map page
     */
    public function index()
    {
        $servers = Server::with('odps')->get();
        $odps = ODP::with(['server', 'parentOdp', 'customers'])->get();
        $customers = Customer::with(['odp', 'package'])->get();

        // Calculate statistics
        $stats = [
            'total_servers' => $servers->count(),
            'online_servers' => $servers->where('status', 'online')->count(),
            'total_odps' => $odps->count(),
            'online_odps' => $odps->where('status', 'online')->count(),
            'total_customers' => $customers->count(),
            'active_customers' => $customers->where('status', 'active')->count(),
            'suspended_customers' => $customers->where('status', 'suspended')->count(),
            'avg_odp_usage' => $odps->avg('port_usage_percentage'),
            'avg_server_usage' => $servers->avg('usage_percentage'),
        ];

        return Inertia::render('PetaSebaran/CustomerGISMap', [
            'servers' => $servers,
            'odps' => $odps,
            'customers' => $customers,
            'stats' => $stats,
        ]);
    }

    /**
     * Get real-time data for updates (API endpoint)
     */
    public function getData()
    {
        return response()->json([
            'servers' => Server::with('odps')->get(),
            'odps' => ODP::with(['server', 'parentOdp', 'childOdps', 'customers'])->get(),
            'customers' => Customer::with(['odp', 'package'])->get(),
        ]);
    }

    /**
     * Get SNMP statistics for a specific customer
     * This fetches TX/RX rates and bytes from MikroTik via SNMP
     * Supports multiple matching strategies:
     * 1. Via PPP connection name (recommended)
     * 2. Via ethernet interface name (if stored in customer)
     * 3. Via IP address lookup (fallback)
     * 
     * @param int $id Customer ID
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCustomerSnmpStats($id)
    {
        $debugMode = env('APP_DEBUG', false); // Gunakan debug mode dari .env
        
        try {
            $customer = Customer::with(['odp', 'package'])->findOrFail($id);
            
            $debugLog = [];
            $debugLog[] = "Customer found: {$customer->name} (ID: {$customer->id})";
            $debugLog[] = "IP Address: " . ($customer->ip_address ?: 'NOT SET');
            $debugLog[] = "Router MAC: " . ($customer->router_mac ?: 'NOT SET');
            
            // Check if SNMP extension is available
            if (!extension_loaded('snmp')) {
                if ($debugMode) $debugLog[] = "SNMP extension NOT loaded";
                
                return response()->json([
                    'customer' => $customer,
                    'snmp_stats' => [
                        'error' => true,
                        'message' => 'SNMP extension not available on server. Please install php-snmp package.',
                        'interface_name' => 'Unknown',
                        'tx_rate' => 'N/A',
                        'rx_rate' => 'N/A',
                        'tx_bytes' => 0,
                        'rx_bytes' => 0,
                        'speed' => 'Unknown',
                    ],
                    'debug' => $debugMode ? $debugLog : null
                ]);
            }
            
            $debugLog[] = "SNMP extension loaded ✓";
            
            // Check if MikroTik host is configured
            $mikrotikHost = env('MIKROTIK_HOST');
            if (!$mikrotikHost) {
                if ($debugMode) $debugLog[] = "MIKROTIK_HOST not configured";
                
                return response()->json([
                    'customer' => $customer,
                    'snmp_stats' => [
                        'error' => true,
                        'message' => 'MIKROTIK_HOST not configured in environment',
                        'interface_name' => 'Unknown',
                        'tx_rate' => 'N/A',
                        'rx_rate' => 'N/A',
                        'tx_bytes' => 0,
                        'rx_bytes' => 0,
                        'speed' => 'Unknown',
                    ],
                    'debug' => $debugMode ? $debugLog : null
                ]);
            }
            
            $debugLog[] = "MikroTik Host: $mikrotikHost ✓";
            
            // Try to initialize SNMP Service with MikroTik host
            try {
                $snmpService = new SNMPService(
                    $mikrotikHost,
                    env('SNMP_COMMUNITY', 'public'),
                    (int)env('SNMP_TIMEOUT', 1000000),
                    (int)env('SNMP_RETRIES', 2)
                );
                $debugLog[] = "SNMP Service initialized ✓";
            } catch (\Exception $e) {
                $debugLog[] = "SNMP Service init FAILED: " . $e->getMessage();
                
                Log::error("SNMP Service initialization failed: " . $e->getMessage());
                return response()->json([
                    'customer' => $customer,
                    'snmp_stats' => [
                        'error' => true,
                        'message' => 'SNMP connection failed: ' . $e->getMessage(),
                        'interface_name' => 'Unknown',
                        'tx_rate' => 'N/A',
                        'rx_rate' => 'N/A',
                        'tx_bytes' => 0,
                        'rx_bytes' => 0,
                        'speed' => 'Unknown',
                    ],
                    'debug' => $debugMode ? $debugLog : null
                ]);
            }
            
            $snmpStats = [];
            
            // Strategy 1: Try to find interface by PPP connection name (customer username)
            $debugLog[] = "=== Strategy 1: PPP Connection Lookup ===";
            $debugLog[] = "Looking for PPP connection named: {$customer->name}";
            
            try {
                // First try to get PPP interfaces specifically
                $pppInterfaces = $snmpService->getPPPInterfaces();
                $debugLog[] = "PPP interfaces found: " . count($pppInterfaces);
                
                foreach ($pppInterfaces as $iface) {
                    $debugLog[] = "  → {$iface['name']}";
                }
                
                // Try to match by customer name in interface name
                foreach ($pppInterfaces as $interface) {
                    $ifName = strtolower($interface['name'] ?? '');
                    $customerName = strtolower($customer->name);
                    
                    // Match: pppoe-herex, ppp-herex, herex, etc.
                    if (strpos($ifName, $customerName) !== false) {
                        $debugLog[] = "✓ PPP Interface MATCHED: {$interface['name']}";
                        
                        $txBytes = $interface['ifOutOctets'] ?? 0;
                        $rxBytes = $interface['ifInOctets'] ?? 0;
                        
                        $snmpStats = [
                            'interface_name' => $interface['name'] ?? 'Unknown',
                            'tx_rate' => $this->formatBytes($txBytes),  // Format bytes to human readable
                            'rx_rate' => $this->formatBytes($rxBytes),  // Format bytes to human readable
                            'tx_bytes' => $txBytes,
                            'rx_bytes' => $rxBytes,
                            'tx_errors' => $interface['ifOutErrors'] ?? 0,
                            'rx_errors' => $interface['ifInErrors'] ?? 0,
                            'speed' => $interface['speed'] ?? 'Unknown',
                            'status' => $interface['running'] ?? 'unknown',
                        ];
                        break;
                    }
                }
                
                if (!empty($snmpStats)) {
                    return response()->json([
                        'customer' => $customer,
                        'snmp_stats' => $snmpStats,
                        'debug' => $debugMode ? $debugLog : null
                    ]);
                }
                
                $debugLog[] = "✗ PPP interface with customer name not found";
            } catch (\Exception $e) {
                $debugLog[] = "PPP lookup error: " . $e->getMessage();
            }
            
            // Strategy 2: Try to match by interface name stored in customer field
            $debugLog[] = "=== Strategy 2: Stored Interface Name ===";
            
            if (isset($customer->interface_name) && !empty($customer->interface_name)) {
                $debugLog[] = "Looking for interface: {$customer->interface_name}";
                
                try {
                    $allInterfaces = $snmpService->getInterfaces();
                    
                    foreach ($allInterfaces as $interface) {
                        if (strtolower($interface['name'] ?? '') === strtolower($customer->interface_name)) {
                            $debugLog[] = "✓ Stored interface MATCHED";
                            
                            $txBytes = $interface['ifOutOctets'] ?? 0;
                            $rxBytes = $interface['ifInOctets'] ?? 0;
                            
                            $snmpStats = [
                                'interface_name' => $interface['name'] ?? 'Unknown',
                                'tx_rate' => $this->formatBytes($txBytes),  // Format bytes to human readable
                                'rx_rate' => $this->formatBytes($rxBytes),  // Format bytes to human readable
                                'tx_bytes' => $txBytes,
                                'rx_bytes' => $rxBytes,
                                'tx_errors' => $interface['ifOutErrors'] ?? 0,
                                'rx_errors' => $interface['ifInErrors'] ?? 0,
                                'speed' => $interface['speed'] ?? 'Unknown',
                                'status' => $interface['running'] ?? 'unknown',
                            ];
                            break;
                        }
                    }
                    
                    if (!empty($snmpStats)) {
                        return response()->json([
                            'customer' => $customer,
                            'snmp_stats' => $snmpStats,
                            'debug' => $debugMode ? $debugLog : null
                        ]);
                    }
                    
                    $debugLog[] = "✗ Stored interface name not matched";
                } catch (\Exception $e) {
                    $debugLog[] = "Stored interface lookup error: " . $e->getMessage();
                }
            } else {
                $debugLog[] = "No interface_name stored for customer";
            }
            
            // Strategy 3: Manual interface selection - show all available interfaces for user to choose
            $debugLog[] = "=== Strategy 3: Available Interfaces for Manual Selection ===";
            
            try {
                $allInterfaces = $snmpService->getInterfaces();
                $interfaceList = [];
                
                foreach ($allInterfaces as $iface) {
                    $name = $iface['name'] ?? 'Unknown';
                    $speed = $iface['speed'] ?? 'Unknown';
                    $status = $iface['running'] ?? 'unknown';
                    
                    // Skip loopback and virtual interfaces
                    if (strtolower($name) === 'lo' || strpos(strtolower($name), 'docker') !== false) {
                        continue;
                    }
                    
                    $interfaceList[] = [
                        'name' => $name,
                        'speed' => $speed,
                        'status' => $status,
                    ];
                    $debugLog[] = "  → $name: $speed ($status)";
                }
                
                $debugLog[] = "💡 Tip: You can UPDATE customers SET interface_name='pppoe-herex' WHERE id={$customer->id};";
            } catch (\Exception $e) {
                $debugLog[] = "Error listing interfaces: " . $e->getMessage();
            }
            
            // If no stats found, return informative message
            if (empty($snmpStats)) {
                $debugLog[] = "⚠️ No interface match found";
                
                $snmpStats = [
                    'interface_name' => 'Unknown',
                    'tx_rate' => 'N/A',
                    'rx_rate' => 'N/A',
                    'tx_bytes' => 0,
                    'rx_bytes' => 0,
                    'tx_errors' => 0,
                    'rx_errors' => 0,
                    'speed' => 'Unknown',
                    'status' => 'unknown',
                    'message' => 'No matching interface found. PPP connection name, stored interface name, or MAC not matching any interface.',
                ];
            }
            
            return response()->json([
                'customer' => $customer,
                'snmp_stats' => $snmpStats,
                'debug' => $debugMode ? $debugLog : null
            ]);
        } catch (\Exception $e) {
            Log::error("Error fetching customer SNMP stats: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'error' => 'Failed to fetch SNMP stats',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all customers with their SNMP stats (cached - call less frequently)
     * This is heavier operation, so use sparingly
     */
    public function getCustomersWithSnmpStats()
    {
        try {
            $customers = Customer::with(['odp', 'package'])->get();
            
            // Only initialize SNMP if we have a valid host
            if (!env('MIKROTIK_HOST')) {
                return response()->json([
                    'customers' => $customers,
                    'snmp_available' => false,
                ]);
            }
            
            try {
                $snmpService = new SNMPService(
                    env('MIKROTIK_HOST'),
                    env('SNMP_COMMUNITY', 'public'),
                    (int)env('SNMP_TIMEOUT', 1000000),
                    (int)env('SNMP_RETRIES', 2)
                );
                
                $snmpAvailable = $snmpService->testConnection();
            } catch (\Exception $e) {
                Log::warning("SNMP service unavailable: " . $e->getMessage());
                $snmpAvailable = false;
            }
            
            return response()->json([
                'customers' => $customers,
                'snmp_available' => $snmpAvailable ?? false,
            ]);
        } catch (\Exception $e) {
            Log::error("Error fetching customers with SNMP: " . $e->getMessage());
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get server details
     */
    public function getServer($id)
    {
        $server = Server::with(['odps', 'odps.customers'])->findOrFail($id);
        
        // Count all customers under this server (including nested ODP customers)
        $totalCustomers = Customer::whereIn('odp_id', $server->odps->pluck('id'))->count();
        
        return response()->json([
            'server' => $server,
            'connected_odps' => $server->odps->count(),
            'total_customers' => $totalCustomers,
        ]);
    }

    /**
     * Get ODP details
     */
    public function getODP($id)
    {
        $odp = ODP::with(['server', 'parentOdp', 'childOdps', 'customers'])->findOrFail($id);
        
        $rootServer = $odp->getRootServer();
        
        return response()->json([
            'odp' => $odp,
            'parent_id' => $odp->parent_id,
            'root_server' => $rootServer,
            'depth' => $odp->getDepth(),
            'is_leaf' => $odp->isLeafODP(),
            'connected_customers' => $odp->customers->count(),
            'active_customers' => $odp->customers->where('status', 'active')->count(),
            'child_odps_count' => $odp->childOdps->count(),
        ]);
    }

    /**
     * Get customer details
     */
    public function getCustomer($id)
    {
        $customer = Customer::with(['odp.parentOdp', 'package'])->findOrFail($id);
        
        // Build the full connection path from Server through all ODP levels to Customer
        $connectionPath = [];
        
        // Get the root server
        $rootServer = $customer->odp->getRootServer();
        if ($rootServer) {
            $connectionPath['server'] = $rootServer;
        }
        
        // Build ODP hierarchy path
        $odpPath = [];
        $currentOdp = $customer->odp;
        
        while ($currentOdp !== null) {
            $odpPath[] = $currentOdp;
            $currentOdp = $currentOdp->parentOdp;
        }
        
        // Reverse to get path from root to customer ODP
        $connectionPath['odp_path'] = array_reverse($odpPath);
        
        return response()->json([
            'customer' => $customer,
            'connection_path' => $connectionPath,
        ]);
    }

    /**
     * Update server status
     */
    public function updateServerStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:online,offline,warning',
        ]);

        $server = Server::findOrFail($id);
        $server->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Server status updated successfully',
            'server' => $server,
        ]);
    }

    /**
     * Update ODP status
     */
    public function updateODPStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:online,offline',
        ]);

        $odp = ODP::findOrFail($id);
        $odp->update(['status' => $request->status]);

        return response()->json([
            'message' => 'ODP status updated successfully',
            'odp' => $odp,
        ]);
    }

    /**
     * Update customer status
     */
    public function updateCustomerStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:active,inactive,suspended',
        ]);

        $customer = Customer::findOrFail($id);
        $customer->update(['status' => $request->status]);

        // Update ODP used ports
        $this->recalculateODPUsage($customer->odp_id);

        return response()->json([
            'message' => 'Customer status updated successfully',
            'customer' => $customer,
        ]);
    }

    /**
     * Search nodes (servers, ODPs, customers)
     */
    public function search(Request $request)
    {
        $query = $request->get('q', '');

        $results = [
            'servers' => Server::where('name', 'like', "%{$query}%")
                ->orWhere('ip', 'like', "%{$query}%")
                ->get(),
            'odps' => ODP::where('name', 'like', "%{$query}%")
                ->get(),
            'customers' => Customer::where('name', 'like', "%{$query}%")
                ->orWhere('router_mac', 'like', "%{$query}%")
                ->get(),
        ];

        return response()->json($results);
    }

    /**
     * Get statistics
     */
    public function getStatistics()
    {
        $servers = Server::all();
        $odps = ODP::all();
        $customers = Customer::all();

        return response()->json([
            'servers' => [
                'total' => $servers->count(),
                'online' => $servers->where('status', 'online')->count(),
                'offline' => $servers->where('status', 'offline')->count(),
                'warning' => $servers->where('status', 'warning')->count(),
                'avg_usage' => $servers->avg('usage_percentage'),
                'total_capacity' => $servers->sum('capacity'),
                'total_used' => $servers->sum('used'),
            ],
            'odps' => [
                'total' => $odps->count(),
                'online' => $odps->where('status', 'online')->count(),
                'offline' => $odps->where('status', 'offline')->count(),
                'avg_usage' => $odps->avg('port_usage_percentage'),
                'total_ports' => $odps->sum('ports'),
                'used_ports' => $odps->sum('used_ports'),
            ],
            'customers' => [
                'total' => $customers->count(),
                'active' => $customers->where('status', 'active')->count(),
                'inactive' => $customers->where('status', 'inactive')->count(),
                'suspended' => $customers->where('status', 'suspended')->count(),
                'by_package' => $customers->groupBy('package')->map->count(),
            ],
        ]);
    }

    /**
     * Recalculate ODP usage when customer status changes
     * This now handles hierarchical ODPs correctly
     */
    private function recalculateODPUsage($odpId)
    {
        $odp = ODP::findOrFail($odpId);
        
        // Count active customers directly attached to this ODP
        $activeCustomers = $odp->customers()->where('status', 'active')->count();
        $odp->update(['used_ports' => $activeCustomers]);
        
        // If this ODP has a parent, recursively update parent's usage
        if ($odp->parent_id !== null) {
            $this->recalculateODPUsage($odp->parent_id);
        } else {
            // This is a root ODP, update the server usage
            $server = $odp->server;
            if ($server) {
                // Count all active customers under all ODPs of this server
                $rootOdps = ODP::where('server_id', $server->id)->get();
                $totalActiveCustomers = 0;
                
                foreach ($rootOdps as $rootOdp) {
                    // Count direct customers and all descendants' customers
                    $descendants = $rootOdp->getAllDescendants();
                    $descendants->push($rootOdp);
                    
                    $totalActiveCustomers += Customer::whereIn('odp_id', $descendants->pluck('id'))
                        ->where('status', 'active')
                        ->count();
                }
                
                $server->update(['used' => $totalActiveCustomers]);
            }
        }
    }

    /**
     * Export data to JSON
     */
    public function export()
    {
        $data = [
            'servers' => Server::with('odps')->get(),
            'odps' => ODP::with(['server', 'parentOdp', 'childOdps', 'customers'])->get(),
            'customers' => Customer::with('odp')->get(),
            'exported_at' => now()->toIso8601String(),
        ];

        return response()->json($data)
            ->header('Content-Disposition', 'attachment; filename="network-topology-' . now()->format('Y-m-d-His') . '.json"');
    }

    /**
     * Format bytes to human readable format (B, KB, MB, GB, TB)
     * @param int $bytes Number of bytes
     * @return string Formatted size
     */
    private function formatBytes($bytes)
    {
        if ($bytes == 0) return '0 B';
        
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
}