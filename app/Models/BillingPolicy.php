<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillingPolicy extends Model
{
    use HasFactory;

    protected $fillable = [
        'due_date',
        'send_bill_to_whatsapp',
    ];

    protected $casts = [
        'due_date' => 'integer',
        'send_bill_to_whatsapp' => 'boolean',
    ];

    /**
     * Get the latest billing policy
     */
    public static function getCurrent()
    {
        return self::latest()->first() ?? self::create([
            'due_date' => 20,
            'send_bill_to_whatsapp' => true,
        ]);
    }
}
