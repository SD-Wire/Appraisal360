<?php

namespace App\Http\Controllers\Teams;

use App\Enums\TeamRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Teams\UpdateTeamMemberRequest;
use App\Models\Department;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Spatie\Permission\PermissionRegistrar;

class TeamMemberController extends Controller
{
    public function update(UpdateTeamMemberRequest $request, Team $team, User $user): RedirectResponse
    {
        Gate::authorize('updateMember', $team);

        $orgRole = $request->validated('org_role');
        $departmentId = $request->validated('department_id');

        $newTeamRole = match ($orgRole) {
            'Branch Manager', 'HOD' => TeamRole::Admin,
            default => TeamRole::Member,
        };

        $team
            ->memberships()
            ->where('user_id', $user->id)
            ->firstOrFail()
            ->update(['role' => $newTeamRole]);

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId($team->id);
        $user->unsetRelation('roles');
        $user->syncRoles([$orgRole]);
        $user->unsetRelation('roles');

        $registrar->setPermissionsTeamId($previousTeamId);

        $user->update(['department_id' => $departmentId]);

        if ($orgRole === 'HOD' && $departmentId) {
            Department::whereKey($departmentId)->update(['hod_user_id' => $user->id]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member role updated.')]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    public function suspend(Team $team, User $user): RedirectResponse
    {
        Gate::authorize('updateMember', $team);

        abort_if($team->owner()?->is($user), 403, __('The team owner cannot be suspended.'));

        $team
            ->memberships()
            ->where('user_id', $user->id)
            ->firstOrFail()
            ->update(['suspended_at' => now()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name has been suspended.', ['name' => $user->name])]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    public function reactivate(Team $team, User $user): RedirectResponse
    {
        Gate::authorize('updateMember', $team);

        $team
            ->memberships()
            ->where('user_id', $user->id)
            ->firstOrFail()
            ->update(['suspended_at' => null]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name has been reactivated.', ['name' => $user->name])]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    public function destroy(Team $team, User $user): RedirectResponse
    {
        Gate::authorize('removeMember', $team);

        abort_if($team->owner()?->is($user), 403, __('The team owner cannot be removed.'));

        $team
            ->memberships()
            ->where('user_id', $user->id)
            ->delete();

        if ($user->isCurrentTeam($team)) {
            $user->switchTeam($user->personalTeam());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member removed.')]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }
}
