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
        if (!Schema::hasTable('three_sixty_relationship_rules')) {
            return;
        }

        Schema::table('three_sixty_relationship_rules', function (Blueprint $table) {
            $table->string('rule_type', 50)->change();
        });

        Schema::table('three_sixty_evaluations', function (Blueprint $table) {
            $table->string('relationship_type', 50)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op or keep as string
    }
};
