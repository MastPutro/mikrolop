<?php
// database/migrations/2024_01_01_000004_create_packages_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('packages', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->integer('speed_tx')->comment('Speed TX in Mbps');
            $table->integer('speed_rx')->comment('Speed RX in Mbps');
            $table->integer('bucket_size')->comment('Bucket size in KB');
            $table->string('parent_queue')->comment('Parent queue name in Mikrotik');
            $table->integer('priority')->default(8)->comment('Priority number (0-7)');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->default(0.00)->comment('Price in local currency');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('packages');
    }
};
