<?php

namespace App\Services;

use App\Models\Membership;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\ThreeSixtyRelationshipRule;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ThreeSixtyAssignmentService
{
    /**
     * Generate all evaluator→evaluatee pairs for a given cycle
     * based on its active relationship rules.
     *
     * Returns a summary array: ['created' => int, 'skipped' => int, 'rules_processed' => int]
     */
    public function generateForCycle(ThreeSixtyCycle $cycle): array
    {
        $cycle->load('rules');
        $created  = 0;
        $skipped  = 0;
        $rulesProcessed = 0;

        DB::transaction(function () use ($cycle, &$created, &$skipped, &$rulesProcessed) {
            foreach ($cycle->rules->where('is_active', true) as $rule) {
                $pairs = $this->resolvePairs($rule);
                foreach ($pairs as [$evaluatorId, $evaluateeId, $relationshipType]) {
                    if ($evaluatorId === $evaluateeId) {
                        $skipped++;
                        continue;
                    }

                    $exists = ThreeSixtyEvaluation::where('three_sixty_cycle_id', $cycle->id)
                        ->where('evaluator_id', $evaluatorId)
                        ->where('evaluatee_id', $evaluateeId)
                        ->exists();

                    if ($exists) {
                        $skipped++;
                        continue;
                    }

                    ThreeSixtyEvaluation::create([
                        'three_sixty_cycle_id' => $cycle->id,
                        'evaluator_id'         => $evaluatorId,
                        'evaluatee_id'         => $evaluateeId,
                        'relationship_type'    => $relationshipType,
                        'status'               => 'pending',
                    ]);
                    $created++;
                }
                $rulesProcessed++;
            }
        });

        return [
            'created'         => $created,
            'skipped'         => $skipped,
            'rules_processed' => $rulesProcessed,
        ];
    }

    /**
     * Resolve individual [evaluatorId, evaluateeId, relationshipType] triples for a rule.
     */
    private function resolvePairs(ThreeSixtyRelationshipRule $rule): array
    {
        return match ($rule->rule_type) {
            'branch_internal'        => $this->branchInternal($rule),
            'dept_internal'          => $this->deptInternal($rule),
            'cross_dept'             => $this->crossDept($rule),
            'bm_peers'               => $this->bmPeers($rule),
            'hod_and_bm'             => $this->hodAndBm($rule),
            'bm_to_dept_staff'       => $this->bmToDeptStaff($rule),
            'rm_bm_region'           => $this->rmBmRegion($rule),
            'rstl_bm_region'         => $this->rstlBmRegion($rule),
            'regional_and_hod'       => $this->regionalAndHod($rule),
            'regional_to_dept_staff' => $this->regionalToDeptStaff($rule),
            'individual_staff'       => $this->individualStaff($rule),
            default                  => [],
        };
    }

    // ──────────────────────────────────────────────────
    // Rule Handlers
    // ──────────────────────────────────────────────────

    /**
     * Branch Internal: BM ↔ every branch staff member, plus staff peer pairs.
     * source_ids = array of team IDs (branches)
     */
    private function branchInternal(ThreeSixtyRelationshipRule $rule): array
    {
        $teamIds = $rule->source_ids ?? [];
        $pairs   = [];

        foreach ($teamIds as $teamId) {
            $members = $this->usersInTeam((int) $teamId);
            $bms     = $members->filter(fn($u) => $this->hasRoleInTeam($u, 'Branch Manager', $teamId));
            $staff   = $members->filter(fn($u) => !$this->hasRoleInTeam($u, 'Branch Manager', $teamId));

            // BM ↔ each staff
            foreach ($bms as $bm) {
                foreach ($staff as $s) {
                    if ($this->shouldInclude($rule->direction, 'source_evaluates_target')) {
                        $pairs[] = [$bm->id, $s->id, 'supervisor_to_subordinate'];
                    }
                    if ($this->shouldInclude($rule->direction, 'target_evaluates_source')) {
                        $pairs[] = [$s->id, $bm->id, 'subordinate_to_supervisor'];
                    }
                    if ($rule->direction === 'mutual') {
                        $pairs[] = [$bm->id, $s->id, 'supervisor_to_subordinate'];
                        $pairs[] = [$s->id, $bm->id, 'subordinate_to_supervisor'];
                    }
                }
            }

            // Staff peer pairs
            if ($rule->include_peers) {
                $staffList = $staff->values();
                for ($i = 0; $i < $staffList->count(); $i++) {
                    for ($j = $i + 1; $j < $staffList->count(); $j++) {
                        $pairs[] = [$staffList[$i]->id, $staffList[$j]->id, 'branch_peer'];
                        $pairs[] = [$staffList[$j]->id, $staffList[$i]->id, 'branch_peer'];
                    }
                }
            }
        }

        return $pairs;
    }

    /**
     * Department Internal: HOD ↔ dept staff, plus dept peer pairs.
     * source_ids = array of department IDs
     */
    private function deptInternal(ThreeSixtyRelationshipRule $rule): array
    {
        $deptIds = $rule->source_ids ?? [];
        $pairs   = [];

        foreach ($deptIds as $deptId) {
            $members = $this->usersInDepartment((int) $deptId);
            $hods    = $members->filter(fn($u) => $u->hasRole('HOD'));
            $staff   = $members->filter(fn($u) => !$u->hasRole('HOD'));

            foreach ($hods as $hod) {
                foreach ($staff as $s) {
                    if ($this->shouldInclude($rule->direction, 'source_evaluates_target')) {
                        $pairs[] = [$hod->id, $s->id, 'supervisor_to_subordinate'];
                    }
                    if ($this->shouldInclude($rule->direction, 'target_evaluates_source')) {
                        $pairs[] = [$s->id, $hod->id, 'subordinate_to_supervisor'];
                    }
                    if ($rule->direction === 'mutual') {
                        $pairs[] = [$hod->id, $s->id, 'supervisor_to_subordinate'];
                        $pairs[] = [$s->id, $hod->id, 'subordinate_to_supervisor'];
                    }
                }
            }

            if ($rule->include_peers) {
                $staffList = $staff->values();
                for ($i = 0; $i < $staffList->count(); $i++) {
                    for ($j = $i + 1; $j < $staffList->count(); $j++) {
                        $pairs[] = [$staffList[$i]->id, $staffList[$j]->id, 'department_peer'];
                        $pairs[] = [$staffList[$j]->id, $staffList[$i]->id, 'department_peer'];
                    }
                }
            }
        }

        return $pairs;
    }

    /**
     * Cross Department: all users in source_ids depts evaluate all users in target_ids depts (mutual or one-way).
     */
    private function crossDept(ThreeSixtyRelationshipRule $rule): array
    {
        $sourceUsers = collect($rule->source_ids ?? [])->flatMap(fn($id) => $this->usersInDepartment((int) $id))->unique('id');
        $targetUsers = collect($rule->target_ids ?? [])->flatMap(fn($id) => $this->usersInDepartment((int) $id))->unique('id');
        $pairs = [];

        if ($rule->direction === 'mutual' || $rule->direction === 'source_evaluates_target') {
            foreach ($sourceUsers as $s) {
                foreach ($targetUsers as $t) {
                    if ($s->id !== $t->id) {
                        $pairs[] = [$s->id, $t->id, 'cross_department'];
                    }
                }
            }
        }

        if ($rule->direction === 'mutual' || $rule->direction === 'target_evaluates_source') {
            foreach ($targetUsers as $t) {
                foreach ($sourceUsers as $s) {
                    if ($t->id !== $s->id) {
                        $pairs[] = [$t->id, $s->id, 'cross_department'];
                    }
                }
            }
        }

        return $pairs;
    }

    /**
     * BM Peers: Branch Managers across source_ids branches evaluate each other.
     */
    private function bmPeers(ThreeSixtyRelationshipRule $rule): array
    {
        $teamIds = $rule->source_ids ?? [];
        $bms = collect();

        foreach ($teamIds as $teamId) {
            $teamBms = $this->usersInTeam((int) $teamId)
                ->filter(fn($u) => $this->hasRoleInTeam($u, 'Branch Manager', $teamId));
            $bms = $bms->merge($teamBms);
        }

        $bms   = $bms->unique('id')->values();
        $pairs = [];

        for ($i = 0; $i < $bms->count(); $i++) {
            for ($j = $i + 1; $j < $bms->count(); $j++) {
                $pairs[] = [$bms[$i]->id, $bms[$j]->id, 'bm_peer'];
                $pairs[] = [$bms[$j]->id, $bms[$i]->id, 'bm_peer'];
            }
        }

        return $pairs;
    }

    /**
     * HOD and BM: HODs from source_ids depts evaluate BMs from target_ids branches (mutual or one-way).
     */
    private function hodAndBm(ThreeSixtyRelationshipRule $rule): array
    {
        $hods = collect($rule->source_ids ?? [])->flatMap(fn($id) => $this->usersInDepartment((int) $id))->filter(fn($u) => $u->hasRole('HOD'))->unique('id');
        $bms  = collect($rule->target_ids ?? [])->flatMap(fn($id) => $this->usersInTeam((int) $id)->filter(fn($u) => $this->hasRoleInTeam($u, 'Branch Manager', $id)))->unique('id');

        $pairs = [];

        if ($rule->direction === 'mutual' || $rule->direction === 'source_evaluates_target') {
            foreach ($hods as $hod) {
                foreach ($bms as $bm) {
                    $pairs[] = [$hod->id, $bm->id, 'hod_to_bm'];
                }
            }
        }

        if ($rule->direction === 'mutual' || $rule->direction === 'target_evaluates_source') {
            foreach ($bms as $bm) {
                foreach ($hods as $hod) {
                    $pairs[] = [$bm->id, $hod->id, 'bm_to_hod'];
                }
            }
        }

        return $pairs;
    }

    /**
     * BM to Dept Staff: BMs from source_ids branches evaluate dept staff from target_ids depts.
     */
    private function bmToDeptStaff(ThreeSixtyRelationshipRule $rule): array
    {
        $bms       = collect($rule->source_ids ?? [])->flatMap(fn($id) => $this->usersInTeam((int) $id)->filter(fn($u) => $this->hasRoleInTeam($u, 'Branch Manager', $id)))->unique('id');
        $deptStaff = collect($rule->target_ids ?? [])->flatMap(fn($id) => $this->usersInDepartment((int) $id))->unique('id');

        $pairs = [];

        foreach ($bms as $bm) {
            foreach ($deptStaff as $s) {
                $pairs[] = [$bm->id, $s->id, 'bm_to_support_staff'];
            }
        }

        return $pairs;
    }

    /**
     * RM and Branch Managers within their region:
     * Evaluates RMs and Branch Managers of branches in the selected regions (source_ids = array of region IDs).
     */
    private function rmBmRegion(ThreeSixtyRelationshipRule $rule): array
    {
        return $this->regionalRoleToBranches($rule, 'RM', 'rm_to_bm', 'bm_to_rm');
    }

    /**
     * RSTL and Branch Managers within their region:
     * Evaluates RSTLs and Branch Managers of branches in the selected regions (source_ids = array of region IDs).
     */
    private function rstlBmRegion(ThreeSixtyRelationshipRule $rule): array
    {
        return $this->regionalRoleToBranches($rule, 'RSTL', 'rstl_to_bm', 'bm_to_rstl');
    }

    /**
     * RM/RSTL and HODs:
     * Source: Regional leaders (RM / RSTL in source_ids regions, or all if empty).
     * Target: HODs in target_ids departments (or all if empty).
     */
    private function regionalAndHod(ThreeSixtyRelationshipRule $rule): array
    {
        $regionIds = $rule->source_ids ?? [];
        $deptIds   = $rule->target_ids ?? [];

        $regionalLeaders = $this->getRegionalLeaders($regionIds);
        
        $hods = collect($deptIds)->isEmpty()
            ? User::all()->filter(fn($u) => $u->hasRole('HOD'))
            : collect($deptIds)->flatMap(fn($id) => $this->usersInDepartment((int) $id))->filter(fn($u) => $u->hasRole('HOD'));
        $hods = $hods->unique('id');

        $pairs = [];

        if ($rule->direction === 'mutual' || $rule->direction === 'source_evaluates_target') {
            foreach ($regionalLeaders as $leader) {
                foreach ($hods as $hod) {
                    $pairs[] = [$leader->id, $hod->id, 'regional_to_hod'];
                }
            }
        }

        if ($rule->direction === 'mutual' || $rule->direction === 'target_evaluates_source') {
            foreach ($hods as $hod) {
                foreach ($regionalLeaders as $leader) {
                    $pairs[] = [$hod->id, $leader->id, 'hod_to_regional'];
                }
            }
        }

        return $pairs;
    }

    /**
     * RM/RSTL and Specific Department Support Staff (e.g. IT, HR, Credit Operations):
     * Source: Regional leaders (RM / RSTL in source_ids regions).
     * Target: Department staff in target_ids departments.
     */
    private function regionalToDeptStaff(ThreeSixtyRelationshipRule $rule): array
    {
        $regionIds = $rule->source_ids ?? [];
        $deptIds   = $rule->target_ids ?? [];

        $regionalLeaders = $this->getRegionalLeaders($regionIds);
        $deptStaff = collect($deptIds)->flatMap(fn($id) => $this->usersInDepartment((int) $id))->unique('id');

        $pairs = [];

        if ($rule->direction === 'mutual' || $rule->direction === 'source_evaluates_target') {
            foreach ($regionalLeaders as $leader) {
                foreach ($deptStaff as $staff) {
                    $pairs[] = [$leader->id, $staff->id, 'regional_to_dept_staff'];
                }
            }
        }

        if ($rule->direction === 'mutual' || $rule->direction === 'target_evaluates_source') {
            foreach ($deptStaff as $staff) {
                foreach ($regionalLeaders as $leader) {
                    $pairs[] = [$staff->id, $leader->id, 'dept_staff_to_regional'];
                }
            }
        }

        return $pairs;
    }

    /**
     * Helper to pair regional roles (RM or RSTL) with Branch Managers across region's branches.
     */
    private function regionalRoleToBranches(ThreeSixtyRelationshipRule $rule, string $roleName, string $leaderToBmType, string $bmToLeaderType): array
    {
        $regionIds = $rule->source_ids ?? [];
        $regions = empty($regionIds)
            ? \App\Models\Region::with('branches')->get()
            : \App\Models\Region::whereIn('id', $regionIds)->with('branches')->get();

        $pairs = [];

        foreach ($regions as $region) {
            // Find regional leaders for this region
            $regionalLeaders = $this->getRegionalLeadersForRegion($region->id, $roleName);

            // Find all Branch Managers for branches in this region
            $branchIds = $region->branches->pluck('id')->all();
            $bms = collect();
            foreach ($branchIds as $bId) {
                $branchBms = $this->usersInTeam((int) $bId)
                    ->filter(fn($u) => $this->hasRoleInTeam($u, 'Branch Manager', $bId) || $u->hasRole('Branch Manager'));
                $bms = $bms->merge($branchBms);
            }
            $bms = $bms->unique('id');

            foreach ($regionalLeaders as $leader) {
                foreach ($bms as $bm) {
                    if ($rule->direction === 'mutual' || $rule->direction === 'source_evaluates_target') {
                        $pairs[] = [$leader->id, $bm->id, $leaderToBmType];
                    }
                    if ($rule->direction === 'mutual' || $rule->direction === 'target_evaluates_source') {
                        $pairs[] = [$bm->id, $leader->id, $bmToLeaderType];
                    }
                }
            }
        }

        return $pairs;
    }

    private function getRegionalLeaders(array $regionIds, ?string $roleName = null): Collection
    {
        $regions = empty($regionIds) ? \App\Models\Region::all() : \App\Models\Region::whereIn('id', $regionIds)->get();
        $leaders = collect();

        foreach ($regions as $region) {
            $leaders = $leaders->merge($this->getRegionalLeadersForRegion($region->id, $roleName));
        }

        return $leaders->unique('id');
    }

    private function getRegionalLeadersForRegion(int $regionId, ?string $roleName = null): Collection
    {
        $region = \App\Models\Region::with('branches')->find($regionId);
        if (!$region) return collect();

        // 1. Check users with hrRegions or team currentTeam in this region or branch in this region
        $branchIds = $region->branches->pluck('id')->all();

        return User::all()->filter(function (User $user) use ($region, $branchIds, $roleName) {
            if ($user->isSuperAdmin()) return false;

            $hasRole = $roleName
                ? $user->hasRole($roleName)
                : ($user->hasRole('RM') || $user->hasRole('RSTL'));

            if (!$hasRole) return false;

            // Check if user's current team or any membership is in this region
            if ($user->currentTeam && in_array($user->currentTeam->id, $branchIds)) return true;
            if ($user->currentTeam && $user->currentTeam->region_id === $region->id) return true;
            if ($user->hrRegions->contains('id', $region->id)) return true;

            // If user has region role and no region assigned, include in rule if region selected
            return true;
        })->values();
    }

    /**
     * Individual Staff: One (or specific) target staff member appraised by selected individuals.
     * target_ids = array of target user IDs (e.g. the specific / new staff member)
     * source_ids = array of evaluator user IDs (selected colleagues, supervisors, peers)
     */
    private function individualStaff(ThreeSixtyRelationshipRule $rule): array
    {
        $targetUserIds = $rule->target_ids ?? [];
        $evaluatorUserIds = $rule->source_ids ?? [];

        if (empty($targetUserIds) || empty($evaluatorUserIds)) {
            return [];
        }

        $targetUsers = User::whereIn('id', $targetUserIds)->get()->keyBy('id');
        $evaluatorUsers = User::whereIn('id', $evaluatorUserIds)->get()->keyBy('id');

        $pairs = [];

        foreach ($targetUsers as $targetUser) {
            foreach ($evaluatorUsers as $evaluatorUser) {
                if ($targetUser->id === $evaluatorUser->id) {
                    continue;
                }

                $isEvaluatorSupervisor = ($targetUser->supervisor_id && $targetUser->supervisor_id === $evaluatorUser->id)
                    || $evaluatorUser->hasRole('Branch Manager')
                    || $evaluatorUser->hasRole('HOD')
                    || $evaluatorUser->hasRole('RM')
                    || $evaluatorUser->hasRole('RSTL');

                $isTargetSupervisor = ($evaluatorUser->supervisor_id && $evaluatorUser->supervisor_id === $targetUser->id)
                    || $targetUser->hasRole('Branch Manager')
                    || $targetUser->hasRole('HOD')
                    || $targetUser->hasRole('RM')
                    || $targetUser->hasRole('RSTL');

                // Evaluator evaluates Target (source_evaluates_target or mutual)
                if ($rule->direction === 'mutual' || $rule->direction === 'source_evaluates_target') {
                    $relType = $isEvaluatorSupervisor ? 'supervisor_to_subordinate' : 'colleague';
                    $pairs[] = [$evaluatorUser->id, $targetUser->id, $relType];
                }

                // Target evaluates Evaluator (target_evaluates_source or mutual)
                if ($rule->direction === 'mutual' || $rule->direction === 'target_evaluates_source') {
                    $relType = $isTargetSupervisor ? 'supervisor_to_subordinate' : ($isEvaluatorSupervisor ? 'subordinate_to_supervisor' : 'colleague');
                    $pairs[] = [$targetUser->id, $evaluatorUser->id, $relType];
                }
            }
        }

        // If include_peers is enabled and multiple staff members are being appraised, they appraise each other as peers
        if ($rule->include_peers && $targetUsers->count() > 1) {
            $targetList = $targetUsers->values();
            for ($i = 0; $i < $targetList->count(); $i++) {
                for ($j = $i + 1; $j < $targetList->count(); $j++) {
                    $pairs[] = [$targetList[$i]->id, $targetList[$j]->id, 'peer'];
                    $pairs[] = [$targetList[$j]->id, $targetList[$i]->id, 'peer'];
                }
            }
        }

        return $pairs;
    }

    // ──────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────

    private function usersInTeam(int $teamId): Collection
    {
        return User::whereHas('teamMemberships', fn($q) => $q->where('team_id', $teamId))
            ->with('teamMemberships')
            ->get()
            ->reject(fn(User $u) => $u->isSuperAdmin())
            ->values();
    }

    private function usersInDepartment(int $deptId): Collection
    {
        return User::where('department_id', $deptId)
            ->get()
            ->reject(fn(User $u) => $u->isSuperAdmin())
            ->values();
    }

    private function hasRoleInTeam(User $user, string $roleName, int $teamId): bool
    {
        return $user->teamMemberships
            ->where('team_id', $teamId)
            ->contains(fn($m) => strtolower($m->role?->value ?? $m->role ?? '') === strtolower($roleName));
    }

    private function shouldInclude(string $direction, string $check): bool
    {
        return $direction === $check;
    }
}
