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
        Schema::create('kpi_appraisal_comments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('kpi_cycle_id');
            $table->unsignedBigInteger('user_id');

            // Comments by Supervisor
            $table->text('supervisor_positives')->nullable();
            $table->text('supervisor_areas_to_improve')->nullable();
            $table->text('supervisor_concluding_remarks')->nullable();

            // Comments by Staff
            $table->text('staff_achievement_reasons')->nullable();
            $table->text('staff_future_commitment')->nullable();
            $table->text('staff_training_requests')->nullable();

            // Status and tracking
            $table->string('status', 20)->default('draft'); // draft, submitted
            $table->timestamp('staff_submitted_at')->nullable();
            $table->timestamp('supervisor_submitted_at')->nullable();
            $table->timestamps();

            $table->foreign('kpi_cycle_id', 'fk_kpi_ac_cycle')
                ->references('id')
                ->on('kpi_cycles')
                ->cascadeOnDelete();

            $table->foreign('user_id', 'fk_kpi_ac_user')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();

            $table->unique(['kpi_cycle_id', 'user_id'], 'uniq_kpi_ac_cycle_user');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_appraisal_comments');
    }
};
