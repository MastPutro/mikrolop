<?php

namespace App\Http\Controllers;

use App\Models\ODP;
use App\Models\Server;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ManajemenODPController extends Controller
{
    public function index()
    {
        $odps = ODP::with('server')->get();
        $servers = Server::all();
        
        return Inertia::render('Manajemen/Index', [
            'odps' => $odps,
            'servers' => $servers,
        ]);
    }

    public function list()
    {
        $odps = ODP::with(['server', 'parentOdp', 'childOdps'])->get();
        
        return response()->json($odps->map(function ($odp) {
            return [
                'id' => $odp->id,
                'name' => $odp->name,
                'lat' => $odp->lat,
                'lng' => $odp->lng,
                'server_id' => $odp->server_id,
                'parent_id' => $odp->parent_id,
                'status' => $odp->status,
                'ports' => $odp->ports,
                'used_ports' => $odp->used_ports,
                'port_usage_percentage' => $odp->port_usage_percentage,
                'available_ports' => $odp->available_ports,
                'is_leaf' => $odp->isLeafODP(),
                'depth' => $odp->getDepth(),
                'root_server' => $odp->getRootServer(),
                'parent_odp' => $odp->parentOdp,
                'child_count' => $odp->childOdps()->count(),
                'customer_count' => $odp->customers()->count(),
                'created_at' => $odp->created_at,
                'updated_at' => $odp->updated_at,
            ];
        }));
    }

    public function store(Request $request)
    {
        // Validate basic ODP fields
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'server_id' => 'nullable|exists:servers,id',
            'parent_id' => 'nullable|exists:o_d_p_s,id',
            'status' => 'required|in:online,offline',
            'ports' => 'required|integer|min:1',
            'used_ports' => 'required|integer|min:0',
        ]);

        // Validate that either server_id or parent_id is provided, but not both
        if (($validated['server_id'] === null && $validated['parent_id'] === null) ||
            ($validated['server_id'] !== null && $validated['parent_id'] !== null)) {
            return response()->json([
                'message' => 'ODP must have either server_id (for root ODP) or parent_id (for child ODP), but not both',
            ], 422);
        }

        // If parent_id is provided, validate the hierarchy
        if ($validated['parent_id'] !== null) {
            $parentOdp = ODP::findOrFail($validated['parent_id']);
            
            // Check depth constraint (max 5 levels)
            if (!$parentOdp->validateDepth($parentOdp)) {
                return response()->json([
                    'message' => 'Cannot create ODP: would exceed maximum hierarchy depth of 5 levels',
                ], 422);
            }

            // Set server_id to null for child ODPs
            $validated['server_id'] = null;
        }

        $odp = ODP::create($validated);

        return response()->json([
            'message' => 'ODP created successfully',
            'odp' => $odp->load(['server', 'parentOdp']),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $odp = ODP::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'server_id' => 'nullable|exists:servers,id',
            'parent_id' => 'nullable|exists:o_d_p_s,id',
            'status' => 'required|in:online,offline',
            'ports' => 'required|integer|min:1',
            'used_ports' => 'required|integer|min:0',
        ]);

        // Validate that either server_id or parent_id is provided, but not both
        if (($validated['server_id'] === null && $validated['parent_id'] === null) ||
            ($validated['server_id'] !== null && $validated['parent_id'] !== null)) {
            return response()->json([
                'message' => 'ODP must have either server_id (for root ODP) or parent_id (for child ODP), but not both',
            ], 422);
        }

        // If parent_id is being changed
        if ($validated['parent_id'] !== null && $validated['parent_id'] !== $odp->parent_id) {
            $newParent = ODP::findOrFail($validated['parent_id']);
            
            // Prevent circular references
            if (!$newParent->canBeParentOf($odp)) {
                return response()->json([
                    'message' => 'Cannot set parent: would create a circular reference',
                ], 422);
            }
            
            // Check depth constraint (max 5 levels)
            if (!$newParent->validateDepth($newParent)) {
                return response()->json([
                    'message' => 'Cannot set parent: would exceed maximum hierarchy depth of 5 levels',
                ], 422);
            }

            // Set server_id to null when moving to parent
            $validated['server_id'] = null;
        }

        $odp->update($validated);

        return response()->json([
            'message' => 'ODP updated successfully',
            'odp' => $odp->load(['server', 'parentOdp']),
        ]);
    }

    public function destroy($id)
    {
        $odp = ODP::findOrFail($id);
        $odp->delete();

        return response()->json([
            'message' => 'ODP deleted successfully',
        ]);
    }
}
