<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('three_sixty_evaluations', function (Blueprint $table) {
            $table->json('core_value_comments')->nullable()->after('feedback_summary');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('three_sixty_evaluations', function (Blueprint $table) {
            $table->dropColumn('core_value_comments');
        });
    }
};
