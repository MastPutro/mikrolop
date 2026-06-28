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
        Schema::create('billing_policies', function (Blueprint $table) {
            $table->id();
            $table->integer('due_date')->default(20); // Day of month when bill is due
            $table->boolean('send_bill_to_whatsapp')->default(true); // Whether to send bill via WhatsApp
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('billing_policies');
    }
};
