<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, number, boolean, json
            $table->string('group')->default('general');
            $table->string('label')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed initial performance weights default: 70% KPI, 30% 360°
        DB::table('app_settings')->insert([
            [
                'key' => 'kpi_weight',
                'value' => '70',
                'type' => 'number',
                'group' => 'performance',
                'label' => 'KPI Appraisal Weight (%)',
                'description' => 'Default percentage contribution of KPI evaluations toward combined performance score.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'three_sixty_weight',
                'value' => '30',
                'type' => 'number',
                'group' => 'performance',
                'label' => '360° Appraisal Weight (%)',
                'description' => 'Default percentage contribution of 360° behavioral evaluations toward combined performance score.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_settings');
    }
};
