<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * MySQL requires re-listing ALL enum values when altering the column type.
     */
    public function up(): void
    {
        // Expand the enum to include 'region'.
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE teams MODIFY COLUMN `type` ENUM('hq', 'branch', 'region') NOT NULL DEFAULT 'branch'");
        }

        // Ensure the region_user pivot exists (may already have been created by
        // 2026_09_03_071055_create_regions_table.php — guard with hasTable).
        if (! Schema::hasTable('region_user')) {
            Schema::create('region_user', function (Blueprint $table) {
                $table->foreignId('region_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->primary(['region_id', 'user_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'region' from the enum (revert to original values).
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE teams MODIFY COLUMN `type` ENUM('hq', 'branch') NOT NULL DEFAULT 'branch'");
        }
    }
};
