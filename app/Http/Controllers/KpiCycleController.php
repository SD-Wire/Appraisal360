<?php

namespace App\Http\Controllers;

use App\Models\KpiCycle;
use App\Models\Team;
use App\Services\KpiEvaluationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KpiCycleController extends Controller
{
    public function __construct(
        private readonly KpiEvaluationService $evaluation
    ) {}

    public function index(Team $current_team): Response
    {
        $cycles = KpiCycle::orderByDesc('period_start')->get([
            'id',
            'name',
            'period_start',
            'period_end',
            'submission_deadline',
            'evaluation_deadline',
            'status',
            'phase',
        ]);

        return Inertia::render('Kpi/AppraisalCycles', [
            'cycles' => $cycles,
        ]);
    }

    public function store(Request $request, Team $current_team): RedirectResponse
    {
        $data = $this->validated($request);

        // New cycles always start as drafts. Status only ever moves
        // forward via open()/close() so the "one open cycle" rule
        // lives in a single place instead of being re-checked here too.
        KpiCycle::create([...$data, 'status' => 'draft']);

        return back()->with('success', "Created \"{$data['name']}\".");
    }

    public function update(Request $request, Team $current_team, KpiCycle $kpiCycle): RedirectResponse
    {
        abort_if($kpiCycle->status !== 'draft', 422, 'Only draft cycles can be edited.');

        $kpiCycle->update($this->validated($request));

        return back()->with('success', "Updated \"{$kpiCycle->name}\".");
    }

    public function destroy(Team $current_team, KpiCycle $kpiCycle): RedirectResponse
    {
        abort_if($kpiCycle->status !== 'draft', 422, 'Only draft cycles can be deleted.');

        $kpiCycle->delete();

        return back()->with('success', 'Cycle deleted.');
    }

    public function open(Team $current_team, KpiCycle $kpiCycle): RedirectResponse
    {
        abort_if($kpiCycle->status !== 'draft', 422, 'Only draft cycles can be opened.');

        // Enforce a single open cycle at a time: opening this one
        // closes whatever else is currently open.
        KpiCycle::where('status', 'open')->update(['status' => 'closed']);
        $kpiCycle->update(['status' => 'open']);

        return back()->with('success', "\"{$kpiCycle->name}\" is now open for submissions.");
    }

    public function close(Team $current_team, KpiCycle $kpiCycle): RedirectResponse
    {
        abort_if($kpiCycle->status !== 'open', 422, 'Only open cycles can be closed.');

        $kpiCycle->update(['status' => 'closed']);

        return back()->with('success', "\"{$kpiCycle->name}\" has been closed.");
    }

    public function startEvaluation(Team $current_team, KpiCycle $kpiCycle): RedirectResponse
    {
        abort_if($kpiCycle->status !== 'open', 422, 'Only open cycles can enter evaluation phase.');
        abort_if($kpiCycle->phase === 'evaluation', 422, 'This cycle is already in evaluation phase.');

        $this->evaluation->startEvaluationPhase($kpiCycle);

        return back()->with('success', "\"{$kpiCycle->name}\" is now open for KPI self-evaluation.");
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after:period_start'],
            'submission_deadline' => ['required', 'date', 'after_or_equal:period_start'],
            'evaluation_deadline' => ['nullable', 'date', 'after_or_equal:period_end'],
        ]);
    }
}
