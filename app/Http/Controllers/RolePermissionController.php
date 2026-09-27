<?php

namespace App\Http\Controllers;

use App\Support\PermissionsTeam;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionController extends Controller
{
    public function index(Request $request): Response
    {
        $teamKey = $this->teamForeignKey();
        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $allPermissions = Permission::orderBy('name')->pluck('name');

        $roleRows = Role::where('guard_name', 'web')->get(['id', 'name', $teamKey]);

        $globalRoleNames = $roleRows->where($teamKey, PermissionsTeam::GLOBAL)->pluck('name')->unique()->values();
        $teamScopedRoleNames = $roleRows->where($teamKey, '!=', PermissionsTeam::GLOBAL)->pluck('name')->unique()->values();

        $globalRoles = $globalRoleNames->map(function (string $name) use ($registrar) {
            $registrar->setPermissionsTeamId(PermissionsTeam::GLOBAL);
            $role = Role::where('name', $name)->where('guard_name', 'web')->first();

            return [
                'id' => $role->id,
                'name' => $role->name,
                'scope' => 'global',
                'permissions' => $role->permissions()->pluck('name'),
            ];
        })->values();

        $teamScopedRoles = $teamScopedRoleNames->map(function (string $name) use ($registrar, $teamKey) {
            $representative = Role::where('name', $name)
                ->where('guard_name', 'web')
                ->where($teamKey, '!=', PermissionsTeam::GLOBAL)
                ->first();

            $registrar->setPermissionsTeamId($representative->{$teamKey});

            return [
                'id' => $representative->id,
                'name' => $representative->name,
                'scope' => 'team',
                'permissions' => $representative->permissions()->pluck('name'),
            ];
        })->values();

        $registrar->setPermissionsTeamId($previousTeamId);

        return Inertia::render('roles/RolesPermissions', [
            'allPermissions' => $allPermissions,
            'globalRoles' => $globalRoles,
            'teamScopedRoles' => $teamScopedRoles,
        ]);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $teamKey = $this->teamForeignKey();

        $data = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $isGlobal = (int) $role->{$teamKey} === PermissionsTeam::GLOBAL;
        $permissions = $data['permissions'] ?? [];
        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId($role->{$teamKey});
        $role->syncPermissions($permissions);

        if (!$isGlobal) {
            $siblingRoles = Role::where('guard_name', 'web')
                ->where('name', $role->name)
                ->where($teamKey, '!=', $role->{$teamKey})
                ->where($teamKey, '!=', PermissionsTeam::GLOBAL)
                ->get();

            foreach ($siblingRoles as $sibling) {
                $registrar->setPermissionsTeamId($sibling->{$teamKey});
                $sibling->syncPermissions($permissions);
            }
        }

        $registrar->setPermissionsTeamId($previousTeamId);

        return back()->with('success', $isGlobal
            ? "Updated permissions for {$role->name}."
            : "Updated permissions for {$role->name} across all branches.");
    }

    private function teamForeignKey(): string
    {
        return config('permission.column_names.team_foreign_key', 'team_id');
    }
}
