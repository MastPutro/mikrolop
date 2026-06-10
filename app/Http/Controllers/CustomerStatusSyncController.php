<?php
// app/Http/Controllers/CustomerStatusSyncController.php

namespace App\Http\Controllers;

use App\Services\MikrotikStatusSyncService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class CustomerStatusSyncController extends Controller
{
    private $syncService;

    public function __construct(MikrotikStatusSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * Get current sync status (read-only, no changes made)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSyncStatus(Request $request)
    {
        try {
            $status = $this->syncService->getSyncStatus();
            return response()->json([
                'success' => true,
                'message' => 'Sync status retrieved successfully',
                'data' => $status,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting sync status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get sync status: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Sync customer status from Mikrotik and update database
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function syncStatus(Request $request)
    {
        try {
            Log::info('Manual sync triggered by user: ' . ($request->user()?->id ?? 'Unknown'));
            
            $results = $this->syncService->syncCustomerStatus();

            return response()->json([
                'success' => true,
                'message' => 'Customer status synchronized successfully',
                'data' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error('Error syncing customer status: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync customer status: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Sync customer status with detailed information
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function syncStatusWithDetails(Request $request)
    {
        try {
            Log::info('Detailed sync triggered by user: ' . ($request->user()?->id ?? 'Unknown'));
            
            $results = $this->syncService->syncCustomerStatusWithDetails();

            return response()->json([
                'success' => true,
                'message' => 'Customer status synchronized with details',
                'data' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error('Error syncing with details: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to sync with details: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get list of all PPP users from Mikrotik
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPPPUsers(Request $request)
    {
        try {
            $users = $this->syncService->getAllPPPUsers();

            return response()->json([
                'success' => true,
                'message' => 'PPP users retrieved successfully',
                'total' => count($users),
                'data' => $users,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting PPP users: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get PPP users: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get active PPP connections
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getActivePPP(Request $request)
    {
        try {
            $connections = $this->syncService->getActivePPPConnections();

            return response()->json([
                'success' => true,
                'message' => 'Active PPP connections retrieved successfully',
                'total' => count($connections),
                'data' => $connections,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting active PPP: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get active PPP connections: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get PPP secrets (configured users)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPPPSecrets(Request $request)
    {
        try {
            $secrets = $this->syncService->getPPPSecrets();

            return response()->json([
                'success' => true,
                'message' => 'PPP secrets retrieved successfully',
                'total' => count($secrets),
                'data' => $secrets,
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting PPP secrets: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get PPP secrets: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get health check - test Mikrotik connection
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function healthCheck(Request $request)
    {
        try {
            $status = $this->syncService->getSyncStatus();
            
            return response()->json([
                'success' => true,
                'message' => 'Mikrotik connection healthy',
                'data' => [
                    'connected' => true,
                    'total_ppp_users' => $status['total_ppp_users'],
                    'active_users' => $status['active_ppp_users'],
                    'suspended_users' => $status['suspended_ppp_users'],
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Health check failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to connect to Mikrotik: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }
}
