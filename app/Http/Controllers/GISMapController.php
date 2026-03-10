<?php

namespace App\Http\Controllers;

use App\Models\Server;
use App\Models\ODP;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GISMapController extends Controller
{
    /**
     * Display the GIS map page
     */
    public function index()
    {
        $servers = Server::with('odps')->get();
        $odps = ODP::with(['server', 'customers'])->get();
        $customers = Customer::with('odp')->get();

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
            'odps' => ODP::with(['server', 'customers'])->get(),
            'customers' => Customer::with('odp')->get(),
        ]);
    }

    /**
     * Get server details
     */
    public function getServer($id)
    {
        $server = Server::with('odps')->findOrFail($id);
        
        return response()->json([
            'server' => $server,
            'connected_odps' => $server->odps->count(),
            'total_customers' => Customer::whereIn('odp_id', $server->odps->pluck('id'))->count(),
        ]);
    }

    /**
     * Get ODP details
     */
    public function getODP($id)
    {
        $odp = ODP::with(['server', 'customers'])->findOrFail($id);
        
        return response()->json([
            'odp' => $odp,
            'connected_customers' => $odp->customers->count(),
            'active_customers' => $odp->customers->where('status', 'active')->count(),
        ]);
    }

    /**
     * Get customer details
     */
    public function getCustomer($id)
    {
        $customer = Customer::with('odp.server')->findOrFail($id);
        
        return response()->json([
            'customer' => $customer,
            'connection_path' => [
                'server' => $customer->odp->server,
                'odp' => $customer->odp,
            ],
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
     */
    private function recalculateODPUsage($odpId)
    {
        $odp = ODP::findOrFail($odpId);
        $activeCustomers = $odp->customers()->where('status', 'active')->count();
        
        $odp->update(['used_ports' => $activeCustomers]);
        
        // Update server usage
        $server = $odp->server;
        $totalActiveCustomers = Customer::whereIn('odp_id', $server->odps->pluck('id'))
            ->where('status', 'active')
            ->count();
        
        $server->update(['used' => $totalActiveCustomers]);
    }

    /**
     * Export data to JSON
     */
    public function export()
    {
        $data = [
            'servers' => Server::with('odps')->get(),
            'odps' => ODP::with(['server', 'customers'])->get(),
            'customers' => Customer::with('odp')->get(),
            'exported_at' => now()->toIso8601String(),
        ];

        return response()->json($data)
            ->header('Content-Disposition', 'attachment; filename="network-topology-' . now()->format('Y-m-d-His') . '.json"');
    }
}