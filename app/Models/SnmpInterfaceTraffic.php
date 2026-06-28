<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class SnmpInterfaceTraffic extends Model
{
    protected $table = 'snmp_interface_traffic';

    protected $fillable = [
        'interface_name',
        'interface_type',
        'rx_bytes',
        'tx_bytes',
        'rx_bps',
        'tx_bps',
        'rx_errors',
        'tx_errors',
        'rx_discards',
        'tx_discards',
        'polled_at',
    ];

    protected $casts = [
        'rx_bytes' => 'integer',
        'tx_bytes' => 'integer',
        'rx_bps' => 'integer',
        'tx_bps' => 'integer',
        'rx_errors' => 'integer',
        'tx_errors' => 'integer',
        'rx_discards' => 'integer',
        'tx_discards' => 'integer',
        'polled_at' => 'datetime',
    ];

    /**
     * Scope: records from the last 24 hours
     */
    public function scopeLast24Hours(Builder $query): Builder
    {
        return $query->where('polled_at', '>=', now()->subHours(24));
    }

    /**
     * Scope: filter by interface name
     */
    public function scopeForInterface(Builder $query, string $name): Builder
    {
        return $query->where('interface_name', $name);
    }

    /**
     * Scope: filter by interface type
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('interface_type', $type);
    }
}
