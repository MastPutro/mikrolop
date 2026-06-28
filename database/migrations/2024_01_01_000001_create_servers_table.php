<?php
// database/migrations/2024_01_01_000001_create_servers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('lat', 10, 8);
            $table->decimal('lng', 11, 8);
            $table->enum('status', ['online', 'offline', 'warning'])->default('online');
            $table->string('ip')->unique();
            $table->integer('capacity')->default(1000);
            $table->integer('used')->default(0);
            $table->timestamps();
            
            $table->index(['lat', 'lng']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servers');
    }
};