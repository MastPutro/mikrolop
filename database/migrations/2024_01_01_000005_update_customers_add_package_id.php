<?php
// database/migrations/2024_01_01_000005_update_customers_add_package_id.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Add package_id foreign key - nullable to support existing data
            $table->foreignId('package_id')
                ->nullable()
                ->constrained('packages')
                ->onDelete('set null')
                ->after('odp_id');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeignIdFor('packages');
            $table->dropColumn('package_id');
        });
    }
};
