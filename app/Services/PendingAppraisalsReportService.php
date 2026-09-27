<?php

namespace App\Services;

use App\Enums\TeamRole;
use App\Models\Department;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\Region;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class PendingAppraisalsReportService
{
    /**
     * Determine user permissions and managerial scope.
     *
     * @return array{
     *   isSuperAdmin: bool,
     *   isHrbp: bool,
     *   isHod: bool,
     *   isBranchManager: bool,
     *   isAuthorized: bool,
     *   roleLabel: string,
     *   scopedDepartmentIds: int[],
     *   scopedTeamIds: int[],
     *   scopedRegionIds: int[]
     * }
     */
    public static function resolveUserScope(User $user, ?Team $currentTeam = null): array
    {
        $isSuperAdmin = (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())
            || $user->hasRole('Super Admin');

        $isHrbp = $user->hasRole('HR Business Partner')
            || (method_exists($user, 'isHrbp') && $user->isHrbp())
            || $user->can('kpi.approve-hr')
            || $user->can('kpi.view-all-branches');

        $isHod = $user->hasRole('HOD')
            || $user->can('kpi.view-department')
            || Department::where('hod_user_id', $user->id)->exists();

        $isBranchManager = $user->hasRole('Branch Manager')
            || ($currentTeam && $currentTeam->isBranch() && $user->belongsToTeam($currentTeam) && $user->teamRole($currentTeam) === TeamRole::Admin)
            || $user->can('kpi.view-branch');

        $isAuthorized = $isSuperAdmin || $isHrbp || $isHod || $isBranchManager;

        $scopedDepartmentIds = [];
        $scopedTeamIds = [];
        $scopedRegionIds = [];

        if ($isSuperAdmin) {
            $roleLabel = 'Super Administrator';
        } elseif ($isHrbp) {
            $roleLabel = 'Regional HR Business Partner';
            $scopedRegionIds = $user->hrRegions()->pluck('regions.id')->all();
            if (!empty($scopedRegionIds)) {
                $scopedTeamIds = Team::whereIn('region_id', $scopedRegionIds)->pluck('id')->all();
            }
        } elseif ($isHod) {
            $roleLabel = 'Head of Department';
            $managedDeptIds = Department::where('hod_user_id', $user->id)->pluck('id')->all();
            $userDeptId = $user->department_id ? [$user->department_id] : [];
            $scopedDepartmentIds = array_values(array_unique(array_merge($managedDeptIds, $userDeptId)));
        } elseif ($isBranchManager) {
            $roleLabel = 'Branch Manager';
            if ($currentTeam) {
                $scopedTeamIds = [$currentTeam->id];
            } elseif ($user->current_team_id) {
                $scopedTeamIds = [$user->current_team_id];
            }
        } else {
            $roleLabel = 'Staff';
        }

        return [
            'isSuperAdmin'        => $isSuperAdmin,
            'isHrbp'              => $isHrbp,
            'isHod'               => $isHod,
            'isBranchManager'     => $isBranchManager,
            'isAuthorized'        => $isAuthorized,
            'roleLabel'           => $roleLabel,
            'scopedDepartmentIds' => $scopedDepartmentIds,
            'scopedTeamIds'       => $scopedTeamIds,
            'scopedRegionIds'     => $scopedRegionIds,
        ];
    }

    /**
     * Build the query for users accessible within the viewer's managerial scope.
     */
    public static function buildScopedUsersQuery(array $scope, array $filters = []): Builder
    {
        $query = User::query()->with([
            'department:id,name,code',
            'currentTeam:id,name,slug,region_id',
            'currentTeam.region:id,name',
        ]);

        // Role-based scoping
        if (!$scope['isSuperAdmin']) {
            if ($scope['isHrbp']) {
                if (!empty($scope['scopedTeamIds'])) {
                    $query->whereIn('current_team_id', $scope['scopedTeamIds']);
                } elseif (!empty($scope['scopedRegionIds'])) {
                    $query->whereHas('currentTeam', function ($q) use ($scope) {
                        $q->whereIn('region_id', $scope['scopedRegionIds']);
                    });
                }
            } elseif ($scope['isHod']) {
                if (!empty($scope['scopedDepartmentIds'])) {
                    $query->whereIn('department_id', $scope['scopedDepartmentIds']);
                }
            } elseif ($scope['isBranchManager']) {
                if (!empty($scope['scopedTeamIds'])) {
                    $query->whereIn('current_team_id', $scope['scopedTeamIds']);
                }
            }
        }

        // Additional optional user-applied filters
        if (!empty($filters['department_id'])) {
            $query->where('department_id', (int) $filters['department_id']);
        }

        if (!empty($filters['team_id'])) {
            $query->where('current_team_id', (int) $filters['team_id']);
        }

        if (!empty($filters['region_id'])) {
            $regionId = (int) $filters['region_id'];
            $query->whereHas('currentTeam', function ($q) use ($regionId) {
                $q->where('region_id', $regionId);
            });
        }

        if (!empty($filters['search'])) {
            $term = trim($filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('employee_no', 'like', "%{$term}%")
                    ->orWhere('job_title', 'like', "%{$term}%");
            });
        }

        return $query;
    }

    /**
     * Compute assigned appraisal completion details for a specific user.
     *
     * @return array{
     *   user_id: int,
     *   name: string,
     *   employee_no: ?string,
     *   email: string,
     *   job_title: ?string,
     *   department_name: string,
     *   branch_name: string,
     *   region_name: string,
     *   three_sixty: array{
     *     assigned: int,
     *     completed: int,
     *     remaining: int,
     *     appraisees_remaining: string[],
     *     deadline: ?string,
     *     days_left: ?int,
     *     is_overdue: bool
     *   },
     *   kpi: array{
     *     assigned: int,
     *     completed: int,
     *     remaining: int,
     *     appraisees_remaining: string[],
     *     deadline: ?string,
     *     days_left: ?int,
     *     is_overdue: bool
     *   },
     *   total_assigned: int,
     *   total_completed: int,
     *   total_remaining: int,
     *   all_appraisees_remaining: string[],
     *   earliest_deadline: ?string,
     *   days_left: ?int,
     *   is_overdue: bool,
     *   status: string
     * }
     */
    public static function compileUserAppraisalData(
        User $user,
        ?ThreeSixtyCycle $threeSixtyCycle,
        ?KpiCycle $kpiCycle,
        string $appraisalType = 'all'
    ): array {
        $today = Carbon::today();

        // ── 1. 360° Appraisals Compilation ─────────────────────────────────
        $tsAssigned = 0;
        $tsCompleted = 0;
        $tsRemaining = 0;
        $tsAppraiseesRemaining = [];
        $tsDeadline = null;
        $tsDaysLeft = null;
        $tsIsOverdue = false;

        if ($threeSixtyCycle && in_array($appraisalType, ['all', '360'])) {
            $evaluations = ThreeSixtyEvaluation::query()
                ->where('three_sixty_cycle_id', $threeSixtyCycle->id)
                ->where('evaluator_id', $user->id)
                ->with(['evaluatee:id,name,job_title'])
                ->get();

            $tsAssigned = $evaluations->count();
            $tsCompleted = $evaluations->where('status', 'completed')->count();
            $incompleteEvals = $evaluations->where('status', '!=', 'completed');
            $tsRemaining = $incompleteEvals->count();

            foreach ($incompleteEvals as $ev) {
                if ($ev->evaluatee) {
                    $tsAppraiseesRemaining[] = $ev->evaluatee->name . ' (360)';
                }
            }

            if ($threeSixtyCycle->evaluation_deadline) {
                $deadlineCarbon = Carbon::parse($threeSixtyCycle->evaluation_deadline);
                $tsDeadline = $deadlineCarbon->toDateString();
                $tsDaysLeft = (int) $today->diffInDays($deadlineCarbon, false);
                $tsIsOverdue = $tsRemaining > 0 && $today->gt($deadlineCarbon);
            }
        }

        // ── 2. KPI Evaluations Compilation ─────────────────────────────────
        $kpiAssigned = 0;
        $kpiCompleted = 0;
        $kpiRemaining = 0;
        $kpiAppraiseesRemaining = [];
        $kpiDeadline = null;
        $kpiDaysLeft = null;
        $kpiIsOverdue = false;

        if ($kpiCycle && in_array($appraisalType, ['all', 'kpi'])) {
            // (a) Self-Evaluation
            $ownApprovedKpis = KpiEntry::query()
                ->where('kpi_cycle_id', $kpiCycle->id)
                ->where('user_id', $user->id)
                ->where('status', 'hr_approved')
                ->whereNotNull('evaluation_status')
                ->get();

            if ($ownApprovedKpis->isNotEmpty()) {
                $kpiAssigned += 1;
                $hasIncompleteSelf = $ownApprovedKpis->contains(
                    fn ($k) => in_array($k->evaluation_status, ['pending', 'supervisor_returned'])
                );

                if ($hasIncompleteSelf) {
                    $kpiRemaining += 1;
                    $kpiAppraiseesRemaining[] = 'Self (Self-Evaluation)';
                } else {
                    $kpiCompleted += 1;
                }
            }

            // (b) Supervisor Moderation / Review Queue
            // Subordinates waiting for this user's moderation
            $subordinatesKpis = KpiEntry::query()
                ->where('kpi_cycle_id', $kpiCycle->id)
                ->where('current_approver_id', $user->id)
                ->with(['user:id,name,job_title'])
                ->get();

            if ($subordinatesKpis->isNotEmpty()) {
                // Group by appraisee (subordinate)
                $groupedBySubordinate = $subordinatesKpis->groupBy('user_id');

                foreach ($groupedBySubordinate as $subordinateUserId => $kpis) {
                    $kpiAssigned += 1;
                    $pendingReview = $kpis->contains(fn ($k) => $k->evaluation_status === 'self_submitted');

                    if ($pendingReview) {
                        $kpiRemaining += 1;
                        $subordinateName = $kpis->first()?->user?->name ?? "User #{$subordinateUserId}";
                        $kpiAppraiseesRemaining[] = "{$subordinateName} (Subordinate KPI Review)";
                    } else {
                        $kpiCompleted += 1;
                    }
                }
            }

            $effectiveKpiDeadline = $kpiCycle->evaluation_deadline ?? $kpiCycle->submission_deadline;
            if ($effectiveKpiDeadline) {
                $kpiDeadlineCarbon = Carbon::parse($effectiveKpiDeadline);
                $kpiDeadline = $kpiDeadlineCarbon->toDateString();
                $kpiDaysLeft = (int) $today->diffInDays($kpiDeadlineCarbon, false);
                $kpiIsOverdue = $kpiRemaining > 0 && $today->gt($kpiDeadlineCarbon);
            }
        }

        // ── 3. Aggregations & Status ───────────────────────────────────────
        $totalAssigned = $tsAssigned + $kpiAssigned;
        $totalCompleted = $tsCompleted + $kpiCompleted;
        $totalRemaining = $tsRemaining + $kpiRemaining;
        $allAppraiseesRemaining = array_values(array_unique(array_merge($tsAppraiseesRemaining, $kpiAppraiseesRemaining)));

        // Determine earliest deadline among active remaining categories
        $activeDeadlines = [];
        if ($tsRemaining > 0 && $tsDeadline) {
            $activeDeadlines[] = Carbon::parse($tsDeadline);
        }
        if ($kpiRemaining > 0 && $kpiDeadline) {
            $activeDeadlines[] = Carbon::parse($kpiDeadline);
        }

        if (!empty($activeDeadlines)) {
            usort($activeDeadlines, fn ($a, $b) => $a->timestamp <=> $b->timestamp);
            $earliestDeadlineCarbon = $activeDeadlines[0];
            $earliestDeadline = $earliestDeadlineCarbon->toDateString();
            $overallDaysLeft = (int) $today->diffInDays($earliestDeadlineCarbon, false);
            $overallIsOverdue = $today->gt($earliestDeadlineCarbon);
        } else {
            $earliestDeadline = $tsDeadline ?? $kpiDeadline;
            $overallDaysLeft = $tsDaysLeft ?? $kpiDaysLeft;
            $overallIsOverdue = $tsIsOverdue || $kpiIsOverdue;
        }

        if ($totalAssigned === 0) {
            $status = 'not_assigned';
        } elseif ($totalRemaining === 0) {
            $status = 'completed';
        } elseif ($overallIsOverdue) {
            $status = 'overdue';
        } elseif ($totalCompleted > 0) {
            $status = 'in_progress';
        } else {
            $status = 'pending';
        }

        return [
            'user_id'                  => $user->id,
            'name'                     => $user->name,
            'employee_no'              => $user->employee_no,
            'email'                    => $user->email,
            'job_title'                => $user->job_title,
            'department_name'          => $user->department?->name ?? 'Head Office / Branch',
            'branch_name'              => $user->currentTeam?->name ?? 'Main Branch',
            'region_name'              => $user->currentTeam?->region?->name ?? 'National / Corporate',
            'three_sixty'              => [
                'assigned'             => $tsAssigned,
                'completed'            => $tsCompleted,
                'remaining'            => $tsRemaining,
                'appraisees_remaining' => $tsAppraiseesRemaining,
                'deadline'             => $tsDeadline,
                'days_left'            => $tsDaysLeft,
                'is_overdue'           => $tsIsOverdue,
            ],
            'kpi'                      => [
                'assigned'             => $kpiAssigned,
                'completed'            => $kpiCompleted,
                'remaining'            => $kpiRemaining,
                'appraisees_remaining' => $kpiAppraiseesRemaining,
                'deadline'             => $kpiDeadline,
                'days_left'            => $kpiDaysLeft,
                'is_overdue'           => $kpiIsOverdue,
            ],
            'total_assigned'           => $totalAssigned,
            'total_completed'          => $totalCompleted,
            'total_remaining'          => $totalRemaining,
            'all_appraisees_remaining' => $allAppraiseesRemaining,
            'earliest_deadline'        => $earliestDeadline,
            'days_left'                => $overallDaysLeft,
            'is_overdue'               => $overallIsOverdue,
            'status'                   => $status,
        ];
    }

    /**
     * Get paginated report data with statistics and filter options.
     */
    public static function getReportData(User $currentUser, ?Team $currentTeam, array $filters = []): array
    {
        $scope = self::resolveUserScope($currentUser, $currentTeam);

        abort_unless($scope['isAuthorized'], 403, 'This report is restricted to HODs, Branch Managers, HRBPs, and Super Admin.');

        // Cycles
        $threeSixtyCycles = ThreeSixtyCycle::whereIn('status', ['open', 'closed'])
            ->orderByDesc('period_start')
            ->get(['id', 'name', 'status', 'evaluation_deadline', 'period_start', 'period_end']);

        $kpiCycles = KpiCycle::whereIn('status', ['open', 'closed'])
            ->orderByDesc('period_start')
            ->get(['id', 'name', 'status', 'phase', 'evaluation_deadline', 'submission_deadline', 'period_start', 'period_end']);

        $selected360CycleId = !empty($filters['three_sixty_cycle_id'])
            ? (int) $filters['three_sixty_cycle_id']
            : ($threeSixtyCycles->firstWhere('status', 'open')?->id ?? $threeSixtyCycles->first()?->id);

        $selectedKpiCycleId = !empty($filters['kpi_cycle_id'])
            ? (int) $filters['kpi_cycle_id']
            : ($kpiCycles->firstWhere('status', 'open')?->id ?? $kpiCycles->first()?->id);

        $selected360Cycle = $threeSixtyCycles->firstWhere('id', $selected360CycleId);
        $selectedKpiCycle = $kpiCycles->firstWhere('id', $selectedKpiCycleId);

        $appraisalType = $filters['appraisal_type'] ?? 'all';
        $statusFilter = $filters['status'] ?? 'incomplete'; // Default to users that have NOT completed
        $perPage = max(5, min(100, (int) ($filters['per_page'] ?? 15)));
        $page = max(1, (int) ($filters['page'] ?? 1));

        // Get scoped users
        $usersQuery = self::buildScopedUsersQuery($scope, $filters);
        $allUsers = $usersQuery->orderBy('name')->get();

        // Compile metrics for all scoped users
        $compiledUsers = $allUsers->map(function ($u) use ($selected360Cycle, $selectedKpiCycle, $appraisalType) {
            return self::compileUserAppraisalData($u, $selected360Cycle, $selectedKpiCycle, $appraisalType);
        });

        // Filter out users who have 0 total assigned appraisals
        $assignedUsers = $compiledUsers->filter(fn ($item) => $item['total_assigned'] > 0)->values();

        // Apply Status Filter
        $filteredUsers = $assignedUsers->filter(function ($item) use ($statusFilter) {
            if ($statusFilter === 'incomplete') {
                return $item['total_remaining'] > 0;
            }
            if ($statusFilter === 'completed') {
                return $item['total_remaining'] === 0 && $item['total_assigned'] > 0;
            }
            if ($statusFilter === 'overdue') {
                return $item['is_overdue'] === true;
            }
            if ($statusFilter === 'pending') {
                return $item['status'] === 'pending';
            }
            if ($statusFilter === 'in_progress') {
                return $item['status'] === 'in_progress';
            }
            return true; // 'all'
        })->values();

        // Summary Stats
        $stats = [
            'total_evaluators'           => $assignedUsers->count(),
            'total_incomplete_evaluators'=> $assignedUsers->where('total_remaining', '>', 0)->count(),
            'total_completed_evaluators' => $assignedUsers->where('total_remaining', 0)->count(),
            'total_360_remaining'        => $assignedUsers->sum(fn ($i) => $i['three_sixty']['remaining']),
            'total_kpi_remaining'        => $assignedUsers->sum(fn ($i) => $i['kpi']['remaining']),
            'total_overdue_evaluators'   => $assignedUsers->where('is_overdue', true)->count(),
        ];

        // Manual Pagination
        $total = $filteredUsers->count();
        $slice = $filteredUsers->slice(($page - 1) * $perPage, $perPage)->values();

        $paginator = new LengthAwarePaginator(
            $slice,
            $total,
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()]
        );

        // Filter Options for Dropdowns
        $departments = Department::orderBy('name')->get(['id', 'name', 'code']);
        $teams = Team::where('is_personal', false)->orderBy('name')->get(['id', 'name', 'slug', 'region_id']);
        $regions = Region::orderBy('name')->get(['id', 'name', 'code']);

        return [
            'scope'               => $scope,
            'stats'               => $stats,
            'users'               => $paginator,
            'threeSixtyCycles'    => $threeSixtyCycles,
            'kpiCycles'           => $kpiCycles,
            'selected360Cycle'    => $selected360Cycle,
            'selectedKpiCycle'    => $selectedKpiCycle,
            'departments'         => $departments,
            'teams'               => $teams,
            'regions'             => $regions,
            'filters'             => [
                'three_sixty_cycle_id' => $selected360CycleId,
                'kpi_cycle_id'         => $selectedKpiCycleId,
                'appraisal_type'       => $appraisalType,
                'status'               => $statusFilter,
                'department_id'        => !empty($filters['department_id']) ? (int) $filters['department_id'] : null,
                'team_id'              => !empty($filters['team_id']) ? (int) $filters['team_id'] : null,
                'region_id'            => !empty($filters['region_id']) ? (int) $filters['region_id'] : null,
                'search'               => $filters['search'] ?? '',
                'per_page'             => $perPage,
                'page'                 => $page,
            ],
        ];
    }

    /**
     * Gather users eligible for automated reminder notifications.
     *
     * Rule:
     * "if user has any remaining; an automated email sent daily to notify untill the submission dateline is reached then messages stops."
     *
     * @return Collection<int, array{user: User, data: array}>
     */
    public static function getEligibleReminderRecipients(?int $targetUserId = null, ?User $scopeUser = null): Collection
    {
        $today = Carbon::today();

        $threeSixtyCycle = ThreeSixtyCycle::where('status', 'open')->latest('period_start')->first();
        $kpiCycle = KpiCycle::where('status', 'open')->latest('period_start')->first();

        if (!$threeSixtyCycle && !$kpiCycle) {
            return collect();
        }

        $query = User::query()->with([
            'department:id,name',
            'currentTeam:id,name,slug',
        ]);

        if ($targetUserId) {
            $query->where('id', $targetUserId);
        }

        // If scoped by manager
        if ($scopeUser && !($scopeUser->isSuperAdmin() || $scopeUser->hasRole('Super Admin'))) {
            $scope = self::resolveUserScope($scopeUser);
            if ($scope['isHrbp'] && !empty($scope['scopedTeamIds'])) {
                $query->whereIn('current_team_id', $scope['scopedTeamIds']);
            } elseif ($scope['isHod'] && !empty($scope['scopedDepartmentIds'])) {
                $query->whereIn('department_id', $scope['scopedDepartmentIds']);
            } elseif ($scope['isBranchManager'] && !empty($scope['scopedTeamIds'])) {
                $query->whereIn('current_team_id', $scope['scopedTeamIds']);
            }
        }

        $users = $query->get();
        $eligible = collect();

        foreach ($users as $user) {
            $data = self::compileUserAppraisalData($user, $threeSixtyCycle, $kpiCycle, 'all');

            // Must have remaining appraisals
            if ($data['total_remaining'] <= 0) {
                continue;
            }

            // CRITICAL RULE: "untill the submission dateline is reached then messages stops"
            // Filter active categories where the deadline has NOT passed:
            $active360Remaining = $data['three_sixty']['remaining'] > 0;
            if ($threeSixtyCycle && $threeSixtyCycle->evaluation_deadline) {
                $tsDeadline = Carbon::parse($threeSixtyCycle->evaluation_deadline)->endOfDay();
                if ($today->gt($tsDeadline)) {
                    // Deadline passed: stop 360 reminders
                    $active360Remaining = false;
                }
            }

            $activeKpiRemaining = $data['kpi']['remaining'] > 0;
            $effectiveKpiDeadline = $kpiCycle?->evaluation_deadline ?? $kpiCycle?->submission_deadline;
            if ($effectiveKpiDeadline) {
                $kpiDeadline = Carbon::parse($effectiveKpiDeadline)->endOfDay();
                if ($today->gt($kpiDeadline)) {
                    // Deadline passed: stop KPI reminders
                    $activeKpiRemaining = false;
                }
            }

            // If all categories have expired deadlines, stop sending
            if (!$active360Remaining && !$activeKpiRemaining) {
                continue;
            }

            $eligible->push([
                'user' => $user,
                'data' => $data,
                'active_360' => $active360Remaining,
                'active_kpi' => $activeKpiRemaining,
            ]);
        }

        return $eligible;
    }
}
