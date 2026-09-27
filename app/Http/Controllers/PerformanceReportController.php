<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\CoreValueQuestion;
use App\Models\Department;
use App\Models\KpiAppraisalComment;
use App\Models\KpiCycle;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyStaffAppraisalComment;
use App\Models\ThreeSixtyStaffAppraisalCommentLog;
use App\Models\User;
use App\Services\PerformanceReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PerformanceReportController extends Controller
{
    public function index(Request $request, Team $current_team): Response
    {
        $user = $request->user();

        // All available KPI cycles (open or closed)
        $kpiCycles = KpiCycle::whereIn('status', ['open', 'closed'])
            ->orderByDesc('period_start')
            ->get(['id', 'name', 'status', 'period_start', 'period_end']);

        // All available 360 cycles (open or closed)
        $threeSixtyCycles = ThreeSixtyCycle::whereIn('status', ['open', 'closed'])
            ->orderByDesc('period_start')
            ->get(['id', 'name', 'status', 'kpi_cycle_id', 'period_start', 'period_end', 'evaluation_deadline']);

        $requestedKpiCycleId = $request->filled('kpi_cycle_id') ? (int) $request->input('kpi_cycle_id') : null;
        $requested360CycleId = $request->filled('three_sixty_cycle_id') ? (int) $request->input('three_sixty_cycle_id') : null;

        $kpiCycle = $requestedKpiCycleId
            ? $kpiCycles->firstWhere('id', $requestedKpiCycleId)
            : $kpiCycles->first();

        if ($requested360CycleId) {
            $threeSixtyCycle = $threeSixtyCycles->firstWhere('id', $requested360CycleId);
        } elseif ($kpiCycle) {
            $threeSixtyCycle = $threeSixtyCycles->firstWhere('kpi_cycle_id', $kpiCycle->id) ?? $threeSixtyCycles->first();
        } else {
            $threeSixtyCycle = $threeSixtyCycles->first();
        }

        $viewTeamId = $current_team->id;

        // ── Authorization Levels ─────────────────────────────────────────────
        $isSuperAdmin = (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())
            || $user->hasRole('Super Admin');

        $canManageAll = $isSuperAdmin
            || $user->can('roles.manage')
            || $user->can('kpi.view-all-branches')
            || $user->can('kpi.approve-hr')
            || $user->hasRole('HR Business Partner')
            || $user->hasRole('CEO')
            || $user->hasRole('COO')
            || $user->hasRole('HOB')
            || $user->hasRole('HOBS');

        $canViewBranch = $user->can('kpi.view-branch') || $user->hasRole('Branch Manager');
        $canViewDepartment = $user->can('kpi.view-department') || $user->hasRole('HOD');
        $isSupervisor = $user->can('kpi.review-supervisor') || $user->subordinates()->exists();

        // An individual user who is entitled to his/her own data ONLY
        $isIndividualOnly = !$canManageAll && !$canViewBranch && !$canViewDepartment && !$isSupervisor;

        $defaultKpiWeight = (float) AppSetting::get('kpi_weight', 70);
        $defaultThreeSixtyWeight = (float) AppSetting::get('three_sixty_weight', 30);

        $kpiWeight        = (float) ($request->input('kpi_weight', $defaultKpiWeight));
        $threeSixtyWeight = (float) ($request->input('three_sixty_weight', $defaultThreeSixtyWeight));

        // ── Filter Scoping & Protection ──────────────────────────────────────
        if ($isIndividualOnly) {
            // Hard lock individual user to their own data only
            $filterDeptId = null;
            $filterTeamId = null;
            $filterUserId = $user->id;
            $evaluateeId  = $user->id;

            $departments = [];
            $branches    = [];
            $availableUsers = User::where('id', $user->id)
                ->select('id', 'name', 'employee_no', 'department_id', 'current_team_id')
                ->get();

            $topCoreValueRankings = [];
            $orgRanking = $threeSixtyCycle
                ? PerformanceReportService::orgCoreValueRanking($threeSixtyCycle->id)
                : [];
            $unitSummary = [];

            $canBypassPeriodLock = $isSuperAdmin || $user->hasRole('HR Business Partner');
            $isPeriodElapsed = $threeSixtyCycle?->isPeriodElapsed() ?? false;

            $myKpiReport = $kpiCycle
                ? PerformanceReportService::individualKpiReport($user->id, $kpiCycle->id)
                : [];
            $kpiAppraisalData = $kpiCycle
                ? PerformanceReportService::kpiAppraisalData($user->id, $kpiCycle->id)
                : ['comment' => null, 'sign_off' => null];
            $targetKpiUser = $user;
            $myCoreValueReport = ($threeSixtyCycle && ($isPeriodElapsed || $canBypassPeriodLock))
                ? PerformanceReportService::individualCoreValueReport($user->id, $threeSixtyCycle->id)
                : [];
            $detailed360Report = ($threeSixtyCycle && ($isPeriodElapsed || $canBypassPeriodLock))
                ? PerformanceReportService::detailedIndividual360Report($user->id, $threeSixtyCycle->id)
                : null;

            $branchDeptKpiReport = [];
            $branchDept360Report = ['core_values' => [], 'members' => []];

            $combinedPerformance = ($kpiCycle && $threeSixtyCycle)
                ? PerformanceReportService::combinedPerformanceReport(
                    null,
                    null,
                    $user->id,
                    $kpiCycle->id,
                    $threeSixtyCycle->id,
                    $kpiWeight,
                    $threeSixtyWeight
                )
                : [];
        } else {
            // Manager, Supervisor, or Admin View
            $filterDeptId = $request->filled('department_id') ? (int) $request->input('department_id') : null;
            $filterTeamId = $request->filled('team_id') ? (int) $request->input('team_id') : null;
            $filterUserId = $request->filled('user_id') ? (int) $request->input('user_id') : null;
            $evaluateeId  = $request->filled('evaluatee_id') ? (int) $request->input('evaluatee_id') : null;

            if (!$canManageAll) {
                if ($canViewBranch && !$canViewDepartment) {
                    $filterTeamId = $viewTeamId;
                } elseif ($canViewDepartment && !$canViewBranch) {
                    $filterDeptId = $user->department_id;
                } elseif (!$filterTeamId && !$filterDeptId) {
                    $filterTeamId = $viewTeamId;
                }
            }

            // Available lists for filters
            if ($canManageAll) {
                $departments = Department::orderBy('name')->get(['id', 'name']);
                $branches    = Team::where('is_personal', false)->orderBy('name')->get(['id', 'name', 'type']);
                $availableUsers = User::orderBy('name')->select('id', 'name', 'employee_no', 'department_id', 'current_team_id')->get();
            } elseif ($canViewBranch) {
                $departments = Department::whereHas('users', fn($q) => $q->where('current_team_id', $viewTeamId))->orderBy('name')->get(['id', 'name']);
                $branches    = Team::where('id', $viewTeamId)->get(['id', 'name', 'type']);
                $availableUsers = User::where('current_team_id', $viewTeamId)->orderBy('name')->select('id', 'name', 'employee_no', 'department_id', 'current_team_id')->get();
            } elseif ($canViewDepartment) {
                $departments = Department::where('id', $user->department_id)->get(['id', 'name']);
                $branches    = Team::where('is_personal', false)->whereHas('users', fn($q) => $q->where('department_id', $user->department_id))->orderBy('name')->get(['id', 'name', 'type']);
                $availableUsers = User::where('department_id', $user->department_id)->orderBy('name')->select('id', 'name', 'employee_no', 'department_id', 'current_team_id')->get();
            } elseif ($isSupervisor) {
                $subordinateIds = $user->subordinates()->pluck('id')->push($user->id)->unique();
                $departments = Department::whereIn('id', User::whereIn('id', $subordinateIds)->pluck('department_id')->filter())->get(['id', 'name']);
                $branches    = Team::whereIn('id', User::whereIn('id', $subordinateIds)->pluck('current_team_id')->filter())->get(['id', 'name', 'type']);
                $availableUsers = User::whereIn('id', $subordinateIds)->orderBy('name')->select('id', 'name', 'employee_no', 'department_id', 'current_team_id')->get();
            } else {
                $departments = [];
                $branches    = [];
                $availableUsers = User::where('id', $user->id)->select('id', 'name', 'employee_no', 'department_id', 'current_team_id')->get();
            }

            // 1. Top 5 Staff Ranking per Core Value (organization-wide, admins and managers only)
            $topCoreValueRankings = $threeSixtyCycle
                ? PerformanceReportService::topStaffRankingPerCoreValue($threeSixtyCycle->id, 5)
                : [];

            // 2. Org-level ranking
            $orgRanking = $threeSixtyCycle
                ? PerformanceReportService::orgCoreValueRanking($threeSixtyCycle->id)
                : [];

            // 3. Unit summary
            $unitSummary = ($kpiCycle && $threeSixtyCycle)
                ? PerformanceReportService::unitSummary($kpiCycle->id, $threeSixtyCycle->id, $kpiWeight, $threeSixtyWeight)
                : [];

            if (!$canManageAll) {
                $unitSummary = array_values(array_filter(
                    $unitSummary,
                    fn($row) => $row['team_id'] === $viewTeamId
                ));
            }

            // 4. Individual KPI Report (Current User or Selected Staff Member)
            $targetKpiUserId = $filterUserId ?: $user->id;
            $targetKpiUser = User::find($targetKpiUserId) ?? $user;
            $myKpiReport = ($kpiCycle)
                ? PerformanceReportService::individualKpiReport($targetKpiUserId, $kpiCycle->id)
                : [];
            $kpiAppraisalData = ($kpiCycle)
                ? PerformanceReportService::kpiAppraisalData($targetKpiUserId, $kpiCycle->id)
                : ['comment' => null, 'sign_off' => null];

            // 5. Individual Core Value Report (Current User)
            $myCoreValueReport = ($threeSixtyCycle)
                ? PerformanceReportService::individualCoreValueReport($user->id, $threeSixtyCycle->id)
                : [];

            // 6. Detailed 360 Individual Report
            $detailed360Report = null;
            if ($evaluateeId && $threeSixtyCycle) {
                $targetUser = User::find($evaluateeId);
                $canViewTarget = $targetUser && (
                    $canManageAll
                    || $targetUser->id === $user->id
                    || ($canViewBranch && $targetUser->current_team_id === $viewTeamId)
                    || ($canViewDepartment && $targetUser->department_id === $user->department_id)
                    || ($isSupervisor && $targetUser->supervisor_id === $user->id)
                );

                if ($canViewTarget) {
                    $canBypassPeriodLock = $isSuperAdmin || (method_exists($user, 'isHrbp') ? $user->isHrbp() : $user->hasRole('HR Business Partner'));
                    $isPeriodElapsed = $threeSixtyCycle->isPeriodElapsed();

                    if (! $canBypassPeriodLock && ! $isPeriodElapsed) {
                        $detailed360Report = null;
                    } else {
                        $detailed360Report = PerformanceReportService::detailedIndividual360Report($targetUser->id, $threeSixtyCycle->id);
                    }
                }
            }

            // 7. Branch/Department KPI Report
            $branchDeptKpiReport = ($kpiCycle)
                ? PerformanceReportService::branchDepartmentKpiReport($filterDeptId, $filterTeamId, $kpiCycle->id, $filterUserId)
                : [];

            // 8. Branch/Department 360 Report
            $branchDept360Report = ($threeSixtyCycle)
                ? PerformanceReportService::branchDepartment360Report($filterDeptId, $filterTeamId, $threeSixtyCycle->id, $filterUserId)
                : ['core_values' => [], 'members' => []];

            // 9. Combined Performance Report (Weighted 360 & KPI)
            $combinedPerformance = ($kpiCycle && $threeSixtyCycle)
                ? PerformanceReportService::combinedPerformanceReport(
                    $filterDeptId,
                    $filterTeamId,
                    $filterUserId,
                    $kpiCycle->id,
                    $threeSixtyCycle->id,
                    $kpiWeight,
                    $threeSixtyWeight
                )
                : [];
        }

        return Inertia::render('Reports/Performance', [
            'kpiCycle'              => $kpiCycle,
            'threeSixtyCycle'       => $threeSixtyCycle,
            'kpiCycles'             => $kpiCycles,
            'threeSixtyCycles'      => $threeSixtyCycles,
            'orgCoreValueRanking'   => $orgRanking,
            'topCoreValueRankings'  => $topCoreValueRankings,
            'unitSummary'           => $unitSummary,
            'myKpiReport'           => $myKpiReport,
            'kpiAppraisalData'      => $kpiAppraisalData,
            'targetKpiUser'         => [
                'id'          => $targetKpiUser->id,
                'name'        => $targetKpiUser->name,
                'employee_no' => $targetKpiUser->employee_no,
                'job_title'   => $targetKpiUser->job_title,
                'department'  => $targetKpiUser->department?->name ?? '—',
                'branch'      => $targetKpiUser->currentTeam?->name ?? '—',
            ],
            'canEditKpiComments'    => [
                'canEditStaff'      => ($user->id === $targetKpiUser->id || $canManageAll),
                'canEditSupervisor' => ($isSupervisor || $canManageAll || $targetKpiUser->supervisor_id === $user->id),
            ],
            'myCoreValueReport'     => $myCoreValueReport,
            'canManage'             => $canManageAll,
            'isIndividualOnly'      => $isIndividualOnly,
            'currentUser'           => [
                'id'          => $user->id,
                'name'        => $user->name,
                'employee_no' => $user->employee_no,
                'job_title'   => $user->job_title,
                'department'  => $user->department?->name ?? '—',
                'branch'      => $user->currentTeam?->name ?? '—',
            ],
            'departments'           => $departments,
            'branches'              => $branches,
            'availableUsers'        => $availableUsers,
            'detailed360Report'     => $detailed360Report,
            'selectedEvaluateeId'   => $evaluateeId,
            'isSuperAdmin'          => $isSuperAdmin,
            'isHrbp'                => (method_exists($user, 'isHrbp') ? $user->isHrbp() : $user->hasRole('HR Business Partner')),
            'isSupervisor'          => $isSupervisor,
            'canEditSubmittedComments' => $isSuperAdmin || (method_exists($user, 'isHrbp') ? $user->isHrbp() : $user->hasRole('HR Business Partner')) || ($evaluateeId && ($user->subordinates()->where('id', $evaluateeId)->exists())),
            'branchDeptKpiReport'   => $branchDeptKpiReport,
            'branchDept360Report'   => $branchDept360Report,
            'combinedPerformance'   => $combinedPerformance,
            'savedKpiWeight'        => $defaultKpiWeight,
            'savedThreeSixtyWeight' => $defaultThreeSixtyWeight,
            'isThreeSixtyPeriodElapsed' => $threeSixtyCycle?->isPeriodElapsed() ?? false,
            'threeSixtyCycleDeadline'   => $threeSixtyCycle?->evaluation_deadline?->format('d M Y') ?? $threeSixtyCycle?->period_end?->format('d M Y'),
            'filters'               => [
                'kpi_cycle_id'         => $kpiCycle?->id,
                'three_sixty_cycle_id' => $threeSixtyCycle?->id,
                'department_id'        => $filterDeptId,
                'team_id'              => $filterTeamId,
                'user_id'              => $filterUserId,
                'kpi_weight'           => $kpiWeight,
                'three_sixty_weight'   => $threeSixtyWeight,
            ],
        ]);
    }

    /**
     * Save or submit staff comments on their 360° performance appraisal report.
     * Comments appear directly in the 'Staff Comment' section of the report.
     */
    public function saveStaffComment(Request $request, Team $current_team): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'three_sixty_cycle_id' => ['required', 'exists:three_sixty_cycles,id'],
            'evaluatee_id'         => ['nullable', 'exists:users,id'],
            'overall_comment'      => ['nullable', 'string', 'max:5000'],
            'parameter_comments'   => ['nullable', 'array'],
            'parameter_comments.*' => ['nullable', 'string', 'max:2000'],
            'status'               => ['required', 'in:draft,submitted'],
        ]);

        $cycle = ThreeSixtyCycle::findOrFail($validated['three_sixty_cycle_id']);

        // Check if appraisal period has elapsed
        if (! $cycle->isPeriodElapsed()) {
            return redirect()->back()->withErrors([
                'error' => 'Staff comments can only be submitted once the 360 appraisal period has ended.',
            ]);
        }

        // Determine target user and privileges
        $targetUserId = $user->id;
        $isSuperAdmin = (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())
            || $user->hasRole('Super Admin');
        $isHrbp = (method_exists($user, 'isHrbp') && $user->isHrbp()) || $user->hasRole('HR Business Partner');

        if (! empty($validated['evaluatee_id'])) {
            $candidate = User::find($validated['evaluatee_id']);
            if ($candidate) {
                $isCandidateSupervisor = $candidate->supervisor_id === $user->id || $candidate->resolveSupervisorForKpi()?->id === $user->id;
                if ($isSuperAdmin || $isHrbp || $isCandidateSupervisor) {
                    $targetUserId = (int) $candidate->id;
                }
            }
        }

        $targetUser = User::findOrFail($targetUserId);
        $isSupervisor = $targetUser->supervisor_id === $user->id || $targetUser->resolveSupervisorForKpi()?->id === $user->id;
        $canManageComments = $isSuperAdmin || $isHrbp || $isSupervisor;

        // Fetch existing comment record if any
        $existingRecord = ThreeSixtyStaffAppraisalComment::where('three_sixty_cycle_id', $cycle->id)
            ->where('user_id', $targetUserId)
            ->first();

        $isAlreadySubmitted = $existingRecord && $existingRecord->status === 'submitted';

        // Once submitted, only supervisor, HRBP, or Super Admin can edit
        if ($isAlreadySubmitted && ! $canManageComments) {
            return redirect()->back()->withErrors([
                'error' => 'Appraisal comments have already been submitted. Only an immediate Supervisor, HR Business Partner, or Super Admin can edit submitted comments.',
            ]);
        }

        // If modifying someone else's comments, must be supervisor, HRBP, or Super Admin
        if ($targetUserId !== $user->id && ! $canManageComments) {
            abort(403, 'Unauthorized to modify appraisal comments for this staff member.');
        }

        // Clean parameter comments
        $cleanParams = [];
        if (! empty($validated['parameter_comments'])) {
            foreach ($validated['parameter_comments'] as $qId => $comm) {
                if (trim((string) $comm) !== '') {
                    $cleanParams[(string) $qId] = trim((string) $comm);
                }
            }
        }

        // When submitting final comments, block if any comment is pending
        if ($validated['status'] === 'submitted') {
            $requiredQuestionIds = CoreValueQuestion::whereHas('coreValue', fn($q) => $q->where('is_active', true))
                ->where('is_active', true)
                ->pluck('id');

            $missingQuestionsCount = 0;
            foreach ($requiredQuestionIds as $qId) {
                if (empty($cleanParams[(string) $qId])) {
                    $missingQuestionsCount++;
                }
            }

            $isOverallMissing = empty(trim($validated['overall_comment'] ?? ''));

            if ($missingQuestionsCount > 0 || $isOverallMissing) {
                $reasons = [];
                if ($missingQuestionsCount > 0) {
                    $reasons[] = "{$missingQuestionsCount} core value question comment" . ($missingQuestionsCount > 1 ? 's are' : ' is') . " pending";
                }
                if ($isOverallMissing) {
                    $reasons[] = "the overall reflection comment is required";
                }

                return redirect()->back()->withErrors([
                    'error' => "Submission blocked: All comments must be captured before unlocking the report (" . implode(' and ', $reasons) . ").",
                ]);
            }
        }

        $newOverall = trim($validated['overall_comment'] ?? '') ?: null;

        $commentRecord = ThreeSixtyStaffAppraisalComment::updateOrCreate(
            [
                'three_sixty_cycle_id' => $cycle->id,
                'user_id'              => $targetUserId,
            ],
            [
                'status'             => $validated['status'],
                'overall_comment'    => $newOverall,
                'parameter_comments' => $cleanParams,
                'submitted_at'       => $validated['status'] === 'submitted' ? ($existingRecord?->submitted_at ?? now()) : null,
            ]
        );

        // Audit log entry
        $actorRole = 'Staff';
        if ($isSuperAdmin) {
            $actorRole = 'Super Admin';
        } elseif ($isHrbp) {
            $actorRole = 'HR Business Partner';
        } elseif ($isSupervisor && $user->id !== $targetUserId) {
            $actorRole = 'Supervisor';
        }

        $action = $isAlreadySubmitted
            ? ($actorRole === 'Supervisor' ? 'edited_by_supervisor' : ($actorRole === 'HR Business Partner' ? 'edited_by_hrbp' : ($actorRole === 'Super Admin' ? 'edited_by_admin' : 'edited_post_submission')))
            : ($validated['status'] === 'submitted' ? 'submitted' : 'draft_saved');

        $details = $isAlreadySubmitted
            ? "Appraisal comments edited post-submission by {$user->name} ({$actorRole})"
            : ($validated['status'] === 'submitted' ? "Initial appraisal comments submitted by {$user->name}" : "Draft comments saved by {$user->name}");

        ThreeSixtyStaffAppraisalCommentLog::create([
            'comment_id' => $commentRecord->id,
            'actor_id'   => $user->id,
            'action'     => $action,
            'actor_role' => $actorRole,
            'details'    => $details,
            'changes'    => [
                'overall_comment' => [
                    'old' => $existingRecord?->overall_comment,
                    'new' => $newOverall,
                ],
                'parameter_comments_count' => count($cleanParams),
            ],
            'ip_address' => $request->ip(),
        ]);

        $msg = $validated['status'] === 'submitted'
            ? ($isAlreadySubmitted ? 'Appraisal comments updated successfully (Audit Log updated).' : 'Your 360° appraisal comments have been submitted. Your individual report is now available for view and download.')
            : 'Your draft comments have been saved.';

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Save or submit staff comments, supervisor comments, and concluding remarks on the KPI Performance Report.
     */
    public function saveKpiComment(Request $request, Team $current_team): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'kpi_cycle_id'                  => ['required', 'exists:kpi_cycles,id'],
            'user_id'                       => ['nullable', 'exists:users,id'],
            'supervisor_positives'          => ['nullable', 'string', 'max:5000'],
            'supervisor_areas_to_improve'   => ['nullable', 'string', 'max:5000'],
            'supervisor_concluding_remarks' => ['nullable', 'string', 'max:5000'],
            'staff_achievement_reasons'     => ['nullable', 'string', 'max:5000'],
            'staff_future_commitment'       => ['nullable', 'string', 'max:5000'],
            'staff_training_requests'       => ['nullable', 'string', 'max:5000'],
            'status'                        => ['required', 'in:draft,submitted'],
        ]);

        $targetUserId = !empty($validated['user_id']) ? (int) $validated['user_id'] : $user->id;
        $targetUser = User::findOrFail($targetUserId);

        $isSuperAdmin = (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())
            || $user->hasRole('Super Admin');
        $isHrbp = (method_exists($user, 'isHrbp') && $user->isHrbp()) || $user->hasRole('HR Business Partner');
        $isSupervisor = $targetUser->supervisor_id === $user->id || $targetUser->resolveSupervisorForKpi()?->id === $user->id;
        $isSelf = $targetUserId === $user->id;
        $canManageAll = $isSuperAdmin || $isHrbp || $user->can('roles.manage');

        if (! $isSelf && ! $isSupervisor && ! $isHrbp && ! $isSuperAdmin && ! $canManageAll) {
            abort(403, 'Unauthorized to save appraisal comments for this staff member.');
        }

        $commentRecord = KpiAppraisalComment::firstOrNew([
            'kpi_cycle_id' => $validated['kpi_cycle_id'],
            'user_id'      => $targetUserId,
        ]);

        // Staff fields update
        if ($isSelf || $isSuperAdmin || $isHrbp || $isSupervisor || $canManageAll) {
            if (array_key_exists('staff_achievement_reasons', $validated)) {
                $commentRecord->staff_achievement_reasons = $validated['staff_achievement_reasons'];
            }
            if (array_key_exists('staff_future_commitment', $validated)) {
                $commentRecord->staff_future_commitment = $validated['staff_future_commitment'];
            }
            if (array_key_exists('staff_training_requests', $validated)) {
                $commentRecord->staff_training_requests = $validated['staff_training_requests'];
            }
            if ($isSelf && $validated['status'] === 'submitted') {
                $commentRecord->staff_submitted_at = now();
            }
        }

        // Supervisor fields update
        if ($isSupervisor || $isHrbp || $isSuperAdmin || $canManageAll) {
            if (array_key_exists('supervisor_positives', $validated)) {
                $commentRecord->supervisor_positives = $validated['supervisor_positives'];
            }
            if (array_key_exists('supervisor_areas_to_improve', $validated)) {
                $commentRecord->supervisor_areas_to_improve = $validated['supervisor_areas_to_improve'];
            }
            if (array_key_exists('supervisor_concluding_remarks', $validated)) {
                $commentRecord->supervisor_concluding_remarks = $validated['supervisor_concluding_remarks'];
            }
            if ($validated['status'] === 'submitted') {
                $commentRecord->supervisor_submitted_at = now();
            }
        }

        $commentRecord->status = $validated['status'];
        $commentRecord->save();

        $msg = $validated['status'] === 'submitted'
            ? 'KPI Performance Appraisal comments saved successfully.'
            : 'Draft KPI appraisal comments saved successfully.';

        return redirect()->back()->with('success', $msg);
    }
}
