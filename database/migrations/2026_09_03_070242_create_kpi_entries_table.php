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
        Schema::create('kpi_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kpi_cycle_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();  // owner/staff
            $table->foreignId('team_id')->constrained();  // branch, denormalized for fast scoping
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();

            $table->string('title');
            $table->text('description');
            $table->string('target')->nullable();
            $table->string('actual_result')->nullable();
            $table->unsignedTinyInteger('weight')->default(0);  // % weight of overall appraisal
            $table->unsignedTinyInteger('self_rating')->nullable();
            $table->unsignedTinyInteger('supervisor_rating')->nullable();

            $table->enum('status', [
                'draft',
                'submitted',  // staff submitted, awaiting supervisor
                'supervisor_returned',  // sent back to staff
                'supervisor_approved',  // awaiting HR
                'hr_returned',  // HR sent back (to supervisor or staff)
                'hr_approved',  // final
            ])->default('draft');

            $table->foreignId('current_approver_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamps();

            $table->index(['team_id', 'department_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_entries');
    }
};
