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
        Schema::dropIfExists('three_sixty_staff_appraisal_comments');

        Schema::create('three_sixty_staff_appraisal_comments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('three_sixty_cycle_id');
            $table->unsignedBigInteger('user_id');
            $table->string('status', 20)->default('submitted'); // draft, submitted
            $table->text('overall_comment')->nullable();
            $table->json('parameter_comments')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->foreign('three_sixty_cycle_id', 'fk_360_sc_cycle')
                ->references('id')
                ->on('three_sixty_cycles')
                ->cascadeOnDelete();

            $table->foreign('user_id', 'fk_360_sc_user')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();

            $table->unique(['three_sixty_cycle_id', 'user_id'], 'uniq_360_sc_cycle_user');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('three_sixty_staff_appraisal_comments');
    }
};
