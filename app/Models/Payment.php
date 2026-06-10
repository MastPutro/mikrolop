<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'customer_id',
        'amount',
        'method',
        'midtrans_transaction_id',
        'proof_of_payment',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'integer',
    ];

    /**
     * Get the invoice associated with this payment
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the customer associated with this payment
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
