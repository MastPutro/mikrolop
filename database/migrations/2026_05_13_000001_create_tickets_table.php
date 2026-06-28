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
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('ticket_number')->unique(); // Format: TKT-YYYY-MM-XXXXX
            $table->string('title');
            $table->text('description');
            $table->enum('status', ['open', 'in_progress', 'pending', 'resolved', 'closed'])->default('open');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('category', ['billing', 'technical', 'service', 'complaint', 'other'])->default('other');
            $table->foreignId('assigned_to')->nullable()->constrained('customers')->nullOnDelete();
            $table->text('resolution_notes')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->integer('response_time_minutes')->nullable(); // Response time dalam menit
            $table->integer('resolution_time_minutes')->nullable(); // Resolution time dalam menit
            $table->timestamps();
            
            // Indexes for better query performance
            $table->index('customer_id');
            $table->index('status');
            $table->index('priority');
            $table->index('assigned_to');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
