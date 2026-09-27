<?php

namespace Database\Seeders;

use App\Support\PermissionsTeam;
use App\Support\TeamRoles;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'kpi.capture',
            'kpi.view-own',
            'kpi.review-supervisor',
            'kpi.approve-hr',
            'kpi.view-department',
            'kpi.view-branch',
            'kpi.view-all-branches',
            'departments.manage',
            'users.manage',
            'cycles.manage',
            'roles.manage',
            'permissions.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        // Global roles — Super Admin and HRBP act across every team,
        // so these use the reserved global sentinel context.
        app(PermissionRegistrar::class)->setPermissionsTeamId(PermissionsTeam::GLOBAL);

        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        $hrbp = Role::firstOrCreate(['name' => 'HR Business Partner', 'guard_name' => 'web']);
        $hrbp->syncPermissions([
            'kpi.approve-hr',
            'kpi.view-all-branches',
            'cycles.manage',
        ]);

        $structuralRoleNames = collect(TeamRoles::MAP)
            ->flatten()
            ->unique()
            ->values();

        foreach ($structuralRoleNames as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
        }
    }
}
