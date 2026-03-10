<?php
// app/Models/ODP.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ODP extends Model
{
    use HasFactory;

    protected $table = 'o_d_p_s';

    protected $fillable = [
        'name',
        'lat',
        'lng',
        'server_id',
        'status',
        'ports',
        'used_ports',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'server_id' => 'integer',
        'ports' => 'integer',
        'used_ports' => 'integer',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'odp_id');
    }

    public function getPortUsagePercentageAttribute()
    {
        return $this->ports > 0 ? ($this->used_ports / $this->ports) * 100 : 0;
    }

    public function getAvailablePortsAttribute()
    {
        return $this->ports - $this->used_ports;
    }
}