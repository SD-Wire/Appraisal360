<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('kpi_cycles', function (Blueprint $table) {
            $table->enum('phase', ['goal_setting', 'evaluation'])->default('goal_setting')->after('status');
            $table->date('evaluation_deadline')->nullable()->after('submission_deadline');
        });

        Schema::table('kpi_entries', function (Blueprint $table) {
            $table->text('self_comment')->nullable()->after('supervisor_rating');
            $table->text('supervisor_comment')->nullable()->after('self_comment');
            $table->enum('evaluation_status', [
                'pending',
                'self_submitted',
                'supervisor_returned',
                'completed',
            ])->nullable()->after('supervisor_comment');
            $table->timestamp('evaluation_submitted_at')->nullable()->after('evaluation_status');
        });
    }

    public function down(): void
    {
        Schema::table('kpi_entries', function (Blueprint $table) {
            $table->dropColumn([
                'self_comment',
                'supervisor_comment',
                'evaluation_status',
                'evaluation_submitted_at',
            ]);
        });

        Schema::table('kpi_cycles', function (Blueprint $table) {
            $table->dropColumn(['phase', 'evaluation_deadline']);
        });
    }
};
