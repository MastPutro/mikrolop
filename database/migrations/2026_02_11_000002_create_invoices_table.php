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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->onDelete('cascade');
            $table->integer('month'); // 1-12
            $table->year('year');
            $table->bigInteger('amount'); // Amount in cents (using bigInteger to avoid float precision issues)
            $table->enum('status', ['pending', 'paid', 'overdue', 'canceled'])->default('pending');
            $table->enum('payment_method', ['transfer', 'cash', 'pending'])->nullable();
            $table->string('midtrans_transaction_id')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->timestamp('paid_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Unique invoice per customer per month
            $table->unique(['customer_id', 'month', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
