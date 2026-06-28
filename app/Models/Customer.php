<?php
// app/Models/Customer.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'lat',
        'lng',
        'odp_id',
        'package_id',
        'status',
        'is_isolated',
        'package',
        'phone_number',
        'ip_address',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'odp_id' => 'integer',
        'package_id' => 'integer',
    ];

    public function odp()
    {
        return $this->belongsTo(ODP::class, 'odp_id');
    }

    public function package()
    {
        return $this->belongsTo(Package::class, 'package_id');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeSuspended($query)
    {
        return $query->where('status', 'suspended');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }
}