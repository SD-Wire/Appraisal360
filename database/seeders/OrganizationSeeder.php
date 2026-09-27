<?php

namespace Database\Seeders;

use App\Enums\TeamRole;
use App\Models\Department;
use App\Models\Region;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::first() ?? User::factory()->create([
            'name' => 'System Admin',
            'email' => 'admin@progressivecredit.co.ke',
        ]);

        // --- HQ -------------------------------------------------------
        $hq = Team::firstOrCreate(
            ['type' => 'hq'],
            [
                'name' => 'Head Office',
                'slug' => Str::slug('Head Office'),
                'user_id' => $owner->id,
                'is_personal' => false,
                'region_id' => Region::where('code', 'NRB')->first()?->id,
            ]
        );

        $hqDepartments = [
            ['name' => 'Information Communication Technology', 'code' => 'ICT'],
            ['name' => 'Customer Service', 'code' => 'CS'],
            ['name' => 'Marketing', 'code' => 'MKT'],
            ['name' => 'Sectors & Business Development', 'code' => 'SEC'],
            ['name' => 'Finance', 'code' => 'FIN'],
            ['name' => 'Human Resources', 'code' => 'HR'],
            ['name' => 'Audit & Risk Assurance', 'code' => 'ARA'],
            ['name' => 'Legal & Compliance', 'code' => 'LGC'],
            ['name' => 'Operations', 'code' => 'OPS'],
            ['name' => 'Quality & Collections', 'code' => 'QC'],
            ['name' => 'Telesales', 'code' => 'TLS'],
            ['name' => 'Mobile Money', 'code' => 'MMO'],
            ['name' => 'Foresight Motors', 'code' => 'FSM'],
            ['name' => 'Eteneva Properties', 'code' => 'ETP'],
            ['name' => 'Sanctum Agency', 'code' => 'SCP'],
        ];

        foreach ($hqDepartments as $dept) {
            Department::firstOrCreate(
                ['team_id' => $hq->id, 'code' => $dept['code']],
                ['name' => $dept['name']]
            );
        }

        // System Admin belongs to HQ, in the IT department
        $ict = Department::where('team_id', $hq->id)->where('code', 'ICT')->first();

        $hq->memberships()->firstOrCreate(
            ['user_id' => $owner->id],
            ['role' => TeamRole::Owner->value],
        );

        $owner->forceFill([
            'current_team_id' => $hq->id,
            'department_id' => $ict->id,
        ])->save();

        // --- 25 branches, grouped by region as provided ------------------
        $branches = [
            // Nairobi Region
            ['name' => 'Kenyatta Avenue 001 Branch', 'region' => 'NRB'],
            ['name' => 'Kenyatta Avenue 002 Branch', 'region' => 'NRB'],
            ['name' => 'Kawangware Branch', 'region' => 'NRB'],
            ['name' => 'Donholm Branch', 'region' => 'NRB'],
            ['name' => 'Thika Road Branch', 'region' => 'NRB'],
            ['name' => 'Flamingo Branch', 'region' => 'NRB'],
            // Greater Nairobi Region
            ['name' => 'Kitengela Branch', 'region' => 'GNR'],
            ['name' => 'Rongai Branch', 'region' => 'GNR'],
            ['name' => 'Machakos Branch', 'region' => 'GNR'],
            ['name' => 'Thika Branch', 'region' => 'GNR'],
            ['name' => 'Ruaka Branch', 'region' => 'GNR'],
            // Mount Kenya Region
            ['name' => 'Mwea Branch', 'region' => 'MKT'],
            ['name' => 'Embu Branch', 'region' => 'MKT'],
            ['name' => 'Meru Branch', 'region' => 'MKT'],
            ['name' => 'Nanyuki Branch', 'region' => 'MKT'],
            ['name' => 'Nyeri Branch', 'region' => 'MKT'],
            // Rift Valley Region
            ['name' => 'Narok Branch', 'region' => 'RVL'],
            ['name' => 'Nakuru Branch', 'region' => 'RVL'],
            ['name' => 'Eldoret Branch', 'region' => 'RVL'],
            // Western Region
            ['name' => 'Kisumu Branch', 'region' => 'WST'],
            ['name' => 'Kakamega Branch', 'region' => 'WST'],
            ['name' => 'Bungoma Branch', 'region' => 'WST'],
            ['name' => 'Kitale Branch', 'region' => 'WST'],
            // Coast Region
            ['name' => 'Kilifi Branch', 'region' => 'CST'],
            ['name' => 'Mombasa Branch', 'region' => 'CST'],
        ];

        foreach ($branches as $branch) {
            Team::firstOrCreate(
                ['name' => $branch['name']],
                [
                    'type' => 'branch',
                    'slug' => Str::slug($branch['name']),
                    'user_id' => $owner->id,
                    'is_personal' => false,
                    'region_id' => Region::where('code', $branch['region'])->first()?->id,
                ]
            );
        }

        // --- Super Admin -------------------------------------------------
        // Global role, not team-scoped — clear any active team context first.
        app(PermissionRegistrar::class)->setPermissionsTeamId(0);
        $owner->assignRole('Super Admin');
    }
}
