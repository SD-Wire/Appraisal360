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
        // 1. 360 Appraisal Cycles / Periods
        Schema::create('three_sixty_cycles', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. "FY2026 H1 360° Core Values Appraisal"
            $table->foreignId('kpi_cycle_id')->nullable()->constrained('kpi_cycles')->nullOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->date('evaluation_deadline');
            $table->enum('status', ['draft', 'open', 'closed'])->default('draft');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 2. 360 Relationship Rules (Branch, Dept, Cross-Dept, BM peers, HOD & BM, etc.)
        Schema::create('three_sixty_relationship_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('three_sixty_cycle_id')->constrained('three_sixty_cycles')->cascadeOnDelete();
            $table->string('name'); // e.g. "Branch Internal Appraisal", "IT & HR Cross Appraisal"
            $table->enum('rule_type', [
                'branch_internal',       // Branch Manager & Branch Staff + branch peers
                'dept_internal',         // HOD & Dept Staff + dept peers
                'cross_dept',            // Specified HQ departments evaluating each other
                'bm_peers',              // Branch Managers appraise peer Branch Managers
                'hod_and_bm',            // HODs and Branch Managers appraise each other
                'bm_to_dept_staff',      // Branch Managers evaluate staff of a specific HQ dept (e.g. IT/HR support)
            ]);
            $table->json('source_ids')->nullable(); // e.g. team_ids or department_ids
            $table->json('target_ids')->nullable(); // e.g. team_ids or department_ids
            $table->enum('direction', ['mutual', 'source_evaluates_target', 'target_evaluates_source'])->default('mutual');
            $table->boolean('include_peers')->default(true); // whether staff inside the same group also evaluate peers
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. 360 Evaluations (Individual Evaluator -> Evaluatee assignment instances)
        Schema::create('three_sixty_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('three_sixty_cycle_id')->constrained('three_sixty_cycles')->cascadeOnDelete();
            $table->foreignId('evaluator_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('evaluatee_id')->constrained('users')->cascadeOnDelete();
            $table->enum('relationship_type', [
                'supervisor_to_subordinate',
                'subordinate_to_supervisor',
                'branch_peer',
                'department_peer',
                'cross_department',
                'bm_peer',
                'hod_to_bm',
                'bm_to_hod',
                'bm_to_support_staff',
            ])->default('branch_peer');
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->decimal('score', 4, 2)->nullable(); // Calculated average 1-5 score across core values
            $table->text('feedback_summary')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['three_sixty_cycle_id', 'evaluator_id', 'evaluatee_id'], 'unique_evaluator_evaluatee_cycle');
            $table->index(['three_sixty_cycle_id', 'status']);
            $table->index(['evaluator_id', 'status']);
            $table->index(['evaluatee_id', 'status']);
        });

        // 4. Detailed ratings per question in an evaluation
        Schema::create('three_sixty_evaluation_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('three_sixty_evaluation_id')->constrained('three_sixty_evaluations')->cascadeOnDelete();
            $table->foreignId('core_value_id')->constrained('core_values')->cascadeOnDelete();
            $table->foreignId('core_value_question_id')->constrained('core_value_questions')->cascadeOnDelete();
            $table->unsignedTinyInteger('score'); // 1 to 5
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['three_sixty_evaluation_id', 'core_value_question_id'], 'unique_evaluation_question');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('three_sixty_evaluation_ratings');
        Schema::dropIfExists('three_sixty_evaluations');
        Schema::dropIfExists('three_sixty_relationship_rules');
        Schema::dropIfExists('three_sixty_cycles');
    }
};
