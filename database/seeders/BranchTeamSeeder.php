<?php

namespace Database\Seeders;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class BranchTeamSeeder extends Seeder
{
    private PermissionRegistrar $registrar;

    /**
     * Which branch to populate, and the roster to seed into it.
     * Adjust $branchName to target any branch from OrganizationSeeder.
     */
    private string $branchName = 'Kenyatta Avenue 001 Branch';

    private array $staffRoster = [
        ['name' => 'Brian Kiprotich', 'email' => 'brian.kiprotich@progressivecredit.co.ke'],
        ['name' => 'Winnie Achieng', 'email' => 'winnie.achieng@progressivecredit.co.ke'],
        ['name' => 'Dennis Mwangi', 'email' => 'dennis.mwangi@progressivecredit.co.ke'],
        ['name' => 'Sharon Njeri', 'email' => 'sharon.njeri@progressivecredit.co.ke'],
        ['name' => 'Collins Omondi', 'email' => 'collins.omondi@progressivecredit.co.ke'],
    ];

    public function run(): void
    {
        if (!app()->environment('local')) {
            return;  // demo data only, never run in production
        }

        $this->registrar = app(PermissionRegistrar::class);

        $branch = Team::where('type', 'branch')
            ->where('name', $this->branchName)
            ->first();

        abort_unless($branch, 500, "Branch \"{$this->branchName}\" not found — run OrganizationSeeder first.");

        // --- Branch Manager, only if one doesn't already exist ----------
        $this->registrar->setPermissionsTeamId($branch->id);
        $manager = User::role('Branch Manager')
            ->whereHas('teams', fn($q) => $q->where('teams.id', $branch->id))
            ->first();

        if (!$manager) {
            $manager = $this->joinTeam(User::factory()->create([
                'name' => 'Alice Njoroge',
                'email' => 'bm.' . str($this->branchName)->slug() . '@progressivecredit.co.ke',
            ]), $branch);
            $this->registrar->setPermissionsTeamId($branch->id);
            $manager->assignRole('Branch Manager');
            $manager->update(['supervisor_id' => null]);  // set to a Regional Manager once that role/user exists
        }

        // --- Staff roster, each reporting to the Branch Manager ---------
        foreach ($this->staffRoster as $staffMember) {
            $user = User::where('email', $staffMember['email'])->first()
                ?? $this->joinTeam(User::factory()->create($staffMember), $branch);

            $this->registrar->setPermissionsTeamId($branch->id);
            $user->assignRole('Staff');
            $user->update(['supervisor_id' => $manager->id]);
        }
    }

    private function joinTeam(User $user, Team $team): User
    {
        $team->memberships()->firstOrCreate(
            ['user_id' => $user->id],
            ['role' => TeamRole::Member->value],
        );

        $user->forceFill(['current_team_id' => $team->id])->save();

        return $user;
    }
}
