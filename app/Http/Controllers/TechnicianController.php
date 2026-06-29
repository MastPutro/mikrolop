<?php

namespace App\Http\Controllers;

use App\Models\Technician;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;

class TechnicianController extends Controller
{
    /**
     * Render the technician management page
     */
    public function index()
    {
        return Inertia::render('ManajemenTeknisi/Index');
    }

    /**
     * API: List all technicians with optional search
     */
    public function list(Request $request): JsonResponse
    {
        $query = Technician::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('specialization', 'like', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        $technicians = $query->orderBy('name', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $technicians,
        ]);
    }

    /**
     * API: Create a new technician
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'specialization' => 'nullable|string|max:255',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $technician = Technician::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Teknisi berhasil ditambahkan',
            'data' => $technician,
        ], 201);
    }

    /**
     * API: Update a technician
     */
    public function update(Request $request, $id): JsonResponse
    {
        $technician = Technician::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'specialization' => 'nullable|string|max:255',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $technician->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data teknisi berhasil diperbarui',
            'data' => $technician,
        ]);
    }

    /**
     * API: Delete a technician
     */
    public function destroy($id): JsonResponse
    {
        $technician = Technician::findOrFail($id);

        // Check if technician has active tickets
        $activeTickets = $technician->tickets()
            ->whereNotIn('status', ['resolved', 'closed'])
            ->count();

        if ($activeTickets > 0) {
            return response()->json([
                'success' => false,
                'message' => "Tidak dapat menghapus teknisi. Masih ada {$activeTickets} tiket aktif yang ditugaskan.",
            ], 422);
        }

        $technician->delete();

        return response()->json([
            'success' => true,
            'message' => 'Teknisi berhasil dihapus',
        ]);
    }
}
