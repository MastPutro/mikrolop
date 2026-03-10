<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\ODP;
use App\Models\Package;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RouterOS\Config;
use RouterOS\Client;
use RouterOS\Query;

class ManajemenUserController extends Controller
{
    /**
     * Display the user management page
     */
    public function index()
    {
        $customers = Customer::with('odp', 'package')->get();
        $odps = ODP::all();
        $packages = Package::all();

        return Inertia::render('ManajemenUser/Index', [
            'customers' => $customers,
            'odps' => $odps,
            'packages' => $packages,
        ]);
    }

    /**
     * Get list of customers (for API)
     */
    public function list()
    {
        $customers = Customer::query()
            ->with(['odp', 'package'])
            ->when(request('search'), function ($query) {
                $search = request('search');
                $query->where('name', 'like', '%' . $search . '%')
                    ->orWhere('phone_number', 'like', '%' . $search . '%')
                    ->orWhere('ip_address', 'like', '%' . $search . '%')
                    ->orWhereHas('odp', function ($q) use ($search) {
                        $q->where('name', 'like', '%' . $search . '%');
                    });
            })
            ->when(request('status') && request('status') !== 'all', function ($query) {
                $query->where('status', request('status'));
            })
            ->when(request('odp_id') && request('odp_id') !== 'all', function ($query) {
                $query->where('odp_id', request('odp_id'));
            })
            ->orderBy('name')
            ->paginate(15);

        return response()->json($customers);
    }

    /**
     * Store a new customer
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:customers',
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'odp_id' => 'required|exists:o_d_p_s,id',
            'package_id' => 'nullable|exists:packages,id',
            'status' => 'required|in:active,inactive,suspended',
            'phone_number' => 'nullable|string|max:20',
            'ip_address' => 'required|unique:customers|ipv4',
        ]);

        $customer = Customer::create($validated);
        $customer->load('odp', 'package');

        return response()->json([
            'message' => 'Customer created successfully',
            'data' => $customer,
        ], 201);
    }

    /**
     * Display a specific customer
     */
    public function show(Customer $customer)
    {
        $customer->load('odp', 'package');

        return response()->json($customer);
    }

    /**
     * Update a customer
     */
    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'lat' => 'sometimes|numeric|between:-90,90',
            'lng' => 'sometimes|numeric|between:-180,180',
            'odp_id' => 'sometimes|exists:o_d_p_s,id',
            'package_id' => 'nullable|exists:packages,id',
            'status' => 'sometimes|in:active,inactive,suspended',
            'phone_number' => 'nullable|string|max:20',
            'ip_address' => 'sometimes|unique:customers,ip_address,' . $customer->id . '|ipv4',
        ]);

        $customer->update($validated);
        $customer->load('odp', 'package');

        return response()->json([
            'message' => 'Customer updated successfully',
            'data' => $customer,
        ]);
    }

    /**
     * Delete a customer
     */
    public function destroy(Customer $customer)
    {
        $customerName = $customer->name;
        $customer->delete();

        return response()->json([
            'message' => "Customer '{$customerName}' deleted successfully",
        ]);
    }

    /**
     * Get customer by IP address
     */
    public function getByIp($ipAddress)
    {
        $customer = Customer::where('ip_address', $ipAddress)
            ->with('odp', 'package')
            ->first();

        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found',
            ], 404);
        }

        return response()->json($customer);
    }

    /**
     * Bulk update status
     */
    public function bulkUpdateStatus(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:customers,id',
            'status' => 'required|in:active,inactive,suspended',
        ]);

        Customer::whereIn('id', $validated['ids'])
            ->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'Customers updated successfully',
        ]);
    }

    /**
     * Handle execute script after creating customer (if exe_script is true)
     */
    public function handleExecuteScript($name, $ip_address, $package)
    {
        $package = Package::find($package);
        // Implement logic to execute script for the customer
        // This could involve dispatching a job, calling an external API, etc.
        $config = new Config([
            'host' => env('MIKROTIK_HOST'),
            'user' => env('MIKROTIK_USER'),
            'pass' => env('MIKROTIK_PASS'),
            'port' => (int) env('MIKROTIK_PORT'),
        ]);

        $client = new Client($config);

        $querySecret = (new Query('/ppp/secret/add'))
            ->equal('name', $name)
            ->equal('password', '1234') // You should generate a secure password
            ->equal('service', 'pppoe')
            ->equal('remote-address', $ip_address)
            ->equal('local-address', '192.168.1.1');
            // ->equal('profile', 'default');
        $Secretresponse = $client->query($querySecret)->read();

        $queryQueue = (new Query('/queue/simple/add'))
            ->equal('name', $name)
            ->equal('target', $ip_address)
            ->equal('max-limit', $package->speed_tx . 'M/' . $package->speed_rx . 'M')
            ->equal('bucket-size', $package->bucket_size. '/' . $package->bucket_size)
            ->equal('parent', $package->parent_queue);
        $Queueresponse = $client->query($queryQueue)->read();


        return [
            'message' => 'Script executed successfully',
                'response' => [
                    'secret' => $Secretresponse,
                    'queue' => $Queueresponse,
                ],
        ];

    }
}
