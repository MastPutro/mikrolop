<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    protected $fillable = [
        'customer_id',
        'ticket_number',
        'title',
        'description',
        'status',
        'priority',
        'category',
        'assigned_to',
        'resolution_notes',
        'resolved_at',
        'closed_at',
        'response_time_minutes',
        'resolution_time_minutes',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'closed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the customer that owns the ticket
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the customer assigned to this ticket
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'assigned_to');
    }

    /**
     * Get all replies for this ticket
     */
    public function replies(): HasMany
    {
        return $this->hasMany(TicketReply::class)->orderBy('created_at', 'asc');
    }

    /**
     * Get public replies only
     */
    public function publicReplies(): HasMany
    {
        return $this->hasMany(TicketReply::class)
            ->where('is_internal', false)
            ->orderBy('created_at', 'asc');
    }

    /**
     * Generate unique ticket number
     */
    public static function generateTicketNumber(): string
    {
        $date = now()->format('YmdHis');
        $lastTicket = self::latest()->first();
        $counter = $lastTicket ? intval(substr($lastTicket->ticket_number, -5)) + 1 : 1;
        
        return 'TKT-' . $date . '-' . str_pad($counter, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Mark ticket as in progress
     */
    public function markAsInProgress(): void
    {
        $this->update([
            'status' => 'in_progress',
            'response_time_minutes' => now()->diffInMinutes($this->created_at),
        ]);
    }

    /**
     * Mark ticket as resolved
     */
    public function markAsResolved(): void
    {
        $this->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'resolution_time_minutes' => now()->diffInMinutes($this->created_at),
        ]);
    }

    /**
     * Mark ticket as closed
     */
    public function markAsClosed(): void
    {
        $this->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);
    }

    /**
     * Get status badge color
     */
    public function getStatusBadgeColor(): string
    {
        return match($this->status) {
            'open' => 'bg-yellow-100 text-yellow-800',
            'in_progress' => 'bg-blue-100 text-blue-800',
            'pending' => 'bg-purple-100 text-purple-800',
            'resolved' => 'bg-green-100 text-green-800',
            'closed' => 'bg-gray-100 text-gray-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }

    /**
     * Get priority badge color
     */
    public function getPriorityBadgeColor(): string
    {
        return match($this->priority) {
            'low' => 'bg-green-100 text-green-800',
            'medium' => 'bg-yellow-100 text-yellow-800',
            'high' => 'bg-orange-100 text-orange-800',
            'urgent' => 'bg-red-100 text-red-800',
            default => 'bg-gray-100 text-gray-800',
        };
    }
}
