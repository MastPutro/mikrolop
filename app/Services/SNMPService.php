<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Exception;

class SNMPService
{
    private $host;
    private $community;
    private $timeout;
    private $retries;

    /**
     * Initialize SNMP Service
     * 
     * @param string|null $host SNMP host IP/hostname
     * @param string $community SNMP community string (default: public)
     * @param int $timeout Timeout in milliseconds
     * @param int $retries Number of retries
     */
    public function __construct(
        ?string $host = null,
        string $community = 'public',
        int $timeout = 1000000,
        int $retries = 2
    ) {
        // Check if SNMP extension is loaded
        if (!extension_loaded('snmp')) {
            Log::error('SNMP extension is not loaded. Please enable PHP SNMP extension.');
            throw new Exception('SNMP extension not available. Please install php-snmp package.');
        }

        $this->host = $host ?? env('MIKROTIK_HOST');
        $this->community = $community ?? env('SNMP_COMMUNITY', 'public');
        $this->timeout = $timeout;
        $this->retries = $retries;

        if (!$this->host) {
            Log::error('MIKROTIK_HOST not configured in .env');
            throw new Exception('MIKROTIK_HOST not configured in environment variables');
        }

        Log::info("SNMP Service initialized for host: {$this->host}");
    }

    /**
     * Get system resources from MikroTik via SNMP
     * Uses system OIDs from SNMPv2-MIB
     * 
     * @return array
     */
    public function getSystemResources(): array
    {
        try {
            $oids = [
                'sysDescr' => '1.3.6.1.2.1.1.1.0',           // System description
                'sysObjectID' => '1.3.6.1.2.1.1.2.0',        // Object ID
                'sysUpTime' => '1.3.6.1.2.1.1.3.0',          // Uptime in ticks (100ths of second)
                'sysContact' => '1.3.6.1.2.1.1.4.0',         // Contact
                'sysName' => '1.3.6.1.2.1.1.5.0',            // System name
                'sysLocation' => '1.3.6.1.2.1.1.6.0',        // Location
                'sysServices' => '1.3.6.1.2.1.1.7.0',        // Services
            ];

            $result = [];
            foreach ($oids as $name => $oid) {
                try {
                    $value = @snmp2_get($this->host, $this->community, $oid, $this->timeout, $this->retries);
                    $result[$name] = $this->parseSnmpValue($value);
                } catch (Exception $e) {
                    Log::warning("SNMP error getting $name: " . $e->getMessage());
                    $result[$name] = null;
                }
            }

            // Format uptime from ticks to readable format
            if (isset($result['sysUpTime']) && is_numeric($result['sysUpTime'])) {
                $result['uptime'] = $this->formatUptime((int)$result['sysUpTime']);
            }

            Log::info('System resources fetched via SNMP');
            return $result;
        } catch (Exception $e) {
            Log::error('Error fetching system resources via SNMP: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get CPU load percentage from MikroTik
     * Uses HOST-RESOURCES-MIB if available, otherwise estimates from system
     * 
     * @return int CPU load percentage (0-100)
     */
    public function getCPULoad(): int
    {
        try {
            // Try to get CPU load from HOST-RESOURCES-MIB (.1.3.6.1.2.1.25.3.2.1.5.1)
            // This works on some MikroTik versions
            $cpuLoadOid = '1.3.6.1.2.1.25.3.2.1.5.1';  // hrDeviceLoad
            
            try {
                $value = @snmp2_get($this->host, $this->community, $cpuLoadOid, $this->timeout, $this->retries);
                if ($value !== false && !empty($value)) {
                    $load = (int)$this->parseSnmpValue($value);
                    if ($load >= 0 && $load <= 100) {
                        Log::info("CPU Load from HOST-RESOURCES-MIB: $load%");
                        return $load;
                    }
                }
            } catch (Exception $e) {
                Log::debug("HOST-RESOURCES-MIB not available: " . $e->getMessage());
            }

            // Fallback: Try MikroTik proprietary OID (mikrotik cpu load)
            // Mikrotik CPU load OID: 1.3.6.1.4.1.14988.1.1.1.3.0
            $mkCpuOid = '1.3.6.1.4.1.14988.1.1.1.3.0';
            
            try {
                $value = @snmp2_get($this->host, $this->community, $mkCpuOid, $this->timeout, $this->retries);
                if ($value !== false && !empty($value)) {
                    $load = (int)$this->parseSnmpValue($value);
                    if ($load >= 0 && $load <= 100) {
                        Log::info("CPU Load from MikroTik MIB: $load%");
                        return $load;
                    }
                }
            } catch (Exception $e) {
                Log::debug("MikroTik MIB CPU load not available: " . $e->getMessage());
            }

            Log::warning('CPU load not available from SNMP - returning 0');
            return 0;
        } catch (Exception $e) {
            Log::error('Error fetching CPU load: ' . $e->getMessage());
            return 0;
        }
    }

    /**
     * Get all network interfaces via SNMP
     * Uses snmp2_real_walk to get ALL interfaces regardless of index gaps
     * This ensures we catch PPPoE, VPN, and other virtual interfaces
     * 
     * @return array
     */
    public function getInterfaces(): array
    {
        try {
            // Use snmp2_real_walk to get ALL interfaces including non-sequential indices
            // This is important for catching PPPoE and virtual interfaces
            $ifDescriptions = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.2', $this->timeout, $this->retries);
            $ifTypes = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.3', $this->timeout, $this->retries);
            $ifMtu = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.4', $this->timeout, $this->retries);
            $ifSpeed = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.5', $this->timeout, $this->retries);
            $ifPhysAddress = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.6', $this->timeout, $this->retries);
            $ifAdminStatus = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.7', $this->timeout, $this->retries);
            $ifOperStatus = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.8', $this->timeout, $this->retries);
            $ifInOctets = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.10', $this->timeout, $this->retries);
            $ifInErrors = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.13', $this->timeout, $this->retries);
            $ifOutOctets = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.16', $this->timeout, $this->retries);
            $ifOutErrors = @snmp2_real_walk($this->host, $this->community, '1.3.6.1.2.1.2.2.1.20', $this->timeout, $this->retries);

            if (!$ifDescriptions || !is_array($ifDescriptions)) {
                Log::warning('No interface descriptions found via SNMP');
                return [];
            }

            $interfaces = [];
            
            // Extract interface indices from OID paths
            // OID format: .1.3.6.1.2.1.2.2.1.2.<ifIndex>
            foreach ($ifDescriptions as $oid => $description) {
                // Extract ifIndex from OID
                $parts = explode('.', $oid);
                $ifIndex = end($parts);
                
                // Safer approach: just look up the last part (ifIndex) in each array's values
                $inOctetsVal = null;
                $outOctetsVal = null;
                foreach ($ifInOctets as $k => $v) {
                    if (strpos($k, ".$ifIndex") !== false) {
                        $inOctetsVal = $v;
                        break;
                    }
                }
                foreach ($ifOutOctets as $k => $v) {
                    if (strpos($k, ".$ifIndex") !== false) {
                        $outOctetsVal = $v;
                        break;
                    }
                }
                
                $interface = [
                    'ifIndex' => (int)$ifIndex,
                    'ifDescr' => $this->parseSnmpValue($description),
                    'ifType' => isset($ifTypes[$oid]) ? (int)$this->parseSnmpValue($ifTypes[$oid]) : 0,
                    'ifMtu' => isset($ifMtu[$oid]) ? (int)$this->parseSnmpValue($ifMtu[$oid]) : 0,
                    'ifSpeed' => isset($ifSpeed[$oid]) ? (int)$this->parseSnmpValue($ifSpeed[$oid]) : 0,
                    'ifPhysAddress' => isset($ifPhysAddress[$oid]) ? $this->parseSnmpValue($ifPhysAddress[$oid]) : null,
                    'ifAdminStatus' => isset($ifAdminStatus[$oid]) ? (int)$this->parseSnmpValue($ifAdminStatus[$oid]) : 0,
                    'ifOperStatus' => isset($ifOperStatus[$oid]) ? (int)$this->parseSnmpValue($ifOperStatus[$oid]) : 0,
                    'ifInOctets' => $inOctetsVal ? (int)$this->parseSnmpValue($inOctetsVal) : 0,
                    'ifInErrors' => isset($ifInErrors[$oid]) ? (int)$this->parseSnmpValue($ifInErrors[$oid]) : 0,
                    'ifOutOctets' => $outOctetsVal ? (int)$this->parseSnmpValue($outOctetsVal) : 0,
                    'ifOutErrors' => isset($ifOutErrors[$oid]) ? (int)$this->parseSnmpValue($ifOutErrors[$oid]) : 0,
                ];

                // Map interface types to more readable names
                $interface['type'] = $this->mapInterfaceType($interface['ifType']);

                // Map status codes
                $interface['running'] = $this->mapStatus($interface['ifOperStatus']);
                $interface['name'] = $interface['ifDescr'] ?? "Interface $ifIndex";

                // Format speeds
                if (isset($interface['ifSpeed']) && is_numeric($interface['ifSpeed'])) {
                    $interface['speed'] = $this->formatSpeed((int)$interface['ifSpeed']);
                }

                $interfaces[] = $interface;
            }

            Log::info('Fetched ' . count($interfaces) . ' interfaces via SNMP');
            return $interfaces;
        } catch (Exception $e) {
            Log::error('Error fetching interfaces via SNMP: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get details for a specific interface
     * 
     * @param int $ifIndex Interface index
     * @return array|null
     */
    private function getInterfaceDetails(int $ifIndex): ?array
    {
        try {
            $oids = [
                'ifIndex' => "1.3.6.1.2.1.2.2.1.1.$ifIndex",        // Index
                'ifDescr' => "1.3.6.1.2.1.2.2.1.2.$ifIndex",        // Description
                'ifType' => "1.3.6.1.2.1.2.2.1.3.$ifIndex",         // Type
                'ifMtu' => "1.3.6.1.2.1.2.2.1.4.$ifIndex",          // MTU
                'ifSpeed' => "1.3.6.1.2.1.2.2.1.5.$ifIndex",        // Speed (bits per second)
                'ifPhysAddress' => "1.3.6.1.2.1.2.2.1.6.$ifIndex",  // MAC address
                'ifAdminStatus' => "1.3.6.1.2.1.2.2.1.7.$ifIndex",  // Admin status
                'ifOperStatus' => "1.3.6.1.2.1.2.2.1.8.$ifIndex",   // Operational status
                'ifLastChange' => "1.3.6.1.2.1.2.2.1.9.$ifIndex",   // Last change
                'ifInOctets' => "1.3.6.1.2.1.2.2.1.10.$ifIndex",    // Inbound octets
                'ifInErrors' => "1.3.6.1.2.1.2.2.1.13.$ifIndex",    // Inbound errors
                'ifOutOctets' => "1.3.6.1.2.1.2.2.1.16.$ifIndex",   // Outbound octets
                'ifOutErrors' => "1.3.6.1.2.1.2.2.1.20.$ifIndex",   // Outbound errors
            ];

            $interface = [];
            foreach ($oids as $name => $oid) {
                try {
                    $value = @snmp2_get($this->host, $this->community, $oid, $this->timeout, $this->retries);
                    $interface[$name] = $this->parseSnmpValue($value);
                } catch (Exception $e) {
                    $interface[$name] = null;
                }
            }

            // Map interface types to more readable names
            $interface['type'] = $this->mapInterfaceType((int)($interface['ifType'] ?? 0));

            // Map status codes
            $interface['running'] = $this->mapStatus((int)($interface['ifOperStatus'] ?? 0));
            $interface['name'] = $interface['ifDescr'] ?? "Interface $ifIndex";

            // Format speeds
            if (isset($interface['ifSpeed']) && is_numeric($interface['ifSpeed'])) {
                $interface['speed'] = $this->formatSpeed((int)$interface['ifSpeed']);
            }

            return $interface;
        } catch (Exception $e) {
            Log::warning("Error getting interface $ifIndex details: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Get only Ethernet interfaces
     * Filters by interface name pattern (ether*, eth*, en*) as MikroTik naming convention
     * 
     * @return array
     */
    public function getEthernetInterfaces(): array
    {
        try {
            $allInterfaces = $this->getInterfaces();
            
            // Filter by name pattern - MikroTik uses "ether1", "ether2", etc.
            // Also support standard Linux names: "eth0", "en0", "enp0s3", etc.
            $ethernetPatterns = ['ether', 'eth', 'en', 'wlan'];  // Common ethernet interface prefixes
            
            $ethernetInterfaces = array_filter($allInterfaces, function ($iface) use ($ethernetPatterns) {
                $name = strtolower($iface['name'] ?? '');
                
                // Check if interface name starts with known ethernet patterns
                foreach ($ethernetPatterns as $pattern) {
                    if (strpos($name, $pattern) === 0) {
                        // Exclude loopback and virtual interfaces
                        if (strpos($name, 'vlan') === false && strpos($name, 'docker') === false && strpos($name, 'br-') === false) {
                            return true;
                        }
                    }
                }
                
                return false;
            });

            Log::info('Filtered ' . count($ethernetInterfaces) . ' ethernet interfaces from ' . count($allInterfaces) . ' total');
            return array_values($ethernetInterfaces);
        } catch (Exception $e) {
            Log::error('Error filtering ethernet interfaces: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get PPP/PPPoE interfaces (for customer connections)
     * 
     * @return array
     */
    public function getPPPInterfaces(): array
    {
        try {
            $allInterfaces = $this->getInterfaces();
            
            // Filter for PPP, PPPoE, L2TP, PPTP interfaces
            $pppPatterns = ['ppp', 'pppoe'];  // PPP interface prefixes
            
            $pppInterfaces = array_filter($allInterfaces, function ($iface) use ($pppPatterns) {
                $name = strtolower($iface['name'] ?? '');
                
                // Check if interface name contains known PPP patterns
                foreach ($pppPatterns as $pattern) {
                    if (strpos($name, $pattern) !== false) {
                        return true;
                    }
                }
                
                return false;
            });

            Log::info('Filtered ' . count($pppInterfaces) . ' PPP interfaces from ' . count($allInterfaces) . ' total');
            return array_values($pppInterfaces);
        } catch (Exception $e) {
            Log::error('Error filtering PPP interfaces: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get interface statistics (RX/TX bytes)
     * 
     * @param string $interfaceName Interface name
     * @return array
     */
    public function getInterfaceStats(string $interfaceName): array
    {
        try {
            // Walk to find the interface index by name
            $interfaces = $this->getInterfaces();
            $ifIndex = null;

            foreach ($interfaces as $iface) {
                if ($iface['name'] === $interfaceName) {
                    $ifIndex = $iface['ifIndex'];
                    break;
                }
            }

            if (!$ifIndex) {
                throw new Exception("Interface $interfaceName not found");
            }

            $stats = [
                'name' => $interfaceName,
                'rx_bytes' => @snmp2_get($this->host, $this->community, "1.3.6.1.2.1.2.2.1.10.$ifIndex", $this->timeout, $this->retries),
                'tx_bytes' => @snmp2_get($this->host, $this->community, "1.3.6.1.2.1.2.2.1.16.$ifIndex", $this->timeout, $this->retries),
                'rx_errors' => @snmp2_get($this->host, $this->community, "1.3.6.1.2.1.2.2.1.13.$ifIndex", $this->timeout, $this->retries),
                'tx_errors' => @snmp2_get($this->host, $this->community, "1.3.6.1.2.1.2.2.1.20.$ifIndex", $this->timeout, $this->retries),
            ];

            // Parse values
            foreach ($stats as $key => $value) {
                if ($key !== 'name') {
                    $stats[$key] = (int)$this->parseSnmpValue($value);
                }
            }

            return $stats;
        } catch (Exception $e) {
            Log::error("Error getting interface stats for $interfaceName: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get interface TX/RX rate by polling
     * Polls the interface twice with a delay and calculates the rate
     * 
     * @param string $interfaceName Interface name
     * @param int $delayMs Delay between polls in milliseconds (default: 1000ms = 1 second)
     * @return array
     */
    public function getInterfaceRate(string $interfaceName, int $delayMs = 1000): array
    {
        try {
            // First poll
            $stats1 = $this->getInterfaceStats($interfaceName);
            
            // Wait for the specified delay
            usleep($delayMs * 1000);
            
            // Second poll
            $stats2 = $this->getInterfaceStats($interfaceName);
            
            // Calculate deltas
            $rx_bytes_delta = $stats2['rx_bytes'] - $stats1['rx_bytes'];
            $tx_bytes_delta = $stats2['tx_bytes'] - $stats1['tx_bytes'];
            
            // Calculate rate: bytes per second
            $delay_seconds = $delayMs / 1000;
            $rx_bytes_per_sec = $rx_bytes_delta / $delay_seconds;
            $tx_bytes_per_sec = $tx_bytes_delta / $delay_seconds;
            
            // Convert to bits per second (multiply by 8)
            $rx_bps = $rx_bytes_per_sec * 8;
            $tx_bps = $tx_bytes_per_sec * 8;
            
            return [
                'name' => $interfaceName,
                'rx_bps' => max(0, (int)$rx_bps),  // Ensure non-negative
                'tx_bps' => max(0, (int)$tx_bps),  // Ensure non-negative
                'rx_bytes' => $stats2['rx_bytes'],
                'tx_bytes' => $stats2['tx_bytes'],
                'rx_errors' => $stats2['rx_errors'] ?? 0,
                'tx_errors' => $stats2['tx_errors'] ?? 0,
                'timestamp' => now()->toIso8601String(),
            ];
        } catch (Exception $e) {
            Log::error("Error getting interface rate for $interfaceName: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Format bits per second to human-readable format
     * 
     * @param float $bps Bits per second
     * @return string
     */
    public function formatRate(float $bps): string
    {
        if ($bps < 0) {
            $bps = 0;
        }
        
        $units = ['bps', 'kbps', 'Mbps', 'Gbps', 'Tbps'];
        $rate = $bps;
        $unitIndex = 0;

        while ($rate >= 1000 && $unitIndex < count($units) - 1) {
            $rate /= 1000;
            $unitIndex++;
        }

        return sprintf('%.2f %s', $rate, $units[$unitIndex]);
    }

    /**
     * Parse SNMP response value
     * Removes OID prefix and quotes if present
     * 
     * @param string $value Raw SNMP value
     * @return string|int
     */
    private function parseSnmpValue($value): string|int
    {
        if (!$value) {
            return '';
        }

        // Handle SNMP type prefixes
        // Counter32: 12345 -> 12345
        // Counter64: 67890 -> 67890
        // INTEGER: 100 -> 100
        // STRING: "hello" -> "hello"
        // Hex-STRING: ...
        
        $snmpTypes = ['Counter32', 'Counter64', 'Gauge32', 'Gauge64', 'TimeTicks', 'Timeticks', 'Integer32', 'INTEGER', 'OCTET STRING', 'STRING', 'Hex-STRING', 'OBJECT IDENTIFIER'];
        
        foreach ($snmpTypes as $type) {
            $pattern = $type . ': ';
            if (strpos($value, $pattern) === 0) {
                $value = substr($value, strlen($pattern));
                break;
            }
        }

        // Try to convert to int if it looks like a number
        if (is_numeric($value)) {
            return (int)$value;
        }

        // Return as string, trimmed of quotes AND angle brackets (MikroTik uses <name> format)
        return trim($value, '"<>');
    }

    /**
     * Map SNMP interface types to readable strings
     * Based on IANA ianaift MIB
     * 
     * @param int $typeCode Interface type code
     * @return string
     */
    private function mapInterfaceType(int $typeCode): string
    {
        $types = [
            1 => 'other',
            2 => 'ethernet',
            3 => 'iso88025TokenRing',
            4 => 'ppp',
            5 => 'ipv4',
            6 => 'ipv6',
            9 => 'iso88024TokenBus',
            23 => 'ppp',
            71 => 'tunnel',
            209 => 'gigabitEthernet',
            271 => 'ieee80211',
        ];

        return $types[$typeCode] ?? "type_$typeCode";
    }

    /**
     * Map SNMP status codes
     * 1 = up, 2 = down, 3 = testing
     * 
     * @param int $statusCode Status code
     * @return string
     */
    private function mapStatus(int $statusCode): string
    {
        return match ($statusCode) {
            1 => 'true',  // up
            2 => 'false', // down
            3 => 'testing',
            default => 'unknown',
        };
    }

    /**
     * Format uptime from ticks to human-readable format
     * Each tick is 1/100 second
     * 
     * @param int $ticks Uptime in ticks
     * @return string
     */
    private function formatUptime(int $ticks): string
    {
        $seconds = floor($ticks / 100);
        $days = floor($seconds / 86400);
        $hours = floor(($seconds % 86400) / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = floor($seconds % 60);

        return sprintf('%d days, %02d:%02d:%02d', $days, $hours, $minutes, $secs);
    }

    /**
     * Format speed from bits per second to human-readable format
     * 
     * @param int $bps Speed in bits per second
     * @return string
     */
    private function formatSpeed(int $bps): string
    {
        $units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps'];
        $speed = $bps;
        $unitIndex = 0;

        while ($speed >= 1000 && $unitIndex < count($units) - 1) {
            $speed /= 1000;
            $unitIndex++;
        }

        return sprintf('%.2f %s', $speed, $units[$unitIndex]);
    }

    /**
     * Test SNMP connectivity
     * 
     * @return bool
     */
    public function testConnection(): bool
    {
        try {
            $result = @snmp2_get($this->host, $this->community, '1.3.6.1.2.1.1.1.0', $this->timeout, $this->retries);
            return $result !== false;
        } catch (Exception $e) {
            Log::error('SNMP connection test failed: ' . $e->getMessage());
            return false;
        }
    }
}
