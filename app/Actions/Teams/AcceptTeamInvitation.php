<?php

namespace App\Actions\Teams;

use App\Models\Department;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

class AcceptTeamInvitation
{
    public function handle(User $user, TeamInvitation $invitation): void
    {
        DB::transaction(function () use ($user, $invitation) {
            $team = $invitation->team;

            $team->memberships()->firstOrCreate(
                ['user_id' => $user->id],
                ['role' => $invitation->role],
            );

            $user->forceFill([
                'current_team_id' => $team->id,
                'department_id' => $invitation->department_id,
            ])->save();

            app(PermissionRegistrar::class)->setPermissionsTeamId($team->id);
            $user->syncRoles([$invitation->org_role]);

            if ($invitation->org_role === 'HOD' && $invitation->department_id) {
                Department::whereKey($invitation->department_id)->update(['hod_user_id' => $user->id]);
            }

            // When the team is a region team, associate the user with the region
            // so they are correctly scoped for 360° assignment (RM/RSTL regional pairs).
            if ($team->type === 'region' && $team->region_id) {
                DB::table('region_user')->insertOrIgnore([
                    'region_id' => $team->region_id,
                    'user_id'   => $user->id,
                ]);
            }

            $invitation->update(['accepted_at' => now()]);

            $user->switchTeam($team);
        });
    }
}
