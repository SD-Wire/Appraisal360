<?php

namespace App\Actions\Teams;

use App\Enums\TeamRole;
use App\Models\Department;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CreateTeam
{
    /**
     * Create a new team, create initial departments (for HQ), and handle membership.
     * Super Admins / org team creators are not automatically added as members to prevent
     * appraisal contamination.
     *
     * @param array<int, array{name: string, code?: string|null}> $departments
     */
    public function handle(
        User $user,
        string $name,
        string $type = 'branch',
        ?int $regionId = null,
        array $departments = [],
        bool $isPersonal = false
    ): Team {
        return DB::transaction(function () use ($user, $name, $type, $regionId, $departments, $isPersonal) {
            $team = Team::create([
                'name' => $name,
                'slug' => Team::generateUniqueTeamSlug($name),
                'type' => $type,
                'region_id' => in_array($type, ['branch', 'region']) ? $regionId : null,
                'user_id' => $user->id,
                'is_personal' => $isPersonal,
            ]);

            // If HQ, create initial departments
            if ($type === 'hq' && !empty($departments)) {
                $usedCodes = [];
                foreach ($departments as $dept) {
                    $deptName = is_array($dept) ? ($dept['name'] ?? '') : (string) $dept;
                    if (empty(trim($deptName))) {
                        continue;
                    }

                    $rawCode = is_array($dept) && !empty($dept['code'])
                        ? $dept['code']
                        : strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $deptName), 0, 8));

                    if (empty($rawCode)) {
                        $rawCode = 'DEPT';
                    }

                    $code = $rawCode;
                    $counter = 1;
                    while (in_array($code, $usedCodes) || Department::where('team_id', $team->id)->where('code', $code)->exists()) {
                        $code = substr($rawCode, 0, 5) . $counter;
                        $counter++;
                    }
                    $usedCodes[] = $code;

                    Department::create([
                        'team_id' => $team->id,
                        'name' => trim($deptName),
                        'code' => $code,
                    ]);
                }
            }

            // Only add membership if this is a personal workspace or user is not a Super Admin creating a personal team
            if ($isPersonal && !$user->isSuperAdmin()) {
                $team->memberships()->create([
                    'user_id' => $user->id,
                    'role' => TeamRole::Owner,
                ]);

                $user->switchTeam($team);
            }

            return $team;
        });
    }
}
