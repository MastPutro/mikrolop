<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NetworkTopologySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed Servers
        $servers = [
            [
                'name' => 'Core Server 1',
                'lat' => -6.2088,
                'lng' => 106.8456,
                'status' => 'online',
                'ip' => '10.0.0.1',
                'capacity' => 1000,
                'used' => 750,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Core Server 2',
                'lat' => -6.1951,
                'lng' => 106.8233,
                'status' => 'online',
                'ip' => '10.0.0.2',
                'capacity' => 1000,
                'used' => 620,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('servers')->insert($servers);

        // Seed ODPs
        $odps = [
            [
                'name' => 'ODP-JKT-001',
                'lat' => -6.2100,
                'lng' => 106.8470,
                'server_id' => 1,
                'status' => 'online',
                'ports' => 16,
                'used_ports' => 12,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ODP-JKT-002',
                'lat' => -6.2065,
                'lng' => 106.8440,
                'server_id' => 1,
                'status' => 'online',
                'ports' => 16,
                'used_ports' => 15,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ODP-JKT-003',
                'lat' => -6.1960,
                'lng' => 106.8250,
                'server_id' => 2,
                'status' => 'online',
                'ports' => 16,
                'used_ports' => 8,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ODP-JKT-004',
                'lat' => -6.1940,
                'lng' => 106.8210,
                'server_id' => 2,
                'status' => 'online',
                'ports' => 16,
                'used_ports' => 10,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('o_d_p_s')->insert($odps);

        // Seed Customers
        $customers = [
            [
                'name' => 'PT. Tech Indonesia',
                'lat' => -6.2105,
                'lng' => 106.8475,
                'odp_id' => 1,
                'status' => 'active',
                'package' => 'Business',
                'speed' => '100 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:01',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Warung Kopi Digital',
                'lat' => -6.2110,
                'lng' => 106.8480,
                'odp_id' => 1,
                'status' => 'active',
                'package' => 'Premium',
                'speed' => '50 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:02',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Home - Budi Santoso',
                'lat' => -6.2095,
                'lng' => 106.8465,
                'odp_id' => 1,
                'status' => 'active',
                'package' => 'Home',
                'speed' => '30 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:03',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Kantor Startup XYZ',
                'lat' => -6.2070,
                'lng' => 106.8445,
                'odp_id' => 2,
                'status' => 'active',
                'package' => 'Business',
                'speed' => '200 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:04',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Kost Mahasiswa',
                'lat' => -6.2060,
                'lng' => 106.8435,
                'odp_id' => 2,
                'status' => 'active',
                'package' => 'Home',
                'speed' => '20 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:05',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Cafe & Coworking',
                'lat' => -6.1965,
                'lng' => 106.8255,
                'odp_id' => 3,
                'status' => 'active',
                'package' => 'Premium',
                'speed' => '100 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:06',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Rumah Sakit Bersama',
                'lat' => -6.1955,
                'lng' => 106.8245,
                'odp_id' => 3,
                'status' => 'active',
                'package' => 'Enterprise',
                'speed' => '500 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:07',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Home - Ani Wijaya',
                'lat' => -6.1945,
                'lng' => 106.8215,
                'odp_id' => 4,
                'status' => 'suspended',
                'package' => 'Home',
                'speed' => '30 Mbps',
                'router_mac' => 'AA:BB:CC:DD:EE:08',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('customers')->insert($customers);
    }
}