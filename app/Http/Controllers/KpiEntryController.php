<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReviewKpiEntryRequest;
use App\Http\Requests\StoreKpiEntryRequest;
use App\Http\Requests\UpdateKpiEntryRequest;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\Team;
use App\Services\KpiWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class KpiEntryController extends Controller
{
    public function __construct(
        private readonly KpiWorkflowService $workflow
    ) {}

    public function index(Request $request): Response
    {
        $cycle = KpiCycle::where('status', 'open')->latest('period_start')->first();

        $entries = $request
            ->user()
            ->kpiEntries()
            ->with([
                'logs' => fn($q) => $q->with('actor:id,name,email,job_title')->orderByDesc('created_at'),
            ])
            ->when($cycle, fn($q) => $q->where('kpi_cycle_id', $cycle->id))
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Kpi/MyEntries', compact('cycle', 'entries'));
    }

    public function create(Request $request): Response|RedirectResponse
    {
        $team = $request->route('current_team');
        $cycle = KpiCycle::where('status', 'open')->latest('period_start')->firstOrFail();

        $existingWeight = (int) $request->user()->kpiEntries()
            ->where('kpi_cycle_id', $cycle->id)
            ->sum('weight');

        if ($existingWeight >= 100) {
            return to_route('kpi.index', ['current_team' => $team])
                ->with('error', 'Your KPI weight allocation for this cycle has already reached 100%. Please adjust existing weights before creating a new KPI.');
        }

        return Inertia::render('Kpi/Form', ['cycle' => $cycle, 'entry' => null]);
    }

    public function store(StoreKpiEntryRequest $request): RedirectResponse
    {
        $team = $request->route('current_team');
        $cycle = KpiCycle::findOrFail($request->validated('kpi_cycle_id'));

        $kpiEntry = $request->user()->kpiEntries()->create([
            ...$request->validated(),
            'team_id' => $team->id,
            'department_id' => $request->user()->department_id ?? $team?->department_id,
            'status' => 'draft',
        ]);

        return to_route('kpi.index', ['current_team' => $team])
            ->with('success', 'KPI saved as draft.');
    }

    public function show(Team $current_team, KpiEntry $kpiEntry): Response
    {
        Gate::authorize('view', $kpiEntry);

        $kpiEntry->load([
            'cycle',
            'team',
            'department',
            'user.department',
            'logs' => fn($q) => $q->with('actor:id,name,email,job_title')->orderByDesc('created_at'),
        ]);

        return Inertia::render('Kpi/Show', [
            'entry' => $kpiEntry,
        ]);
    }

    public function edit(Team $current_team, KpiEntry $kpiEntry): Response
    {
        Gate::authorize('update', $kpiEntry);

        $kpiEntry->load([
            'cycle',
            'logs' => fn($q) => $q->with('actor:id,name,email,job_title')->orderByDesc('created_at'),
        ]);

        return Inertia::render('Kpi/Form', ['cycle' => $kpiEntry->cycle, 'entry' => $kpiEntry]);
    }

    public function update(UpdateKpiEntryRequest $request, Team $current_team, KpiEntry $kpiEntry): RedirectResponse
    {
        Gate::authorize('update', $kpiEntry);
        $kpiEntry->update($request->validated());

        return to_route('kpi.index', ['current_team' => $current_team])->with('success', 'KPI updated.');
    }

    public function submit(Team $current_team, KpiEntry $kpiEntry): RedirectResponse
    {
        Gate::authorize('update', $kpiEntry);
        $this->workflow->submit($kpiEntry);

        return to_route('kpi.index', ['current_team' => $current_team])->with('success', 'KPI submitted for review.');
    }

    public function reviewQueue(Request $request): Response
    {
        $user = $request->user();

        $entries = KpiEntry::query()
            ->with([
                'user.department',
                'cycle',
                'logs' => fn($q) => $q->with('actor')->orderByDesc('created_at'),
            ])
            ->where(function ($q) use ($user) {
                $q->where(function ($sub) use ($user) {
                    $sub->whereIn('status', ['submitted', 'hr_returned'])
                        ->where('current_approver_id', $user->id);
                })->orWhere(function ($sub) use ($user) {
                    $sub->where('status', 'supervisor_returned')
                        ->where(function ($s) use ($user) {
                            $s->where('current_approver_id', $user->id)
                                ->orWhereHas('user', fn($u) => $u->where('supervisor_id', $user->id));
                        });
                });
            })
            ->orWhere(function ($q) use ($user) {
                $q->whereIn('status', ['supervisor_approved', 'hr_returned'])
                    ->whereHas('team.region.hrbps', fn($h) => $h->where('users.id', $user->id));
            })
            ->orderByRaw("CASE 
                WHEN status = 'hr_returned' THEN 1 
                WHEN status = 'submitted' THEN 2 
                WHEN status = 'supervisor_approved' THEN 3 
                WHEN status = 'supervisor_returned' THEN 4
                ELSE 5 
            END")
            ->orderByDesc('updated_at')
            ->get();

        return Inertia::render('Kpi/ReviewQueue', compact('entries'));
    }

    public function reviewShow(Team $current_team, KpiEntry $kpiEntry): Response
    {
        $kpiEntry->load([
            'user.department',
            'cycle',
            'logs' => fn($q) => $q->with('actor')->orderByDesc('created_at'),
        ]);

        return Inertia::render('Kpi/ReviewDetail', [
            'entry' => $kpiEntry,
            'canReviewAsSupervisor' => Gate::allows('reviewAsSupervisor', $kpiEntry),
            'canReviewAsHr' => Gate::allows('reviewAsHr', $kpiEntry),
        ]);
    }

    public function approveAsSupervisor(ReviewKpiEntryRequest $request, Team $current_team, KpiEntry $kpiEntry): RedirectResponse
    {
        Gate::authorize('reviewAsSupervisor', $kpiEntry);
        $this->workflow->supervisorApprove($kpiEntry, $request->user(), $request->validated('comment'));

        return to_route('kpi.review-queue', ['current_team' => $current_team])->with('success', 'Approved and forwarded to HR.');
    }

    public function returnAsSupervisor(ReviewKpiEntryRequest $request, Team $current_team, KpiEntry $kpiEntry): RedirectResponse
    {
        Gate::authorize('reviewAsSupervisor', $kpiEntry);
        $this->workflow->supervisorReturn($kpiEntry, $request->user(), $request->validated('comment'));

        return to_route('kpi.review-queue', ['current_team' => $current_team])->with('success', 'Returned to staff member.');
    }

    public function approveAsHr(ReviewKpiEntryRequest $request, Team $current_team, KpiEntry $kpiEntry): RedirectResponse
    {
        Gate::authorize('reviewAsHr', $kpiEntry);
        $this->workflow->hrApprove($kpiEntry, $request->user(), $request->validated('comment'));

        return to_route('kpi.review-queue', ['current_team' => $current_team])->with('success', 'KPI finalized.');
    }

    public function returnAsHr(ReviewKpiEntryRequest $request, Team $current_team, KpiEntry $kpiEntry): RedirectResponse
    {
        Gate::authorize('reviewAsHr', $kpiEntry);
        $this->workflow->hrReturn($kpiEntry, $request->user(), $request->validated('comment'));

        return to_route('kpi.review-queue', ['current_team' => $current_team])->with('success', 'Returned to supervisor.');
    }
}
