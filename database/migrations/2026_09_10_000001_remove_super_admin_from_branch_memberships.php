<?php

use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Find all Super Admin users
        $superAdmins = User::all()->filter(fn(User $user) => $user->isSuperAdmin())->pluck('id');

        if ($superAdmins->isNotEmpty()) {
            // Find non-personal teams that are of type 'branch' or 'region'
            $branchAndRegionTeamIds = Team::whereIn('type', ['branch', 'region'])
                ->pluck('id');

            if ($branchAndRegionTeamIds->isNotEmpty()) {
                DB::table('team_members')
                    ->whereIn('user_id', $superAdmins)
                    ->whereIn('team_id', $branchAndRegionTeamIds)
                    ->delete();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Irreversible data cleanup
    }
};
