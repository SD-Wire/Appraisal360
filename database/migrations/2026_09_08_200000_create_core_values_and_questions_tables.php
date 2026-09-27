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
        Schema::create('core_values', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. Integrity, Passion, Customer Delight, Innovation, Professionalism
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('weight')->default(20); // % weight towards 360 appraisal (default 20% each for 5 values)
            $table->unsignedSmallInteger('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('core_value_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('core_value_id')->constrained('core_values')->cascadeOnDelete();
            $table->text('question');
            $table->text('description')->nullable(); // Behavioral anchors, rubric or guideline
            $table->unsignedTinyInteger('weight')->default(100); // Relative weight or %
            $table->unsignedTinyInteger('min_score')->default(1); // Min score 1
            $table->unsignedTinyInteger('max_score')->default(5); // Max score 5
            $table->unsignedSmallInteger('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('core_value_questions');
        Schema::dropIfExists('core_values');
    }
};
