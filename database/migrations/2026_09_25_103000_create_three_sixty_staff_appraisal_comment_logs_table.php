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
        Schema::create('three_sixty_staff_appraisal_comment_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained('three_sixty_staff_appraisal_comments')->cascadeOnDelete();
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $table->string('action'); // 'submitted', 'edited_by_supervisor', 'edited_by_hrbp', 'edited_by_admin', 'draft_saved'
            $table->string('actor_role')->nullable(); // 'Staff', 'Supervisor', 'HR Business Partner', 'Super Admin'
            $table->text('details')->nullable();
            $table->json('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('three_sixty_staff_appraisal_comment_logs');
    }
};
