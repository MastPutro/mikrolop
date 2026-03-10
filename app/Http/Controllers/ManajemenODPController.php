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
        $odps = ODP::with('server')->get();
        return response()->json($odps);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'server_id' => 'required|exists:servers,id',
            'status' => 'required|in:online,offline',
            'ports' => 'required|integer|min:1',
            'used_ports' => 'required|integer|min:0',
        ]);

        $odp = ODP::create($validated);

        return response()->json([
            'message' => 'ODP created successfully',
            'odp' => $odp->load('server'),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $odp = ODP::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'lat' => 'required|numeric',
            'lng' => 'required|numeric',
            'server_id' => 'required|exists:servers,id',
            'status' => 'required|in:online,offline',
            'ports' => 'required|integer|min:1',
            'used_ports' => 'required|integer|min:0',
        ]);

        $odp->update($validated);

        return response()->json([
            'message' => 'ODP updated successfully',
            'odp' => $odp->load('server'),
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
