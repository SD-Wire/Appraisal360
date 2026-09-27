<?php

namespace Database\Seeders;

use App\Enums\TeamRole;
use App\Models\Department;
use App\Models\Region;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class DemoUsersSeeder extends Seeder
{
    private PermissionRegistrar $registrar;

    public function run(): void
    {
        if (!app()->environment('local')) {
            return;  // demo data only, never run in production
        }

        $this->registrar = app(PermissionRegistrar::class);

        // --- Regional HRBP (global role, no branch/HQ membership) -------
        $hrbp = User::factory()->withoutPersonalTeam()->create([
            'name' => 'Grace Wanjiru',
            'email' => 'hrbp.nairobi@progressivecredit.co.ke',
        ]);
        $this->registrar->setPermissionsTeamId(0);
        $hrbp->assignRole('HR Business Partner');
        $hrbp->hrRegions()->attach(Region::where('code', 'NRB')->first()->id);

        // --- Branch: Manager + Staff ------------------------------------
        $branch = Team::where('type', 'branch')
            ->where('region_id', Region::where('code', 'NRB')->first()->id)
            ->first();

        $branchManager = $this->joinTeam(User::factory()->withoutPersonalTeam()->create([
            'name' => 'James Otieno',
            'email' => 'bm.nairobicbd@progressivecredit.co.ke',
        ]), $branch);
        $this->registrar->setPermissionsTeamId($branch->id);
        $branchManager->assignRole('Branch Manager');
        $branchManager->update(['supervisor_id' => null]);  // set to a Regional Manager once that role/user exists

        $staffMember = $this->joinTeam(User::factory()->withoutPersonalTeam()->create([
            'name' => 'Faith Mutua',
            'email' => 'staff.nairobicbd@progressivecredit.co.ke',
        ]), $branch);
        $this->registrar->setPermissionsTeamId($branch->id);
        $staffMember->assignRole('Staff');

        // --- HQ: HOD + Staff ---------------------------------------------
        $hq = Team::where('type', 'hq')->first();
        $ict = Department::where('team_id', $hq->id)->where('code', 'ICT')->first();

        $hod = $this->joinTeam(User::factory()->withoutPersonalTeam()->create([
            'name' => 'Peter Kamau',
            'email' => 'hod.ict@progressivecredit.co.ke',
            'department_id' => $ict->id,
        ]), $hq);
        $this->registrar->setPermissionsTeamId($hq->id);
        $hod->assignRole('HOD');
        $hod->update(['supervisor_id' => null]);  // set to whoever the ICT HOD reports to

        $ict->update(['hod_user_id' => $hod->id]);

        $hqStaff = $this->joinTeam(User::factory()->withoutPersonalTeam()->create([
            'name' => 'Susan Achieng',
            'email' => 'staff.ict@progressivecredit.co.ke',
            'department_id' => $ict->id,
        ]), $hq);
        $this->registrar->setPermissionsTeamId($hq->id);
        $hqStaff->assignRole('Staff');
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
