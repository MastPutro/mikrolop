<?php
// app/Services/MikrotikScriptService.php

namespace App\Services;

use App\Models\Package;
use App\Models\Customer;

class MikrotikScriptService
{
    /**
     * Generate Mikrotik queue script for a package
     * 
     * @param Package $package
     * @return string
     */
    public static function generatePackageQueueScript(Package $package): string
    {
        $speedTxbps = $package->speed_tx * 1000000; // Convert Mbps to bps
        $speedRxbps = $package->speed_rx * 1000000;

        $script = "/queue tree\n";
        $script .= "set [find name=\"{$package->name}-TX\"] ";
        $script .= "parent=\"{$package->parent_queue}\" ";
        $script .= "packet-mark=\"{$package->name}-TX\" ";
        $script .= "priority={$package->priority} ";
        $script .= "max-limit={$speedTxbps} ";
        $script .= "burst-limit={$speedTxbps} ";
        $script .= "burst-threshold={$package->bucket_size}k ";
        $script .= "burst-time=1s\n\n";

        $script .= "set [find name=\"{$package->name}-RX\"] ";
        $script .= "parent=\"{$package->parent_queue}\" ";
        $script .= "packet-mark=\"{$package->name}-RX\" ";
        $script .= "priority={$package->priority} ";
        $script .= "max-limit={$speedRxbps} ";
        $script .= "burst-limit={$speedRxbps} ";
        $script .= "burst-threshold={$package->bucket_size}k ";
        $script .= "burst-time=1s\n\n";

        return $script;
    }

    /**
     * Generate Mikrotik mangle rules for customer usage
     * 
     * @param Customer $customer
     * @param Package $package
     * @return string
     */
    public static function generateCustomerMangleScript(Customer $customer, Package $package): string
    {
        // Extract IP from somewhere - could be from ppp interface, bridging, or other method
        // This example assumes $customer has an 'ip_address' field
        $mac = $customer->router_mac; // Using MAC address as identifier
        
        $script = "/ip firewall mangle\n";
        
        // Add mangle rules for packet marking
        $script .= "add chain=forward action=mark-packet new-packet-mark=\"{$package->name}-TX\" ";
        $script .= "src-mac-address={$mac} comment=\"{$customer->name} - TX ({$package->name})\"\n";
        
        $script .= "add chain=forward action=mark-packet new-packet-mark=\"{$package->name}-RX\" ";
        $script .= "dst-mac-address={$mac} comment=\"{$customer->name} - RX ({$package->name})\"\n\n";

        return $script;
    }

    /**
     * Generate complete Mikrotik script for customer with package configuration
     * 
     * @param Customer $customer
     * @param Package $package
     * @return string
     */
    public static function generateCompleteCustomerScript(Customer $customer, Package $package): string
    {
        $script = "# Configuration for customer: {$customer->name}\n";
        $script .= "# Package: {$package->name}\n";
        $script .= "# Created: " . now()->format('Y-m-d H:i:s') . "\n\n";

        // Add mangle rules
        $script .= self::generateCustomerMangleScript($customer, $package);

        return $script;
    }

    /**
     * Generate Mikrotik script to remove customer configuration
     * 
     * @param Customer $customer
     * @param Package $package
     * @return string
     */
    public static function generateRemoveCustomerScript(Customer $customer, Package $package): string
    {
        $script = "/ip firewall mangle\n";
        $script .= "remove [find comment=\"{$customer->name} - TX ({$package->name})\"]\n";
        $script .= "remove [find comment=\"{$customer->name} - RX ({$package->name})\"]\n\n";

        return $script;
    }

    /**
     * Generate batch script for multiple customers with same package
     * 
     * @param Package $package
     * @return string
     */
    public static function generateBatchScript(Package $package): string
    {
        $customers = $package->customers()->with('odp')->get();

        $script = "# Batch configuration for package: {$package->name}\n";
        $script .= "# Total customers: {$customers->count()}\n";
        $script .= "# Generated: " . now()->format('Y-m-d H:i:s') . "\n\n";

        // Add package tree configuration first
        $script .= self::generatePackageQueueScript($package);

        // Add all customer mangle rules
        $script .= "/ip firewall mangle\n";
        foreach ($customers as $customer) {
            $script .= "add chain=forward action=mark-packet new-packet-mark=\"{$package->name}-TX\" ";
            $script .= "src-mac-address={$customer->router_mac} comment=\"{$customer->name} - TX ({$package->name})\"\n";
        }
        $script .= "\n";

        foreach ($customers as $customer) {
            $script .= "add chain=forward action=mark-packet new-packet-mark=\"{$package->name}-RX\" ";
            $script .= "dst-mac-address={$customer->router_mac} comment=\"{$customer->name} - RX ({$package->name})\"\n";
        }

        return $script;
    }

    /**
     * Store mikrotik script to database/file for audit purposes
     * 
     * @param Package $package
     * @param Customer|null $customer
     * @param string $script
     * @return bool
     */
    public static function storeScript(Package $package, ?Customer $customer = null, string $script = ''): bool
    {
        // You can implement this to store scripts in database or file system
        // For now, we'll save to a log file
        
        $type = $customer ? "customer_{$customer->id}" : "package_{$package->id}";
        $filename = storage_path("logs/mikrotik_scripts/{$type}_" . now()->timestamp . ".txt");
        
        return (bool)file_put_contents($filename, $script);
    }
}
