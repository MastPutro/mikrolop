<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Sentolop',
            'email' => 'sentolop@sen.com',
            // 'password' => bcrypt('1234'),
        ]);

        // $this->call([
        //     NetworkTopologySeeder::class,
        // ]);
    }
}
