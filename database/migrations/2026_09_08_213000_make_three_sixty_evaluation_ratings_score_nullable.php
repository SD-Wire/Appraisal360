<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('three_sixty_evaluation_ratings', function (Blueprint $table) {
            $table->unsignedTinyInteger('score')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('three_sixty_evaluation_ratings', function (Blueprint $table) {
            $table->unsignedTinyInteger('score')->nullable(false)->change();
        });
    }
};
