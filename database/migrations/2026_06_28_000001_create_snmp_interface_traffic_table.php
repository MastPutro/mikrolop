<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('snmp_interface_traffic', function (Blueprint $table) {
            $table->id();
            $table->string('interface_name');
            $table->string('interface_type')->default('ethernet'); // ethernet or pppoe
            $table->unsignedBigInteger('rx_bytes')->default(0);
            $table->unsignedBigInteger('tx_bytes')->default(0);
            $table->unsignedBigInteger('rx_bps')->default(0);
            $table->unsignedBigInteger('tx_bps')->default(0);
            $table->unsignedBigInteger('rx_errors')->default(0);
            $table->unsignedBigInteger('tx_errors')->default(0);
            $table->unsignedBigInteger('rx_discards')->default(0);
            $table->unsignedBigInteger('tx_discards')->default(0);
            $table->timestamp('polled_at')->index();
            $table->timestamps();

            $table->index(['interface_name', 'polled_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('snmp_interface_traffic');
    }
};
