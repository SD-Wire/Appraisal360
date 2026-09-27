<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveKpiSelfScoreRequest;
use App\Http\Requests\SupervisorEvaluateKpiRequest;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\Team;
use App\Services\KpiEvaluationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class KpiEvaluationController extends Controller
{
    public function __construct(
        private readonly KpiEvaluationService $evaluation
    ) {}

    public function index(Request $request): Response
    {
        $cycle = KpiCycle::where('status', 'open')
            ->where('phase', 'evaluation')
            ->latest('period_start')
            ->first();

        $entries = collect();

        if ($cycle) {
            $entries = $request->user()
                ->kpiEntries()
                ->where('kpi_cycle_id', $cycle->id)
                ->where('status', 'hr_approved')
                ->whereNotNull('evaluation_status')
                ->with(['logs.actor'])
                ->orderBy('title')
                ->get();
        }

        $actionable = $entries->filter(
            fn (KpiEntry $e) => in_array($e->evaluation_status, ['pending', 'supervisor_returned'])
        );

        $canSubmit = $actionable->isNotEmpty()
            && $actionable->every(
                fn (KpiEntry $e) => $e->self_rating !== null && filled($e->actual_result) && filled($e->self_comment)
            );

        $weightedScore = KpiEvaluationService::computeWeightedScore(
            $entries->where('evaluation_status', 'completed')
        );

        $threeSixtyScore = $cycle
            ? KpiEvaluationService::threeSixtyAverageForUser($request->user(), $cycle)
            : null;

        return Inertia::render('Kpi/MyEvaluation', [
            'cycle' => $cycle,
            'entries' => $entries,
            'canSubmit' => $canSubmit,
            'weightedScore' => $weightedScore,
            'threeSixtyScore' => $threeSixtyScore,
        ]);
    }

    public function saveSelfScore(
        SaveKpiSelfScoreRequest $request,
        Team $current_team,
        KpiEntry $kpiEntry
    ): RedirectResponse {
        Gate::authorize('evaluateSelf', $kpiEntry);

        $this->evaluation->saveSelfScore($kpiEntry, $request->validated());

        return back()->with('success', 'Self-evaluation saved.');
    }

    public function submitSelfEvaluation(Request $request, Team $current_team): RedirectResponse
    {
        $cycle = KpiCycle::where('status', 'open')
            ->where('phase', 'evaluation')
            ->latest('period_start')
            ->firstOrFail();

        try {
            $this->evaluation->submitSelfEvaluation($request->user(), $cycle);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return to_route('kpi.evaluation.index', ['current_team' => $current_team])
            ->with('success', 'Self-evaluation submitted to your supervisor.');
    }

    public function reviewQueue(Request $request): Response
    {
        $user = $request->user();

        $entries = KpiEntry::query()
            ->with(['user.department', 'cycle'])
            ->whereIn('evaluation_status', ['self_submitted', 'completed', 'supervisor_returned'])
            ->where(function ($q) use ($user) {
                $q->where('current_approver_id', $user->id)
                    ->orWhereHas('user', fn($u) => $u->where('supervisor_id', $user->id));
            })
            ->orderBy('evaluation_submitted_at')
            ->get();

        $reviews = $entries
            ->groupBy('user_id')
            ->map(function ($group) {
                /** @var KpiEntry $first */
                $first = $group->first();
                $pendingCount = $group->where('evaluation_status', 'self_submitted')->count();
                $completedCount = $group->where('evaluation_status', 'completed')->count();
                $returnedCount = $group->where('evaluation_status', 'supervisor_returned')->count();

                return [
                    'first_entry_id' => $first->id,
                    'user' => $first->user->only(['id', 'name']),
                    'department' => $first->user->department?->only(['name']),
                    'cycle' => $first->cycle?->only(['id', 'name']),
                    'kpi_count' => $group->count(),
                    'pending_count' => $pendingCount,
                    'completed_count' => $completedCount,
                    'returned_count' => $returnedCount,
                    'status' => $pendingCount > 0 ? 'pending' : ($returnedCount > 0 ? 'returned' : 'completed'),
                    'submitted_at' => $group->min('evaluation_submitted_at'),
                ];
            })
            ->values();

        return Inertia::render('Kpi/EvaluationReviewQueue', [
            'reviews' => $reviews,
        ]);
    }

    public function reviewShow(Request $request, Team $current_team, KpiEntry $kpiEntry): Response
    {
        Gate::authorize('viewStaffEvaluationReview', $kpiEntry);

        $kpiEntry->load(['user.department', 'cycle']);

        $staffEntries = KpiEntry::query()
            ->where('kpi_cycle_id', $kpiEntry->kpi_cycle_id)
            ->where('user_id', $kpiEntry->user_id)
            ->whereNotNull('evaluation_status')
            ->with(['logs.actor'])
            ->orderBy('title')
            ->get();

        return Inertia::render('Kpi/EvaluationReviewDetail', [
            'staffMember' => $kpiEntry->user->only(['id', 'name']),
            'cycle' => $kpiEntry->cycle,
            'entries' => $staffEntries,
            'activeEntryId' => $kpiEntry->id,
        ]);
    }

    public function approveAsSupervisor(
        SupervisorEvaluateKpiRequest $request,
        Team $current_team,
        KpiEntry $kpiEntry
    ): RedirectResponse {
        Gate::authorize('reviewEvaluationAsSupervisor', $kpiEntry);

        $wasCompleted = $kpiEntry->evaluation_status === 'completed';

        $this->evaluation->supervisorApprove(
            $kpiEntry,
            $request->user(),
            $request->validated('supervisor_rating'),
            $request->validated('comment')
        );

        if ($wasCompleted) {
            return to_route('kpi.evaluation.review-show', [
                'current_team' => $current_team,
                'kpiEntry' => $kpiEntry,
            ])->with('success', 'KPI moderation score updated successfully.');
        }

        $next = KpiEntry::query()
            ->where('kpi_cycle_id', $kpiEntry->kpi_cycle_id)
            ->where('user_id', $kpiEntry->user_id)
            ->where('evaluation_status', 'self_submitted')
            ->orderBy('title')
            ->first();

        if ($next) {
            return to_route('kpi.evaluation.review-show', [
                'current_team' => $current_team,
                'kpiEntry' => $next,
            ])->with('success', 'KPI evaluation approved. Review remaining KPIs for this staff member.');
        }

        return to_route('kpi.evaluation.review-queue', ['current_team' => $current_team])
            ->with('success', 'All KPI evaluations for this staff member are complete.');
    }

    public function returnAsSupervisor(
        SupervisorEvaluateKpiRequest $request,
        Team $current_team,
        KpiEntry $kpiEntry
    ): RedirectResponse {
        Gate::authorize('reviewEvaluationAsSupervisor', $kpiEntry);

        $this->evaluation->supervisorReturn(
            $kpiEntry,
            $request->user(),
            $request->validated('comment')
        );

        return to_route('kpi.evaluation.review-queue', ['current_team' => $current_team])
            ->with('success', 'Evaluation returned to staff member.');
    }
}
