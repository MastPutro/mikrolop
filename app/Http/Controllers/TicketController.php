<?php

namespace App\Http\Controllers;

use App\Models\Ticket;
use App\Models\TicketReply;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Enum;

class TicketController extends Controller
{
    /**
     * Get all tickets with filters and pagination
     */
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with(['customer', 'assignedTo', 'replies']);

        // Filters
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        // Search by ticket number, title, or customer name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('ticket_number', 'like', "%$search%")
                  ->orWhere('title', 'like', "%$search%")
                  ->orWhereHas('customer', function ($subQuery) use ($search) {
                      $subQuery->where('name', 'like', "%$search%");
                  });
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $tickets = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $tickets,
        ]);
    }

    /**
     * Create a new ticket
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'customer_id' => 'required|exists:customers,id',
                'title' => 'required|string|max:255',
                'description' => 'required|string',
                'priority' => 'required|in:low,medium,high,urgent',
                'category' => 'required|in:billing,technical,service,complaint,other',
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $e->errors(),
            ], 422);
        }

        try {
            $ticket = new Ticket($validated);
            $ticket->ticket_number = Ticket::generateTicketNumber();
            $ticket->status = 'open';
            $ticket->save();

            $ticket->load(['customer', 'assignedTo', 'replies']);

            return response()->json([
                'success' => true,
                'message' => 'Tiket berhasil dibuat',
                'data' => $ticket,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat tiket: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get ticket details
     */
    public function show(Ticket $ticket): JsonResponse
    {
        try {
            $ticket->load(['customer', 'assignedTo', 'replies.user']);

            return response()->json([
                'success' => true,
                'data' => $ticket,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tiket tidak ditemukan: ' . $e->getMessage(),
            ], 404);
        }
    }

    /**
     * Update ticket details
     */
    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'status' => 'sometimes|in:open,in_progress,pending,resolved,closed',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'category' => 'sometimes|in:billing,technical,service,complaint,other',
            'assigned_to' => 'sometimes|nullable|exists:users,id',
            'resolution_notes' => 'sometimes|nullable|string',
        ]);

        try {
            // Handle status transitions
            if (isset($validated['status'])) {
                match($validated['status']) {
                    'in_progress' => $ticket->markAsInProgress(),
                    'resolved' => $ticket->markAsResolved(),
                    'closed' => $ticket->markAsClosed(),
                    default => null,
                };
                unset($validated['status']);
            }

            $ticket->update($validated);
            $ticket->load(['customer', 'assignedTo', 'replies']);

            return response()->json([
                'success' => true,
                'message' => 'Tiket berhasil diperbarui',
                'data' => $ticket,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui tiket: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete ticket
     */
    public function destroy(Ticket $ticket): JsonResponse
    {
        try {
            $ticket->delete();

            return response()->json([
                'success' => true,
                'message' => 'Tiket berhasil dihapus',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus tiket: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add reply to ticket
     */
    public function addReply(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'is_internal' => 'sometimes|boolean',
        ]);

        try {
            $userId = Auth::id();
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak terautentikasi',
                ], 401);
            }

            $reply = TicketReply::create([
                'ticket_id' => $ticket->id,
                'user_id' => $userId,
                'message' => $validated['message'],
                'is_internal' => $validated['is_internal'] ?? false,
            ]);
            $reply->load('user');

            // Update ticket's updated_at
            $ticket->touch();

            return response()->json([
                'success' => true,
                'message' => 'Balasan berhasil ditambahkan',
                'data' => $reply,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan balasan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get ticket replies
     */
    public function getReplies(Ticket $ticket, Request $request): JsonResponse
    {
        try {
            $query = $ticket->replies();

            // Only show internal notes if authenticated user is admin
            if (!Auth::user() || !Auth::user()->isAdmin()) {
                $query->where('is_internal', false);
            }

            $replies = $query->with('user')->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $replies,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil balasan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete reply
     */
    public function deleteReply(Ticket $ticket, TicketReply $reply): JsonResponse
    {
        try {
            if ($reply->ticket_id !== $ticket->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Balasan tidak ditemukan di tiket ini',
                ], 404);
            }

            // Only allow deletion if user is the creator or admin
            if (Auth::id() !== $reply->user_id && !Auth::user()->isAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak diizinkan menghapus balasan ini',
                ], 403);
            }

            $reply->delete();

            return response()->json([
                'success' => true,
                'message' => 'Balasan berhasil dihapus',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus balasan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get customer's tickets (for customer-side API)
     */
    public function getCustomerTickets(Request $request): JsonResponse
    {
        try {
            $customer = Customer::where('user_id', Auth::id())->first();

            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Pelanggan tidak ditemukan',
                ], 404);
            }

            $query = Ticket::where('customer_id', $customer->id)
                ->with(['assignedTo', 'replies']);

            // Filters
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = $request->get('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $tickets = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $tickets,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil tiket: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics
     */
    public function getStatistics(): JsonResponse
    {
        try {
            $stats = [
                'total' => Ticket::count(),
                'open' => Ticket::where('status', 'open')->count(),
                'in_progress' => Ticket::where('status', 'in_progress')->count(),
                'resolved' => Ticket::where('status', 'resolved')->count(),
                'closed' => Ticket::where('status', 'closed')->count(),
                'urgent' => Ticket::where('priority', 'urgent')->where('status', '!=', 'closed')->count(),
                'average_response_time' => Ticket::whereNotNull('response_time_minutes')->avg('response_time_minutes'),
                'average_resolution_time' => Ticket::whereNotNull('resolution_time_minutes')->avg('resolution_time_minutes'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil statistik: ' . $e->getMessage(),
            ], 500);
        }
    }
}
