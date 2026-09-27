<?php

namespace App\Http\Controllers;

use App\Models\CoreValue;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\KpiEntryLog;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\ThreeSixtyEvaluationRating;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $email = strtolower($user->email);

        $pendingInvitations = TeamInvitation::query()
            ->with(['inviter', 'team'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNull('accepted_at')
            ->where(fn($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->latest()
            ->get()
            ->map(fn(TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'inviterName' => $invitation->inviter->name,
                'team' => [
                    'name' => $invitation->team->name,
                    'slug' => $invitation->team->slug,
                ],
            ]);

        $cycle = KpiCycle::where('status', 'open')->latest('period_start')->first();

        // 1. My Personal KPIs
        $myEntries = $user
            ->kpiEntries()
            ->when($cycle, fn($q) => $q->where('kpi_cycle_id', $cycle->id))
            ->get(['id', 'title', 'status', 'weight']);

        $statuses = ['draft', 'submitted', 'supervisor_returned', 'supervisor_approved', 'hr_returned', 'hr_approved'];
        $myStatusCounts = collect($statuses)->mapWithKeys(
            fn($status) => [$status => $myEntries->where('status', $status)->count()]
        );

        // 2. Determine Visibility Scope
        $scope = $this->determineVisibilityScope($user);

        // 3. Fetch Scoped Aggregate Data
        $scopedQuery = KpiEntry::query()->when($cycle, fn($q) => $q->where('kpi_cycle_id', $cycle->id));

        $scopeName = 'Personal';
        $scopeDescription = 'Your personal KPI entries';
        $teamIds = [];

        if ($scope === 'branch' && $user->current_team_id) {
            $team = Team::find($user->current_team_id);
            $scopeName = $team ? $team->name : 'Branch';
            $scopeDescription = "Branch performance for {$scopeName}";
            $scopedQuery->where('team_id', $user->current_team_id);
        } elseif ($scope === 'department' && $user->department_id) {
            $department = $user->department;
            $scopeName = $department ? $department->name : 'Department';
            $scopeDescription = "Department performance for {$scopeName}";
            $scopedQuery->where('department_id', $user->department_id);
        } elseif ($scope === 'region') {
            $regionId = $user->currentTeam?->region_id;
            $userRegionIds = $user->hrRegions->pluck('id')->all();
            if ($regionId && !in_array($regionId, $userRegionIds)) {
                $userRegionIds[] = $regionId;
            }
            $teamIds = Team::whereIn('region_id', $userRegionIds)->pluck('id')->all();
            $scopeName = 'Regional';
            $scopeDescription = 'Performance across your assigned region(s)';
            $scopedQuery->whereIn('team_id', $teamIds);
        } elseif ($scope === 'all') {
            $scopeName = 'Organisation-wide';
            $scopeDescription = 'All branches, departments & HQ';
            // All entries across company
        } else {
            // 'own' scope
            $scopedQuery->where('user_id', $user->id);
        }

        $scopedEntries = $scopedQuery->get(['id', 'user_id', 'status', 'weight', 'department_id', 'team_id']);

        $scopedStatusCounts = collect($statuses)->mapWithKeys(
            fn($status) => [$status => $scopedEntries->where('status', $status)->count()]
        );

        $scopedTotalEntries = $scopedEntries->count();
        $scopedStaffCount = $scopedEntries->pluck('user_id')->unique()->count();
        $scopedFinalizedCount = $scopedEntries->where('status', 'hr_approved')->count();
        $scopedCompletionRate = $scopedTotalEntries > 0 ? round(($scopedFinalizedCount / $scopedTotalEntries) * 100) : 0;

        // 4. Pending Review Count
        $canReview = $user->can('kpi.review-supervisor') || $user->can('kpi.approve-hr');
        $pendingReviewCount = 0;

        if ($canReview) {
            $pendingReviewCount = KpiEntry::query()
                ->where(fn($q) => $q->where('status', 'submitted')->where('current_approver_id', $user->id))
                ->orWhere(fn($q) => $q
                    ->where('status', 'supervisor_approved')
                    ->whereHas('team.region.hrbps', fn($h) => $h->where('users.id', $user->id)))
                ->count();
        }

        $pendingEvaluationReviewCount = KpiEntry::query()
            ->where('evaluation_status', 'self_submitted')
            ->where('current_approver_id', $user->id)
            ->count();

        // 5. Recent Activity
        $activityQuery = KpiEntryLog::query();
        if ($scope === 'own') {
            $activityQuery->whereHas('entry', fn($q) => $q->where('user_id', $user->id));
        } elseif ($scope === 'branch') {
            $activityQuery->whereHas('entry', fn($q) => $q->where('team_id', $user->current_team_id));
        } elseif ($scope === 'department') {
            $activityQuery->whereHas('entry', fn($q) => $q->where('department_id', $user->department_id));
        } elseif ($scope === 'region' && !empty($teamIds)) {
            $activityQuery->whereHas('entry', fn($q) => $q->whereIn('team_id', $teamIds));
        }

        $recentActivity = $activityQuery
            ->with(['actor:id,name', 'entry:id,title'])
            ->latest('created_at')
            ->limit(3)
            ->get(['id', 'kpi_entry_id', 'actor_id', 'stage', 'action', 'created_at']);

        // 6. 360° Appraisal Setup & Scheduled Evaluation Metrics
        $threeSixtyCycle = ThreeSixtyCycle::where('status', 'open')->latest('period_start')->first();

        // 6a. Evaluations assigned to the current user as reviewer/evaluator
        $myEvaluatorAssignments = collect();
        if ($threeSixtyCycle) {
            $myEvaluatorAssignments = ThreeSixtyEvaluation::where('three_sixty_cycle_id', $threeSixtyCycle->id)
                ->where('evaluator_id', $user->id)
                ->with([
                    'evaluatee:id,name,email,job_title,department_id,current_team_id',
                    'evaluatee.department:id,name,code',
                    'evaluatee.currentTeam:id,name,type',
                ])
                ->get();
        }

        $myAssignedTotal     = $myEvaluatorAssignments->count();
        $myAssignedCompleted = $myEvaluatorAssignments->where('status', 'completed')->count();
        $myAssignedPending   = $myEvaluatorAssignments->where('status', '!=', 'completed')->count();
        $isMyPairGroupLocked = $myAssignedTotal > 0 && ($myAssignedPending === 0);

        // 6b. Summary of 360 scores received by this user (where user is the evaluatee)
        // Grouped by Core Value with average score and qualitative rating comment
        $evaluationsReceived = collect();
        $coreValueSummary = [];
        $overallThreeSixtyAverage = null;

        if ($threeSixtyCycle) {
            $completedReceived = ThreeSixtyEvaluation::where('three_sixty_cycle_id', $threeSixtyCycle->id)
                ->where('evaluatee_id', $user->id)
                ->where('status', 'completed')
                ->with('ratings.coreValue')
                ->get();

            if ($completedReceived->isNotEmpty()) {
                $allRatings = $completedReceived->flatMap->ratings;
                $activeCoreValues = CoreValue::where('is_active', true)->orderBy('order')->get();

                $totalScoresSum = 0;
                $totalRatingsCount = 0;

                foreach ($activeCoreValues as $cv) {
                    $cvRatings = $allRatings->where('core_value_id', $cv->id);
                    $count = $cvRatings->count();
                    $avg = $count > 0 ? round($cvRatings->avg('score'), 2) : null;

                    if ($avg !== null) {
                        $totalScoresSum += $cvRatings->sum('score');
                        $totalRatingsCount += $count;
                    }

                    // Qualitative Rating Comment: Far Below Average, Average, Far Above Average
                    $ratingComment = 'No Ratings Yet';
                    $badgeType = 'neutral';
                    if ($avg !== null) {
                        if ($avg < 2.5) {
                            $ratingComment = 'Far Below Average';
                            $badgeType = 'danger';
                        } elseif ($avg <= 3.7) {
                            $ratingComment = 'Average';
                            $badgeType = 'warn';
                        } else {
                            $ratingComment = 'Far Above Average';
                            $badgeType = 'green';
                        }
                    }

                    $coreValueSummary[] = [
                        'id'             => $cv->id,
                        'name'           => $cv->name,
                        'description'    => $cv->description,
                        'weight'         => $cv->weight,
                        'ratings_count'  => $count,
                        'average_score'  => $avg,
                        'rating_comment' => $ratingComment,
                        'badge_type'     => $badgeType,
                    ];
                }

                if ($totalRatingsCount > 0) {
                    $overallThreeSixtyAverage = round($totalScoresSum / $totalRatingsCount, 2);
                }
            }
        }

        $threeSixtyData = [
            'has_scheduled_appraisal' => $threeSixtyCycle !== null,
            'cycle'                   => $threeSixtyCycle ? [
                'id'                  => $threeSixtyCycle->id,
                'name'                => $threeSixtyCycle->name,
                'period_start'        => $threeSixtyCycle->period_start?->toDateString(),
                'period_end'          => $threeSixtyCycle->period_end?->toDateString(),
                'evaluation_deadline' => $threeSixtyCycle->evaluation_deadline?->toDateString(),
                'status'              => $threeSixtyCycle->status,
                'days_remaining'      => $threeSixtyCycle->evaluation_deadline ? (int) now()->diffInDays($threeSixtyCycle->evaluation_deadline, false) : null,
            ] : null,
            'my_assignments' => [
                'total'               => $myAssignedTotal,
                'completed'           => $myAssignedCompleted,
                'pending'             => $myAssignedPending,
                'is_locked'           => $isMyPairGroupLocked,
                'pairs'               => $myEvaluatorAssignments->map(fn($e) => [
                    'id'                => $e->id,
                    'relationship_type' => $e->relationship_type,
                    'status'            => $e->status,
                    'score'             => $e->score !== null ? (float) $e->score : null,
                    'submitted_at'      => $e->submitted_at?->toDateTimeString(),
                    'evaluatee'         => [
                        'id'         => $e->evaluatee->id,
                        'name'       => $e->evaluatee->name,
                        'email'      => $e->evaluatee->email,
                        'job_title'  => $e->evaluatee->job_title,
                        'team_name'  => $e->evaluatee->currentTeam?->name,
                        'dept_name'  => $e->evaluatee->department?->name,
                    ],
                ]),
            ],
            'my_scores' => [
                'overall_average' => $overallThreeSixtyAverage,
                'core_values'     => $coreValueSummary,
            ],
        ];

        return Inertia::render('dashboard', [
            'pendingInvitations' => $pendingInvitations,
            'cycle' => $cycle,
            'myStatusCounts' => $myStatusCounts,
            'totalWeight' => $myEntries->sum('weight'),
            'entryCount' => $myEntries->count(),
            'scope' => $scope,
            'scopeName' => $scopeName,
            'scopeDescription' => $scopeDescription,
            'scopedStatusCounts' => $scopedStatusCounts,
            'scopedTotalEntries' => $scopedTotalEntries,
            'scopedStaffCount' => $scopedStaffCount,
            'scopedCompletionRate' => $scopedCompletionRate,
            'canReview' => $canReview,
            'pendingReviewCount' => $pendingReviewCount,
            'pendingEvaluationReviewCount' => $pendingEvaluationReviewCount,
            'kpiCyclePhase' => $cycle?->phase,
            'recentActivity' => $recentActivity,
            'threeSixty' => $threeSixtyData,
        ]);
    }

    private function determineVisibilityScope(User $user): string
    {
        if ($user->isSuperAdmin()) {
            return 'all';
        }

        if ($user->isHrbp()) {
            return $user->hrRegions()->exists() ? 'region' : 'all';
        }

        $roles = $user->getRoleNames();

        if ($roles->contains(fn($r) => in_array($r, ['COO', 'CEO', 'HOB', 'HOBS', 'Super Admin']))) {
            return 'all';
        }

        if ($roles->contains(fn($r) => in_array($r, ['RM', 'RSTL']))) {
            return 'region';
        }

        if ($roles->contains('HOD')) {
            return 'department';
        }

        if ($roles->contains('Branch Manager')) {
            return 'branch';
        }

        return 'own';
    }
}
