<?php
// database/migrations/2024_01_01_000003_add_parent_id_to_o_d_p_s_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('o_d_p_s', function (Blueprint $table) {
            // Make server_id nullable since child ODPs won't have direct server_id
            $table->foreignId('server_id')->nullable()->change();
            
            // Add parent_id column for self-referencing hierarchy
            $table->foreignId('parent_id')
                ->nullable()
                ->constrained('o_d_p_s')
                ->onDelete('cascade');
            
            // Add index for parent_id for query performance
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::table('o_d_p_s', function (Blueprint $table) {
            $table->dropForeignKeyConstraints();
            $table->dropIndex(['parent_id']);
            $table->dropColumn('parent_id');
            
            // Revert server_id back to non-nullable
            $table->foreignId('server_id')->nullable(false)->change();
        });
    }
};
