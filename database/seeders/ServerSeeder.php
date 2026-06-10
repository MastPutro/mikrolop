<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Server;
use Illuminate\Support\Facades\DB;

class ServerSeeder extends Seeder
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
                'lat' => -7.477335,
                'lng' => 112.5615948,
                'status' => 'online',
                'ip' => '192.168.1.1',
                'capacity' => 128,
                'used' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('servers')->insert($servers);
    }
}
