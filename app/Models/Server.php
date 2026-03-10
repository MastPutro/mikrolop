<?php
// app/Models/Server.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Server extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'lat',
        'lng',
        'status',
        'ip',
        'capacity',
        'used',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'capacity' => 'integer',
        'used' => 'integer',
    ];

    public function odps()
    {
        return $this->hasMany(ODP::class);
    }

    public function getUsagePercentageAttribute()
    {
        return $this->capacity > 0 ? ($this->used / $this->capacity) * 100 : 0;
    }
}