<?php
// database/migrations/2024_01_01_000003_create_customers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('lat', 10, 8);
            $table->decimal('lng', 11, 8);
            $table->foreignId('odp_id')->constrained('o_d_p_s')->onDelete('cascade');
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->enum('used', ['yes', 'no'])->default('yes');
            // $table->foreignId('package_id')->constrained('packages')->onDelete('cascade');
            $table->string('phone_number')->nullable();
            $table->string('ip_address')->unique();
            $table->timestamps();
            
            $table->index(['lat', 'lng']);
            $table->index('odp_id');
            $table->index('status');
            $table->index('used');
            $table->index('ip_address');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};