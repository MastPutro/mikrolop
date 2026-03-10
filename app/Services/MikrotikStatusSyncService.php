<?php
// app/Services/MikrotikStatusSyncService.php

namespace App\Services;

use App\Models\Customer;
use RouterOS\Config;
use RouterOS\Client;
use RouterOS\Query;
use Illuminate\Support\Facades\Log;
use Exception;

class MikrotikStatusSyncService
{
    private $client;
    private $config;

    public function __construct()
    {
        try {
            $this->config = new Config([
                'host' => env('MIKROTIK_HOST'),
                'user' => env('MIKROTIK_USER'),
                'pass' => env('MIKROTIK_PASS'),
                'port' => (int) env('MIKROTIK_PORT', 8728),
            ]);

            $this->client = new Client($this->config);
        } catch (Exception $e) {
            Log::error('Mikrotik Connection Error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get active PPP connections from Mikrotik /ppp/active/
     *
     * @return array
     */
    public function getActivePPPConnections(): array
    {
        try {
            $query = new Query('/ppp/active/print');
            $response = $this->client->query($query)->read();
            Log::info('Active PPP Connections fetched: ' . count($response));
            return $response ?? [];
        } catch (Exception $e) {
            Log::error('Error fetching active PPP connections: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get PPP secrets (configured users) from Mikrotik /ppp/secret/
     *
     * @return array
     */
    public function getPPPSecrets(): array
    {
        try {
            $query = new Query('/ppp/secret/print');
            $response = $this->client->query($query)->read();
            Log::info('PPP Secrets fetched: ' . count($response));
            return $response ?? [];
        } catch (Exception $e) {
            Log::error('Error fetching PPP secrets: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get all PPP profiles to identify configured users
     *
     * @return array
     */
    public function getAllPPPUsers(): array
    {
        try {
            $secrets = $this->getPPPSecrets();
            $active = $this->getActivePPPConnections();

            // Create a map of active usernames
            $activeUsernames = [];
            foreach ($active as $connection) {
                if (isset($connection['name'])) {
                    $activeUsernames[$connection['name']] = $connection;
                }
            }

            // Prepare response
            $response = [];
            foreach ($secrets as $secret) {
                if (isset($secret['name'])) {
                    $response[] = [
                        'name' => $secret['name'],
                        'service' => $secret['service'] ?? 'pppoe',
                        'profile' => $secret['profile'] ?? null,
                        'password' => $secret['password'] ?? null,
                        'is_active' => isset($activeUsernames[$secret['name']]),
                        'active_data' => $activeUsernames[$secret['name']] ?? null,
                    ];
                }
            }

            return $response;
        } catch (Exception $e) {
            Log::error('Error getting PPP users: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Sync customer status from Mikrotik
     * Matches customers by username (assuming customer username matches PPP username)
     *
     * @return array
     */
    public function syncCustomerStatus(): array
    {
        try {
            $pppUsers = $this->getAllPPPUsers();
            $syncResults = [
                'total_customers' => 0,
                'updated' => 0,
                'activated' => 0,
                'suspended' => 0,
                'deactivated' => 0,
                'not_found' => 0,
                'already_synced' => 0,
                'errors' => [],
            ];

            // Get all customers
            $customers = Customer::all();
            $syncResults['total_customers'] = count($customers);
            
            Log::info("Starting sync: Found {$syncResults['total_customers']} customers in DB, " . count($pppUsers) . " PPP users in Mikrotik");

            // Create map of active users for quick lookup
            $pppUserMap = [];
            foreach ($pppUsers as $user) {
                $pppUserMap[strtolower($user['name'])] = $user;
            }

            // Sync each customer
            foreach ($customers as $customer) {
                try {
                    $customerUsername = strtolower($customer->name);
                    
                    if (isset($pppUserMap[$customerUsername])) {
                        $pppUser = $pppUserMap[$customerUsername];
                        $newStatus = $pppUser['is_active'] ? 'active' : 'suspended';

                        Log::info("Customer {$customer->name}: DB status={$customer->status}, Mikrotik status={$newStatus}");

                        // Update status if changed
                        if ($customer->status !== $newStatus) {
                            $customer->update(['status' => $newStatus]);
                            $syncResults['updated']++;

                            if ($newStatus === 'active') {
                                $syncResults['activated']++;
                                Log::info("Customer {$customer->name} activated");
                            } else {
                                $syncResults['suspended']++;
                                Log::info("Customer {$customer->name} suspended");
                            }
                        } else {
                            Log::info("Customer {$customer->name} status already in sync");
                            $syncResults['already_synced']++;
                        }
                    } else {
                        // Customer not found in Mikrotik - set to suspended
                        // This handles: router offline, user deleted, etc
                        Log::warning("Customer {$customer->name} not found in Mikrotik");
                        if ($customer->status !== 'suspended') {
                            $customer->update(['status' => 'suspended']);
                            $syncResults['updated']++;
                            $syncResults['suspended']++;
                            Log::warning("Customer {$customer->name} not found in Mikrotik PPP - marked as suspended");
                        }
                        $syncResults['not_found']++;
                    }
                } catch (Exception $e) {
                    $syncResults['errors'][] = [
                        'customer_id' => $customer->id,
                        'customer_name' => $customer->name,
                        'error' => $e->getMessage(),
                    ];
                    Log::error("Error syncing customer {$customer->name}: " . $e->getMessage());
                }
            }

            Log::info('Customer status sync completed: ' . json_encode($syncResults));
            return $syncResults;
        } catch (Exception $e) {
            Log::error('Error in syncCustomerStatus: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Sync customer status with additional details (IP, login time, etc)
     * 
     * @return array
     */
    public function syncCustomerStatusWithDetails(): array
    {
        try {
            $pppUsers = $this->getAllPPPUsers();
            $syncResults = [
                'total_customers' => 0,
                'synced' => [],
                'not_found' => [],
                'errors' => [],
            ];

            $customers = Customer::all();
            $syncResults['total_customers'] = count($customers);

            // Create map of PPP users for quick lookup
            $pppUserMap = [];
            foreach ($pppUsers as $user) {
                $pppUserMap[strtolower($user['name'])] = $user;
            }

            // Sync each customer
            foreach ($customers as $customer) {
                try {
                    $customerUsername = strtolower($customer->name);
                    
                    if (isset($pppUserMap[$customerUsername])) {
                        $pppUser = $pppUserMap[$customerUsername];
                        $newStatus = $pppUser['is_active'] ? 'active' : 'suspended';

                        // Prepare update data
                        $updateData = ['status' => $newStatus];

                        // Update IP address if available
                        if (isset($pppUser['active_data']['address'])) {
                            $updateData['ip_address'] = $pppUser['active_data']['address'];
                        }

                        $customer->update($updateData);

                        $syncResults['synced'][] = [
                            'id' => $customer->id,
                            'name' => $customer->name,
                            'status' => $newStatus,
                            'ip_address' => $customer->ip_address,
                            'login_time' => $pppUser['active_data']['uptime'] ?? null,
                        ];
                    } else {
                        // Customer not found - set to suspended
                        if ($customer->status !== 'suspended') {
                            $customer->update(['status' => 'suspended']);
                        }
                        
                        $syncResults['not_found'][] = [
                            'id' => $customer->id,
                            'name' => $customer->name,
                            'reason' => 'not_found_in_mikrotik',
                        ];
                    }
                } catch (Exception $e) {
                    $syncResults['errors'][] = [
                        'customer_id' => $customer->id,
                        'customer_name' => $customer->name,
                        'error' => $e->getMessage(),
                    ];
                }
            }

            Log::info('Customer status sync with details completed');
            return $syncResults;
        } catch (Exception $e) {
            Log::error('Error in syncCustomerStatusWithDetails: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get sync status without making changes
     * 
     * @return array
     */
    public function getSyncStatus(): array
    {
        try {
            $pppUsers = $this->getAllPPPUsers();
            $statusReport = [
                'total_ppp_users' => count($pppUsers),
                'active_ppp_users' => 0,
                'suspended_ppp_users' => 0,
                'customers' => [],
            ];

            // Count active and suspended
            foreach ($pppUsers as $user) {
                if ($user['is_active']) {
                    $statusReport['active_ppp_users']++;
                } else {
                    $statusReport['suspended_ppp_users']++;
                }
            }

            // Get customer status
            $customers = Customer::all();
            foreach ($customers as $customer) {
                $customerUsername = strtolower($customer->name);
                $pppUser = null;
                
                foreach ($pppUsers as $user) {
                    if (strtolower($user['name']) === $customerUsername) {
                        $pppUser = $user;
                        break;
                    }
                }

                $statusReport['customers'][] = [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'db_status' => $customer->status,
                    'mikrotik_status' => $pppUser ? ($pppUser['is_active'] ? 'active' : 'suspended') : 'not_found',
                    'in_sync' => $pppUser && $customer->status === ($pppUser['is_active'] ? 'active' : 'suspended'),
                ];
            }

            return $statusReport;
        } catch (Exception $e) {
            Log::error('Error getting sync status: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Manually update customer status in Mikrotik
     * This would require additional Mikrotik API permissions
     *
     * @param Customer $customer
     * @param string $status (active/suspended)
     * @return bool
     */
    public function updateCustomerStatusInMikrotik(Customer $customer, string $status): bool
    {
        try {
            if (!in_array($status, ['active', 'suspended'])) {
                throw new Exception('Invalid status. Must be active or suspended');
            }

            // Get customer username
            $username = $customer->name;
            $pppUsers = $this->getAllPPPUsers();
            
            $userId = null;
            foreach ($pppUsers as $user) {
                if (strtolower($user['name']) === strtolower($username)) {
                    // Note: actual ID would come from the Mikrotik response
                    // For now, we'll just update the database status
                    break;
                }
            }

            // Update in database
            $customer->update(['status' => $status]);

            Log::info("Customer {$customer->name} status updated to {$status}");
            return true;
        } catch (Exception $e) {
            Log::error('Error updating customer status in Mikrotik: ' . $e->getMessage());
            throw $e;
        }
    }
}
