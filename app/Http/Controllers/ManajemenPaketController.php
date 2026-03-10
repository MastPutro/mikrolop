<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Services\MikrotikScriptService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ManajemenPaketController extends Controller
{
    /**
     * Display the package management page
     */
    public function index()
    {
        $packages = Package::all();

        return Inertia::render('ManajemenPaket/Index', [
            'packages' => $packages,
        ]);
    }

    /**
     * Get list of packages (for API)
     */
    public function list()
    {
        $packages = Package::query()
            ->when(request('search'), function ($query) {
                $query->where('name', 'like', '%' . request('search') . '%')
                    ->orWhere('description', 'like', '%' . request('search') . '%');
            })
            ->when(request('is_active'), function ($query) {
                if (request('is_active') !== 'all') {
                    $query->where('is_active', request('is_active') === 'true');
                }
            })
            ->orderBy('name')
            ->paginate(15);

        return response()->json($packages);
    }

    /**
     * Store a new package
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:packages|max:255',
            'speed_tx' => 'required|integer|min:1|max:10000',
            'speed_rx' => 'required|integer|min:1|max:10000',
            'bucket_size' => 'required|integer|min:1|max:1000',
            'parent_queue' => 'required|string|max:255',
            'priority' => 'integer|between:0,7',
            'description' => 'nullable|string|max:1000',
            'price' => 'required|numeric|min:0',
        ]);

        // Set default priority if not provided
        $validated['priority'] = $validated['priority'] ?? 8;
        $validated['is_active'] = true;

        $package = Package::create($validated);


        return response()->json([
            'message' => 'Package created successfully',

        ], 201);
    }

    /**
     * Display a specific package
     */
    public function show(Package $package)
    {
        $package->load('customers');

        return response()->json($package);
    }

    /**
     * Update a package
     */
    public function update(Request $request, Package $package)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|unique:packages,name,' . $package->id . '|max:255',
            'speed_tx' => 'sometimes|integer|min:1|max:10000',
            'speed_rx' => 'sometimes|integer|min:1|max:10000',
            'bucket_size' => 'sometimes|integer|min:1|max:1000',
            'parent_queue' => 'sometimes|string|max:255',
            'priority' => 'sometimes|integer|between:0,7',
            'description' => 'sometimes|nullable|string|max:1000',
            'price' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $oldName = $package->name;
        $package->update($validated);

        // If speed or bucket config changed, regenerate script for all customers
        if (isset($validated['speed_tx']) || isset($validated['speed_rx']) || 
            isset($validated['bucket_size']) || isset($validated['parent_queue'])) {
            $script = MikrotikScriptService::generateBatchScript($package);
            MikrotikScriptService::storeScript($package, null, $script);
        }

        return response()->json([
            'message' => 'Package updated successfully',
            'data' => $package,
        ]);
    }

    /**
     * Delete a package
     */
    public function destroy(Package $package)
    {
        // Check if package is being used by any customers
        if ($package->customers()->exists()) {
            return response()->json([
                'message' => 'Cannot delete package that has active customers',
                'customer_count' => $package->customers()->count(),
            ], 422);
        }

        $package->delete();

        return response()->json([
            'message' => 'Package deleted successfully',
        ]);
    }

    /**
     * Get script for a specific customer with their package
     */
    public function getCustomerScript(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|integer|exists:customers,id',
        ]);

        $customer = \App\Models\Customer::findOrFail($validated['customer_id']);
        
        if (!$customer->package_id) {
            return response()->json([
                'message' => 'Customer does not have a package assigned',
            ], 404);
        }

        $package = $customer->package;
        $script = MikrotikScriptService::generateCompleteCustomerScript($customer, $package);

        return response()->json([
            'customer' => $customer,
            'package' => $package,
            'script' => $script,
        ]);
    }

    /**
     * Download script for removing a customer
     */
    public function downloadRemoveScript(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|integer|exists:customers,id',
        ]);

        $customer = \App\Models\Customer::findOrFail($validated['customer_id']);
        
        if (!$customer->package_id) {
            return response()->json([
                'message' => 'Customer does not have a package assigned',
            ], 404);
        }

        $package = $customer->package;
        $script = MikrotikScriptService::generateRemoveCustomerScript($customer, $package);

        return response($script)
            ->header('Content-Type', 'text/plain')
            ->header('Content-Disposition', 'attachment; filename="' . $customer->name . '_remove_' . now()->timestamp . '.txt"');
    }
}
