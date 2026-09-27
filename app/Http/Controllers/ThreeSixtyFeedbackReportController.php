<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Region;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\User;
use App\Services\ThreeSixtyFeedbackReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ThreeSixtyFeedbackReportController extends Controller
{
    /**
     * Display the paginated 360 Feedback Summary & Core Value Questions Comments Report.
     * Restricted strictly to HRBP and Super Admin.
     * Reviewer identities remain anonymous.
     */
    public function index(Request $request, Team $current_team): Response|JsonResponse
    {
        $user = $request->user();

        // Strict authorization check for HRBP or Super Admin
        $isAuthorized = (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())
            || (method_exists($user, 'isHrbp') && $user->isHrbp())
            || $user->hasRole('Super Admin')
            || $user->hasRole('HR Business Partner');

        abort_unless($isAuthorized, 403, 'This report is restricted to HRBP and Super Admin only.');

        // All available 360 cycles
        $cycles = ThreeSixtyCycle::whereIn('status', ['open', 'closed'])
            ->orderByDesc('period_start')
            ->get(['id', 'name', 'status', 'period_start', 'period_end']);

        $selectedCycleId = $request->filled('cycle_id')
            ? (int) $request->input('cycle_id')
            : $cycles->first()?->id;

        $selectedCycle = $cycles->firstWhere('id', $selectedCycleId);

        $filterRegionId = $request->filled('region_id') ? (int) $request->input('region_id') : null;
        $filterDeptId = $request->filled('department_id') ? (int) $request->input('department_id') : null;
        $filterTeamId = $request->filled('team_id') ? (int) $request->input('team_id') : null;
        $filterEvaluateeId = $request->filled('evaluatee_id') ? (int) $request->input('evaluatee_id') : null;
        $filterRelationship = $request->filled('relationship_type') ? (string) $request->input('relationship_type') : null;
        $search = $request->filled('search') ? trim((string) $request->input('search')) : null;
        $onlyWithComments = $request->has('only_with_comments')
            ? filter_var($request->input('only_with_comments'), FILTER_VALIDATE_BOOLEAN)
            : false;
        $perPage = $request->filled('per_page') ? max(5, min(100, (int) $request->input('per_page'))) : 10;
        $page = $request->filled('page') ? (int) $request->input('page') : 1;

        $filterParams = [
            'cycle_id'           => $selectedCycleId,
            'region_id'          => $filterRegionId,
            'department_id'      => $filterDeptId,
            'team_id'            => $filterTeamId,
            'evaluatee_id'       => $filterEvaluateeId,
            'relationship_type'  => $filterRelationship,
            'search'             => $search,
            'only_with_comments' => $onlyWithComments,
            'per_page'           => $perPage,
            'page'               => $page,
        ];

        // Export all endpoint for full dataset downloads
        if ($request->query('export') === 'all') {
            return response()->json(ThreeSixtyFeedbackReportService::getAllForExport($filterParams));
        }

        $reportData = ThreeSixtyFeedbackReportService::buildReport($filterParams);

        $regions = Region::orderBy('name')->get(['id', 'name', 'code']);
        $departments = Department::orderBy('name')->get(['id', 'name']);
        $branches = Team::where('is_personal', false)->orderBy('name')->get(['id', 'name', 'type', 'region_id']);
        $availableUsers = User::orderBy('name')->select('id', 'name', 'employee_no', 'department_id', 'current_team_id')->get();

        return Inertia::render('Reports/FeedbackSummary', [
            'cycles'             => $cycles,
            'selectedCycle'      => $selectedCycle,
            'regions'            => $regions,
            'departments'        => $departments,
            'branches'           => $branches,
            'availableUsers'     => $availableUsers,
            'relationshipLabels' => ThreeSixtyFeedbackReportService::RELATIONSHIP_LABELS,
            'stats'              => $reportData['stats'],
            'evaluatees'         => $reportData['evaluatees'],
            'coreValues'         => $reportData['core_values'],
            'filters'            => [
                'cycle_id'           => $selectedCycleId,
                'region_id'          => $filterRegionId,
                'department_id'      => $filterDeptId,
                'team_id'            => $filterTeamId,
                'evaluatee_id'       => $filterEvaluateeId,
                'relationship_type'  => $filterRelationship,
                'search'             => $search,
                'only_with_comments' => $onlyWithComments,
                'per_page'           => $perPage,
                'page'               => $page,
            ],
            'currentTeam'        => [
                'id'   => $current_team->id,
                'name' => $current_team->name,
                'slug' => $current_team->slug,
            ],
        ]);
    }
}
