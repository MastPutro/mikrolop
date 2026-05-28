<?php

use App\Http\Controllers\GISMapController;
use App\Http\Controllers\ManajemenODPController;
use App\Http\Controllers\ManajemenPaketController;
use App\Http\Controllers\ManajemenUserController;
use App\Http\Controllers\CustomerStatusSyncController;
use App\Http\Controllers\MikrotikController;
use App\Http\Controllers\ServerController;
use App\Http\Controllers\KeuanganController;
use App\Http\Controllers\TicketController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    
    // Update node status
    Route::patch('/gis/server/{id}/status', [GISMapController::class, 'updateServerStatus']);
    Route::patch('/gis/odp/{id}/status', [GISMapController::class, 'updateODPStatus']);
    Route::patch('/gis/customer/{id}/status', [GISMapController::class, 'updateCustomerStatus']);
    
    // Export
    Route::post('/gis/export', [GISMapController::class, 'export']);
});

// Web session authenticated endpoints
Route::middleware(['api'])->group(function () {
    // Manajemen ODP Routes
    Route::get('/odp-list', [ManajemenODPController::class, 'list']);
    Route::post('/odp', [ManajemenODPController::class, 'store']);
    Route::put('/odp/{id}', [ManajemenODPController::class, 'update']);
    Route::delete('/odp/{id}', [ManajemenODPController::class, 'destroy']);
    
    // Manajemen Paket Routes
    Route::get('/paket-list', [ManajemenPaketController::class, 'list']);
    Route::post('/paket', [ManajemenPaketController::class, 'store']);
    Route::get('/paket/{package}', [ManajemenPaketController::class, 'show']);
    Route::put('/paket/{package}', [ManajemenPaketController::class, 'update']);
    Route::delete('/paket/{package}', [ManajemenPaketController::class, 'destroy']);
    Route::post('/paket/customer-script', [ManajemenPaketController::class, 'getCustomerScript']);
    Route::post('/paket/remove-script', [ManajemenPaketController::class, 'downloadRemoveScript']);
    
    // Manajemen User/Customer Routes
    Route::get('/user-list', [ManajemenUserController::class, 'list']);
    Route::post('/user', [ManajemenUserController::class, 'store']);
    Route::get('/user/{customer}', [ManajemenUserController::class, 'show']);
    Route::put('/user/{customer}', [ManajemenUserController::class, 'update']);
    Route::delete('/user/{customer}', [ManajemenUserController::class, 'destroy']);
    Route::get('/user-by-ip/{ipAddress}', [ManajemenUserController::class, 'getByIp']);
    Route::post('/user/bulk-update-status', [ManajemenUserController::class, 'bulkUpdateStatus']);
    Route::post('/user/execute-script/{name}/{ipAddress}/{packageId}', [ManajemenUserController::class, 'handleExecuteScript']);
    Route::post('/user/web-client/{name}', [ManajemenUserController::class, 'postToWebClient']);
    Route::get('/customers/{name}/status/inactive', [ManajemenUserController::class, 'setStatusInactive']);
    Route::get('/customers/{name}/status/active', [ManajemenUserController::class, 'setStatusActive']);
    
    // Read-only GIS endpoints
    Route::get('/gis/data', [GISMapController::class, 'getData']);
    Route::get('/gis/server/{id}', [GISMapController::class, 'getServer']);
    Route::get('/gis/odp/{id}', [GISMapController::class, 'getODP']);
    Route::get('/gis/customer/{id}', [GISMapController::class, 'getCustomer']);
    Route::get('/gis/customer/{id}/snmp-stats', [GISMapController::class, 'getCustomerSnmpStats']);
    Route::get('/gis/customers/snmp-stats', [GISMapController::class, 'getCustomersWithSnmpStats']);
    Route::get('/gis/search', [GISMapController::class, 'search']);
    Route::get('/gis/statistics', [GISMapController::class, 'getStatistics']);

    // Mikrotik API endpoint
    Route::get('/mikrotik/resources', [MikrotikController::class, 'getResourcesApi']);
    Route::get('/mikrotik/bandwidth', [MikrotikController::class, 'getInterfaceBandwidth']);
    Route::get('/mikrotik/bandwidth-history', [MikrotikController::class, 'getInterfaceBandwidthHistory']);

    // Customer Status Sync Routes
    // Route::prefix('/customer-sync')->group(function () {
    //     Route::get('/status', [CustomerStatusSyncController::class, 'getSyncStatus']);
    //     Route::post('/sync', [CustomerStatusSyncController::class, 'syncStatus']);
    //     Route::post('/sync-detailed', [CustomerStatusSyncController::class, 'syncStatusWithDetails']);
    //     Route::get('/ppp-users', [CustomerStatusSyncController::class, 'getPPPUsers']);
    //     Route::get('/ppp-active', [CustomerStatusSyncController::class, 'getActivePPP']);
    //     Route::get('/ppp-secrets', [CustomerStatusSyncController::class, 'getPPPSecrets']);
    //     Route::get('/health', [CustomerStatusSyncController::class, 'healthCheck']);
    // });

    // Server info endpoint
    Route::get('/server-info', [ServerController::class, 'show']);
    Route::get('/server-info/{status}', [ServerController::class, 'updateStatus']);

    // Keuangan (Billing) Routes
    Route::prefix('/keuangan')->group(function () {
        Route::get('/billing-data', [KeuanganController::class, 'getBillingData']);
        Route::post('/billing-policy', [KeuanganController::class, 'updateBillingPolicy']);
        Route::post('/create-monthly-billing', [KeuanganController::class, 'createMonthlyBilling']);
        Route::post('/payment-token/{invoiceId}', [KeuanganController::class, 'createPaymentToken']);
        Route::post('/record-cash-payment/{invoiceId}', [KeuanganController::class, 'recordCashPayment']);
        Route::get('/verify-payment/{invoiceId}', [KeuanganController::class, 'verifyPaymentStatus']);
        Route::post('/isolir-schedule/{customerId}/{dueDate}/{dueMonth}/{dueYear}', [KeuanganController::class, 'isolirSchedule']);
        Route::post('/remove-isolir/{customerId}', [KeuanganController::class, 'removeIsolir']);
        Route::post('/remove-schedule/{customerId}', [KeuanganController::class, 'removeSchedule']);
    });

    // Ticket/Help Desk Routes
    Route::prefix('/tickets')->group(function () {
        // Admin: Get all tickets with filters
        Route::get('/', [TicketController::class, 'index']);
        
        // Customer: Get their own tickets
        Route::get('/my-tickets', [TicketController::class, 'getCustomerTickets']);
        
        // Create new ticket
        Route::post('/', [TicketController::class, 'store']);
        
        // Get ticket details
        Route::get('/{ticket}', [TicketController::class, 'show']);
        
        // Update ticket
        Route::put('/{ticket}', [TicketController::class, 'update']);
        Route::patch('/{ticket}', [TicketController::class, 'update']);
        
        // Delete ticket
        Route::delete('/{ticket}', [TicketController::class, 'destroy']);
        
        // Ticket replies
        Route::post('/{ticket}/replies', [TicketController::class, 'addReply']);
        Route::get('/{ticket}/replies', [TicketController::class, 'getReplies']);
        Route::delete('/{ticket}/replies/{reply}', [TicketController::class, 'deleteReply']);
        
        // Statistics
        Route::get('/stats/summary', [TicketController::class, 'getStatistics']);
    });


// Public webhook endpoint - must be registered in Midtrans dashboard
// POST: https://yourdomain.com/api/keuangan/payment-notification
Route::post('/keuangan/payment-notification', [KeuanganController::class, 'handlePaymentNotification']);

// Public payment endpoints (no authentication required)
Route::get('/keuangan/public-invoice/{invoiceId}', [KeuanganController::class, 'getPublicInvoice']);
Route::post('/keuangan/public-payment-token/{invoiceId}', [KeuanganController::class, 'createPublicPaymentToken']);
Route::get('/keuangan/public-payment-link/{invoiceId}', [KeuanganController::class, 'generatePublicPaymentLink']);
});