<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'month',
        'year',
        'amount',
        'status',
        'payment_method',
        'midtrans_transaction_id',
        'due_date',
        'paid_date',
        'notes',
    ];

    protected $casts = [
        'month' => 'integer',
        'year' => 'integer',
        'amount' => 'integer',
        'due_date' => 'datetime',
        'paid_date' => 'datetime',
    ];

    /**
     * Get the customer associated with this invoice
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the payments for this invoice
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get invoices for current month
     */
    public static function getCurrentMonth()
    {
        $now = now();
        return self::where('month', $now->month)
            ->where('year', $now->year);
    }

    /**
     * Check if invoice is overdue
     */
    public function isOverdue(): bool
    {
        return $this->due_date < now() && $this->status === 'pending';
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid($paymentMethod = 'transfer', $midtransId = null)
    {
        $this->update([
            'status' => 'paid',
            'payment_method' => $paymentMethod,
            'midtrans_transaction_id' => $midtransId,
            'paid_date' => now(),
        ]);
    }
}
