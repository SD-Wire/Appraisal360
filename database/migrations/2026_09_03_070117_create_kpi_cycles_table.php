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
        Schema::create('kpi_cycles', function (Blueprint $table) {
            $table->id();
            $table->string('name');  // e.g. "FY2026 H1"
            $table->date('period_start');
            $table->date('period_end');
            $table->date('submission_deadline');
            $table->enum('status', ['draft', 'open', 'closed'])->default('draft');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_cycles');
    }
};
