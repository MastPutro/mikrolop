<?php
// database/seeders/PackageSeeder.php

namespace Database\Seeders;

use App\Models\Package;
use Illuminate\Database\Seeder;

class PackageSeeder extends Seeder
{
    public function run(): void
    {
        $packages = [
            [
                'name' => 'Premium',
                'speed_tx' => 100,
                'speed_rx' => 100,
                'bucket_size' => 32,
                'parent_queue' => 'Broadband',
                'priority' => 7,
                'description' => 'Paket Premium dengan kecepatan 100 Mbps',
                'is_active' => true,
            ],
            [
                'name' => 'Business',
                'speed_tx' => 75,
                'speed_rx' => 75,
                'bucket_size' => 32,
                'parent_queue' => 'Broadband',
                'priority' => 6,
                'description' => 'Paket Business dengan kecepatan 75 Mbps',
                'is_active' => true,
            ],
            [
                'name' => 'Standard',
                'speed_tx' => 50,
                'speed_rx' => 50,
                'bucket_size' => 32,
                'parent_queue' => 'Broadband',
                'priority' => 5,
                'description' => 'Paket Standard dengan kecepatan 50 Mbps',
                'is_active' => true,
            ],
            [
                'name' => 'Basic',
                'speed_tx' => 25,
                'speed_rx' => 25,
                'bucket_size' => 16,
                'parent_queue' => 'Broadband',
                'priority' => 4,
                'description' => 'Paket Basic dengan kecepatan 25 Mbps',
                'is_active' => true,
            ],
            [
                'name' => 'Starter',
                'speed_tx' => 10,
                'speed_rx' => 10,
                'bucket_size' => 8,
                'parent_queue' => 'Broadband',
                'priority' => 3,
                'description' => 'Paket Starter dengan kecepatan 10 Mbps',
                'is_active' => true,
            ],
        ];

        foreach ($packages as $package) {
            Package::create($package);
        }
    }
}
