<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketReply extends Model
{
    protected $fillable = [
        'ticket_id',
        'user_id',
        'message',
        'attachment_path',
        'is_internal',
    ];

    protected $casts = [
        'is_internal' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the ticket that this reply belongs to
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Get the user who created this reply
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
