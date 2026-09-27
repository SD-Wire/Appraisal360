<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use App\Support\PermissionsTeam;
use App\Support\TeamRoles;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\PermissionRegistrar;

class UserRoleController extends Controller
{
    // Extracted so index() and updateGlobalRole() can't drift apart.
    private const GLOBAL_ROLES = ['Super Admin', 'HR Business Partner'];

    public function index(Request $request): Response
    {
        $teams = Team::orderBy('name')->get(['id', 'name', 'type']);
        $team = $request->integer('team_id')
            ? $teams->firstWhere('id', $request->integer('team_id'))
            : $teams->first();

        abort_if(!$team, 404, 'No teams found.');

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $assignableRoles = collect(TeamRoles::MAP[$team->type] ?? [])->values();
        $canManageGlobalRoles = $this->canManageGlobalRoles($request);

        $users = User::where('current_team_id', $team->id)
            ->with('department:id,name')
            ->orderBy('name')
            ->get()
            ->map(function (User $user) use ($registrar, $team, $assignableRoles) {
                $registrar->setPermissionsTeamId($team->id);
                $user->unsetRelation('roles');
                $teamRole = $user
                    ->roles()
                    ->whereIn('name', $assignableRoles)
                    ->value('name');
                $user->unsetRelation('roles');

                $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
                $user->unsetRelation('roles');
                $globalRole = $user
                    ->roles()
                    ->whereIn('name', self::GLOBAL_ROLES)
                    ->value('name');
                $user->unsetRelation('roles');

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'department' => $user->department?->name,
                    'team_role' => $teamRole,
                    'global_role' => $globalRole,
                ];
            });

        $registrar->setPermissionsTeamId($previousTeamId);

        return Inertia::render('users/UserRoles', [
            'teams' => $teams,
            'selectedTeamId' => $team->id,
            'assignableRoles' => $assignableRoles,
            'users' => $users,
            'canManageGlobalRoles' => $canManageGlobalRoles,
            'assignableGlobalRoles' => $canManageGlobalRoles ? self::GLOBAL_ROLES : [],
        ]);
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        abort_if(!$user->current_team_id, 422, 'This user has no assigned branch/HQ/region team.');

        $team = Team::findOrFail($user->current_team_id);

        $assignableRoles = collect(TeamRoles::MAP[$team->type] ?? [])->values()->all();

        $data = $request->validate([
            'role' => ['required', 'string', 'in:' . implode(',', $assignableRoles)],
        ]);

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId($team->id);
        $user->unsetRelation('roles');
        $user->syncRoles([$data['role']]);
        $user->unsetRelation('roles');

        $registrar->setPermissionsTeamId($previousTeamId);

        return back()->with('success', "Updated {$user->name}'s role to {$data['role']}.");
    }

    public function updateGlobalRole(Request $request, User $user): RedirectResponse
    {
        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();
        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);

        // Only existing Super Admins can grant/revoke Super Admin or HRBP.
        $request->user()?->unsetRelation('roles');
        abort_unless($request->user()?->hasRole('Super Admin'), 403, 'Only Super Admins can assign global roles.');

        // 'none' is an explicit sentinel for "clear the global role" —
        // avoids relying on null/empty-string handling across
        // Inertia's request serialization.
        $data = $request->validate([
            'role' => ['required', 'string', 'in:none,' . implode(',', self::GLOBAL_ROLES)],
        ]);
        $roleToAssign = $data['role'] === 'none' ? null : $data['role'];

        $user->unsetRelation('roles');

        // Guardrail: don't allow the last Super Admin to be demoted,
        // which would lock everyone out of global administration.
        if ($user->hasRole('Super Admin') && $roleToAssign !== 'Super Admin') {
            $remainingSuperAdmins = User::role('Super Admin')
                ->where('id', '!=', $user->id)
                ->count();

            abort_if($remainingSuperAdmins === 0, 422, 'At least one Super Admin must remain.');
        }
        $user->unsetRelation('roles');

        $user->syncRoles($roleToAssign ? [$roleToAssign] : []);
        $user->unsetRelation('roles');

        $registrar->setPermissionsTeamId($previousTeamId);

        return back()->with('success', $roleToAssign
            ? "Updated {$user->name}'s global role to {$roleToAssign}."
            : "Removed {$user->name}'s global role.");
    }

    private function canManageGlobalRoles(Request $request): bool
    {
        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();
        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);

        $request->user()?->unsetRelation('roles');
        $can = (bool) $request->user()?->hasRole('Super Admin');
        $request->user()?->unsetRelation('roles');

        $registrar->setPermissionsTeamId($previousTeamId);

        return $can;
    }
}
