<?php
// app/Models/Package.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'speed_tx',
        'speed_rx',
        'bucket_size',
        'parent_queue',
        'priority',
        'description',
        'price',
        'is_active',
    ];

    protected $casts = [
        'speed_tx' => 'integer',
        'speed_rx' => 'integer',
        'bucket_size' => 'integer',
        'priority' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Relationship: A package has many customers
     */
    public function customers()
    {
        return $this->hasMany(Customer::class, 'package_id');
    }

    /**
     * Get the mikrotik configuration for this package
     */
    public function getMikrotikConfig()
    {
        return [
            'name' => $this->name,
            'speed_tx' => $this->speed_tx,
            'speed_rx' => $this->speed_rx,
            'bucket_size' => $this->bucket_size,
            'parent_queue' => $this->parent_queue,
            'priority' => $this->priority,
        ];
    }
}
