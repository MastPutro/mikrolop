<?php
// database/migrations/2024_01_01_000002_create_o_d_p_s_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('o_d_p_s', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('lat', 10, 8);
            $table->decimal('lng', 11, 8);
            $table->foreignId('server_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['online', 'offline'])->default('online');
            $table->integer('ports')->default(16);
            $table->integer('used_ports')->default(0);
            $table->timestamps();
            
            $table->index(['lat', 'lng']);
            $table->index('server_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('o_d_p_s');
    }
};