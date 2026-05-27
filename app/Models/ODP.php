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
        'parent_id',
        'status',
        'ports',
        'used_ports',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'server_id' => 'integer',
        'parent_id' => 'integer',
        'ports' => 'integer',
        'used_ports' => 'integer',
    ];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }

    public function parentOdp()
    {
        return $this->belongsTo(ODP::class, 'parent_id');
    }

    public function childOdps()
    {
        return $this->hasMany(ODP::class, 'parent_id');
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

    /**
     * Check if this ODP is a leaf node (no child ODPs)
     */
    public function isLeafODP(): bool
    {
        return $this->childOdps()->count() === 0;
    }

    /**
     * Get the depth of this ODP in the hierarchy (0 = root ODP connected to server)
     */
    public function getDepth(): int
    {
        if ($this->parent_id === null) {
            return 0; // Root ODP
        }

        $depth = 0;
        $current = $this;
        
        while ($current->parent_id !== null) {
            $depth++;
            $current = $current->parentOdp;
            
            if ($depth > 5) {
                break; // Safety check
            }
        }

        return $depth;
    }

    /**
     * Get the root server this ODP is connected to
     */
    public function getRootServer(): ?Server
    {
        // If this ODP has server_id, return it
        if ($this->server_id !== null) {
            return $this->server;
        }

        // Traverse up the hierarchy to find the root ODP with server_id
        $current = $this;
        while ($current->parent_id !== null) {
            $current = $current->parentOdp;
            if ($current->server_id !== null) {
                return $current->server;
            }
        }

        return null;
    }

    /**
     * Validate that adding/changing parent doesn't exceed max depth (5 levels)
     * Returns true if valid, false otherwise
     */
    public function validateDepth(ODP $newParent = null): bool
    {
        $maxDepth = 5;
        
        if ($newParent === null) {
            // This is a root ODP, depth = 0, always valid
            return true;
        }

        $newParentDepth = $newParent->getDepth();
        
        // Check if new parent depth + 1 would exceed max depth
        if ($newParentDepth + 1 >= $maxDepth) {
            return false;
        }

        return true;
    }

    /**
     * Check if this ODP can be parent of another ODP (prevents circular references)
     */
    public function canBeParentOf(ODP $potentialChild): bool
    {
        // An ODP cannot be parent of itself
        if ($this->id === $potentialChild->id) {
            return false;
        }

        // Check if potentialChild is an ancestor of this ODP
        $current = $this;
        while ($current->parent_id !== null) {
            $current = $current->parentOdp;
            if ($current->id === $potentialChild->id) {
                return false; // Circular reference detected
            }
        }

        return true;
    }

    /**
     * Get all descendants (child ODPs at all levels)
     */
    public function getAllDescendants()
    {
        $descendants = collect();
        
        foreach ($this->childOdps as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->getAllDescendants());
        }

        return $descendants;
    }
}