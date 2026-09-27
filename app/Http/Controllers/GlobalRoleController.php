<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\PermissionsTeam;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\PermissionRegistrar;

class GlobalRoleController extends Controller
{
    private const GLOBAL_ROLES = ['Super Admin', 'HR Business Partner'];

    public function index(Request $request): Response
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();
        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);

        $users = User::orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(function (User $user) {
                $user->unsetRelation('roles');
                $globalRoles = $user
                    ->roles()
                    ->whereIn('name', self::GLOBAL_ROLES)
                    ->pluck('name');
                $user->unsetRelation('roles');

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'global_roles' => $globalRoles,
                ];
            });

        $registrar->setPermissionsTeamId($previousTeamId);

        return Inertia::render('users/GlobalRoles', [
            'users' => $users,
            'availableRoles' => self::GLOBAL_ROLES,
        ]);
    }

    public function grant(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $data = $request->validate([
            'role' => ['required', 'string', 'in:' . implode(',', self::GLOBAL_ROLES)],
        ]);

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $user->unsetRelation('roles');
        $user->assignRole($data['role']);
        $user->unsetRelation('roles');

        $registrar->setPermissionsTeamId($previousTeamId);

        return back()->with('success', "Granted {$data['role']} to {$user->name}.");
    }

    public function revoke(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);

        $data = $request->validate([
            'role' => ['required', 'string', 'in:' . implode(',', self::GLOBAL_ROLES)],
        ]);

        // Safety rail: don't let the last Super Admin remove their own
        // (or the only remaining) Super Admin status and lock everyone
        // out of every admin-gated surface in the app.
        if ($data['role'] === 'Super Admin') {
            $registrar = app(PermissionRegistrar::class);
            $previousTeamId = $registrar->getPermissionsTeamId();
            $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);

            $superAdminCount = User::whereHas('roles', fn($q) => $q->where('name', 'Super Admin'))->count();

            $registrar->setPermissionsTeamId($previousTeamId);

            abort_if($superAdminCount <= 1, 422, 'At least one Super Admin must remain.');
        }

        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
        $user->unsetRelation('roles');
        $user->removeRole($data['role']);
        $user->unsetRelation('roles');

        $registrar->setPermissionsTeamId($previousTeamId);

        return back()->with('success', "Revoked {$data['role']} from {$user->name}.");
    }
}
