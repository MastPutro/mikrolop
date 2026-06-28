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
use Illuminate\Support\Facades\Http;

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
            'router_mac' => 'nullable|string|max:255',
            'interface_name' => 'nullable|string|max:255',
        ]);

        $customer = Customer::create($validated);
        $customer->load('odp', 'package');
        $webClientResponse = $this->postToWebClient($customer->name);

        return response()->json([
            'message' => 'Customer created successfully',
            'data' => $customer,
            'web_client_response' => $webClientResponse,

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

        if (isset($validated['package_id']) && $validated['package_id'] !== $customer->package_id) {
            $this->updatePackage($customer, $validated['package_id']);
        }
        // if (isset($validated['status']) && $validated['status'] !== $customer->status) {
        //     $customer->status = $validated['status'];
        //     $this->updateStatus($customer);
        // }

        $customer->update($validated);
        $customer->load('odp', 'package');

        return response()->json([
            'message' => 'Customer updated successfully',
            'data' => $customer,
        ]);
    }

    public function updateIsolationStatus($customerId, $isIsolated)
    {

        // 1. Cari data pelanggan berdasarkan ID
        $customer = Customer::findOrFail($customerId);

        // 2. Pastikan input yang masuk hanya bernilai 'yes' atau 'no'
        $isIsolatedValue = (strtolower($isIsolated) === 'yes') ? 'yes' : 'no';

        // 3. Lakukan proses UPDATE (bukan INSERT)
        $customer->update([
            'is_isolated' => $isIsolatedValue
        ]);

        return response()->json([
            'message' => 'Status isolasi berhasil diupdate',
            'data' => $customer
        ]);
    }

    /** 
     * Update customer status (active/inactive)
     * If status is set to inactive, also execute script to isolate the customer in Mikrotik
     * If status is set to active, also execute script to un-isolate the customer in
     */
    public function updateStatus(Customer $customer)
    {
        $config = new Config([
            'host' => env('MIKROTIK_HOST'),
            'user' => env('MIKROTIK_USER'),
            'pass' => env('MIKROTIK_PASS'),
            'port' => (int) env('MIKROTIK_PORT'),
        ]);

        $client = new Client($config);

        if ($customer->status === 'inactive') {
            // Execute script to un-isolate the customer in Mikrotik
            $query = (new Query ('/ip/firewall/address-list/add'))
                ->equal('list', 'ISOLIR-LIST')
                ->equal('address', $customer->ip_address);
            $client->query($query)->read();
            return response()->json([
                'message' => 'Customer status updated to inactive and isolated in Mikrotik',
            ]);
        } elseif ($customer->status === 'suspended') {
            // Execute script to isolate the customer in Mikrotik
            $query = (new Query ('/ip/firewall/address-list/print'))
                ->where('list', 'ISOLIR-LIST')
                ->where('address', $customer->ip_address);
            $isolirEntry = $client->query($query)->read();
            if (isset($isolirEntry[0]['.id'])) {
                $isolirId = $isolirEntry[0]['.id'];
                $removeIsolirQuery = (new Query('/ip/firewall/address-list/remove'))
                    ->equal('.id', $isolirId);
                $client->query($removeIsolirQuery)->read();
            }
            return response()->json([
                'message' => 'Customer status updated to suspended and un-isolated in Mikrotik',
            ]);
        } else {
            return response()->json([
                'message' => 'Customer status updated to active',
            ]);
        }
    }

    /**
     * Update Queue in Mikrotik when package is updated
     */
    public function updatePackage(Customer $customer, $packageId)
    {
        $package = Package::find($packageId);
        $config = new Config([
            'host' => env('MIKROTIK_HOST'),
            'user' => env('MIKROTIK_USER'),
            'pass' => env('MIKROTIK_PASS'),
            'port' => (int) env('MIKROTIK_PORT'),
        ]);

        $client = new Client($config);

        // Update Queue
        $queryQueue = (new Query('/queue/simple/print'))
            ->where('name', $customer->name);
        $queue = $client->query($queryQueue)->read();
        if (isset($queue[0]['.id'])) {
            $queueId = $queue[0]['.id'];
            $updateQueueQuery = (new Query('/queue/simple/set'))
                ->equal('.id', $queueId)
                ->equal('max-limit', $package->speed_tx . 'M/' . $package->speed_rx . 'M')
                ->equal('bucket-size', $package->bucket_size. '/' . $package->bucket_size)
                ->equal('parent', $package->parent_queue);
            $responseQueue = $client->query($updateQueueQuery)->read();
        }

        return response()->json([
            'message' => "Customer '{$customer->name}' package updated in Mikrotik successfully",
            'response' => $responseQueue,
        ]);
    }
        

    /**
     * Delete a customer
     */
    public function destroy(Customer $customer)
    {
        $customerName = $customer->name;
        $customer->delete();
        $webClientResponse = $this->deleteFromWebClient($customerName);


        return response()->json([
            'message' => "Customer '{$customerName}' deleted successfully",
            'server_response' => $this->deleteFromMikrotik($customer->name, $customer->ip_address),
            'web_client_response' => $webClientResponse,
        ]);
    }

    /**
     * Delete a customer PPP secret and queue in Mikrotik
     */
    public function deleteFromMikrotik($name, $ipAddress)
    {
        $config = new Config([
            'host' => env('MIKROTIK_HOST'),
            'user' => env('MIKROTIK_USER'),
            'pass' => env('MIKROTIK_PASS'),
            'port' => (int) env('MIKROTIK_PORT'),
        ]);
        $client = new Client($config);
        try {
            // Remove PPP secret
            // 1. Search for the item to get its .id
            $query = (new Query('/ppp/secret/print'))
                ->where('name', $name);
            $user = $client->query($query)->read();
            // 2. If the user exists, remove it using the .id
            if (isset($user[0]['.id'])) {
                $userId = $user[0]['.id'];
                $removeQuery = (new Query('/ppp/secret/remove'))
                    ->equal('.id', $userId);
                $response = $client->query($removeQuery)->read();
                // A successful removal typically returns an empty array []
            }
            // Remove Queue
            $queryQueue = (new Query('/queue/simple/print'))
                ->where('name', $name);
            $queue = $client->query($queryQueue)->read();
            if (isset($queue[0]['.id'])) {
                $queueId = $queue[0]['.id'];
                $removeQueueQuery = (new Query('/queue/simple/remove'))
                    ->equal('.id', $queueId);
                $responseQueue = $client->query($removeQueueQuery)->read();
            }
            // Remove from isolir list if exists
            $queryIsolir = (new Query('/ip/firewall/address-list/print'))
                ->where('list', 'ISOLIR-LIST')
                ->where('address', $ipAddress);
            $isolirEntry = $client->query($queryIsolir)->read();
            if (isset($isolirEntry[0]['.id'])) {
                $isolirId = $isolirEntry[0]['.id'];
                $removeIsolirQuery = (new Query('/ip/firewall/address-list/remove'))
                    ->equal('.id', $isolirId);
                $responseIsolir = $client->query($removeIsolirQuery)->read();
            }

            return response()->json([
                'message' => "Customer '{$name}' removed from Mikrotik successfully",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => "Failed to remove customer '{$name}' from Mikrotik: " . $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
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
            ->equal('local-address', env('MIKROTIK_PPP_IP'));
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

    /**
     *  Sync customer status with Mikrotik and update database accordingly
     */
    public function setStatusActive($name)
    {
        $customer = Customer::where('name', $name)->first();

        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found',
            ], 404);
        }

        // Here you would implement logic to check the customer's status in Mikrotik
        // and update the database accordingly. This is just a placeholder.
        $customer->status = 'active'; // or 'inactive' based on Mikrotik status
        $customer->save();

        return response()->json([
            'message' => 'Customer status updated successfully via Netwatch',
            'data' => $customer,
        ]);
    }
    public function setStatusInactive($name)
    {
        $customer = Customer::where('name', $name)->first();

        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found',
            ], 404);
        }

        // Here you would implement logic to check the customer's status in Mikrotik
        // and update the database accordingly. This is just a placeholder.
        $customer->status = 'suspended'; // or 'active' based on Mikrotik status
        $customer->save();

        return response()->json([
            'message' => 'Customer status updated successfully via Netwatch',
            'data' => $customer,
        ]);
    }


    /**
     * Create User to web Client
     */
    public function postToWebClient($name)
    {
        $header = [
            'X-API-KEY' => env('WEB_CLIENT_API_KEY'),
            'Content-Type' => 'application/json',
        ];

        $postData = [
            'name' => $name,
            'email' => strtolower($name) . '@sentolop.com',
            'password' => $name . '@1234',
            'password_confirmation' => $name . '@1234',
        ];

        try {
            $response = Http::withHeaders($header)->timeout(10)->post(env('WEB_CLIENT_URL') . '/register-user', $postData);
            if ($response->successful()) {
                return [
                    'message' => 'User created successfully in web client',
                    'data' => $response->json(),
                ];
            } else {
                return [
                    'message' => 'Failed to create user in web client',
                    'status' => $response->status(),
                    'error' => $response->body(),
                ];
            }
        } catch (\Exception $e) {
            return [
                'message' => 'Failed to connect to web client',
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete User from web Client
     */
    public function deleteFromWebClient($name)
    {
        $header = [
            'X-API-KEY' => env('WEB_CLIENT_API_KEY'),
            'Content-Type' => 'application/json',
        ];

        $response = Http::withHeaders($header)->delete(env('WEB_CLIENT_URL') . '/delete-user/' . strtolower($name) . '@sentolop.com');
        if ($response->successful()) {
            return [
                'message' => 'User deleted successfully from web client',
                'data' => $response->json(),
            ];
        } else {
            return [
                'message' => 'Failed to delete user from web client',
                'error' => $response->body(),
            ];
        }
    }
}
