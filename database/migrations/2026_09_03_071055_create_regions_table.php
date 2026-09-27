<?php
// database/migrations/2026_09_03_000006_create_regions_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 20)->unique();
            $table->timestamps();
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->foreignId('region_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::create('region_hrbp', function (Blueprint $table) {
            $table->foreignId('region_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['region_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('region_hrbp');
        Schema::table('teams', fn(Blueprint $table) => $table->dropConstrainedForeignId('region_id'));
        Schema::dropIfExists('regions');
    }
};
