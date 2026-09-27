<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\KpiCycle;
use App\Models\Region;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\ThreeSixtyRelationshipRule;
use App\Models\User;
use App\Services\ThreeSixtyAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ThreeSixtySetupController extends Controller
{
    public function __construct(
        private readonly ThreeSixtyAssignmentService $assignmentService
    ) {}

    public function index(): Response
    {
        $cycles = ThreeSixtyCycle::with(['rules', 'kpiCycle'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($cycle) => [
                'id'                  => $cycle->id,
                'name'                => $cycle->name,
                'kpi_cycle_id'        => $cycle->kpi_cycle_id,
                'kpi_cycle_name'      => $cycle->kpiCycle?->name,
                'period_start'        => $cycle->period_start?->toDateString(),
                'period_end'          => $cycle->period_end?->toDateString(),
                'evaluation_deadline' => $cycle->evaluation_deadline?->toDateString(),
                'status'              => $cycle->status,
                'description'         => $cycle->description,
                'rules_count'         => $cycle->rules->count(),
                'active_rules_count'  => $cycle->rules->where('is_active', true)->count(),
                'evaluations_count'   => ThreeSixtyEvaluation::where('three_sixty_cycle_id', $cycle->id)->count(),
                'completed_count'     => ThreeSixtyEvaluation::where('three_sixty_cycle_id', $cycle->id)->where('status', 'completed')->count(),
                'rules'               => $cycle->rules->map(fn($r) => [
                    'id'            => $r->id,
                    'name'          => $r->name,
                    'rule_type'     => $r->rule_type,
                    'source_ids'    => $r->source_ids,
                    'target_ids'    => $r->target_ids,
                    'direction'     => $r->direction,
                    'include_peers' => $r->include_peers,
                    'is_active'     => $r->is_active,
                ]),
            ]);

        $kpiCycles   = KpiCycle::orderByDesc('created_at')->get(['id', 'name', 'status']);
        $branches    = Team::where('type', 'branch')->orderBy('name')->get(['id', 'name']);
        $departments = Department::orderBy('name')->get(['id', 'name', 'code']);
        $regions     = \App\Models\Region::orderBy('name')->get(['id', 'name', 'code']);

        $activeCycle = ThreeSixtyCycle::where('status', 'open')->first();
        $stats = [
            'total_cycles'       => $cycles->count(),
            'open_cycles'        => $cycles->where('status', 'open')->count(),
            'total_evaluations'  => ThreeSixtyEvaluation::count(),
            'completed_evals'    => ThreeSixtyEvaluation::where('status', 'completed')->count(),
        ];

        $users = User::with(['currentTeam:id,name', 'department:id,name'])
            ->orderBy('name')
            ->get()
            ->reject(fn(User $u) => $u->isSuperAdmin())
            ->map(fn(User $u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'job_title'     => $u->job_title,
                'employee_no'   => $u->employee_no,
                'branch_id'     => $u->current_team_id,
                'branch'        => $u->currentTeam?->name,
                'department_id' => $u->department_id,
                'department'    => $u->department?->name,
            ])
            ->values();

        return Inertia::render('three-sixty/Index', [
            'cycles'      => $cycles,
            'kpiCycles'   => $kpiCycles,
            'branches'    => $branches,
            'departments' => $departments,
            'regions'     => $regions,
            'users'       => $users,
            'stats'       => $stats,
            'ruleTypes'   => ThreeSixtyRelationshipRule::RULE_TYPES,
            'directions'  => ThreeSixtyRelationshipRule::DIRECTIONS,
        ]);
    }

    // ─────────────────────────────────────
    // Cycles
    // ─────────────────────────────────────

    public function storeCycle(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'                => ['required', 'string', 'max:255'],
            'kpi_cycle_id'        => ['nullable', 'exists:kpi_cycles,id'],
            'period_start'        => ['required', 'date'],
            'period_end'          => ['required', 'date', 'after_or_equal:period_start'],
            'evaluation_deadline' => ['required', 'date', 'after_or_equal:period_start'],
            'description'         => ['nullable', 'string'],
        ]);

        ThreeSixtyCycle::create($validated);

        return redirect()->back()->with('success', '360° appraisal cycle created successfully.');
    }

    public function updateCycle(Request $request, ThreeSixtyCycle $cycle): RedirectResponse
    {
        $validated = $request->validate([
            'name'                => ['required', 'string', 'max:255'],
            'kpi_cycle_id'        => ['nullable', 'exists:kpi_cycles,id'],
            'period_start'        => ['required', 'date'],
            'period_end'          => ['required', 'date', 'after_or_equal:period_start'],
            'evaluation_deadline' => ['required', 'date', 'after_or_equal:period_start'],
            'description'         => ['nullable', 'string'],
        ]);

        $cycle->update($validated);

        return redirect()->back()->with('success', 'Cycle updated successfully.');
    }

    public function destroyCycle(ThreeSixtyCycle $cycle): RedirectResponse
    {
        if ($cycle->status === 'open') {
            return redirect()->back()->withErrors(['error' => 'Cannot delete an open cycle. Close it first.']);
        }

        $cycle->delete();

        return redirect()->back()->with('success', 'Cycle deleted successfully.');
    }

    public function openCycle(ThreeSixtyCycle $cycle): RedirectResponse
    {
        // Close any currently open cycle first
        ThreeSixtyCycle::where('status', 'open')->update(['status' => 'closed']);

        $cycle->update(['status' => 'open']);

        return redirect()->back()->with('success', "Cycle '{$cycle->name}' is now open for evaluations.");
    }

    public function closeCycle(ThreeSixtyCycle $cycle): RedirectResponse
    {
        $cycle->update(['status' => 'closed']);

        return redirect()->back()->with('success', "Cycle '{$cycle->name}' has been closed.");
    }

    // ─────────────────────────────────────
    // Relationship Rules
    // ─────────────────────────────────────

    public function storeRule(Request $request, ThreeSixtyCycle $cycle): RedirectResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'rule_type'     => ['required', 'in:' . implode(',', ThreeSixtyRelationshipRule::RULE_TYPES)],
            'source_ids'    => ['nullable', 'array'],
            'source_ids.*'  => ['integer'],
            'target_ids'    => ['nullable', 'array'],
            'target_ids.*'  => ['integer'],
            'direction'     => ['required', 'in:' . implode(',', ThreeSixtyRelationshipRule::DIRECTIONS)],
            'include_peers' => ['boolean'],
            'is_active'     => ['boolean'],
        ]);

        if ($request->input('rule_type') === 'individual_staff') {
            $request->validate([
                'target_ids'   => ['required', 'array', 'min:1'],
                'target_ids.*' => ['integer', 'exists:users,id'],
                'source_ids'   => ['required', 'array', 'min:1'],
                'source_ids.*' => ['integer', 'exists:users,id'],
            ], [
                'target_ids.required' => 'Please select the staff member to be appraised.',
                'target_ids.min'      => 'Please select the staff member to be appraised.',
                'source_ids.required' => 'Please select at least one appraiser / evaluator.',
                'source_ids.min'      => 'Please select at least one appraiser / evaluator.',
            ]);
        }

        $validated['three_sixty_cycle_id'] = $cycle->id;

        ThreeSixtyRelationshipRule::create($validated);

        return redirect()->back()->with('success', 'Relationship rule added successfully.');
    }

    public function updateRule(Request $request, ThreeSixtyRelationshipRule $rule): RedirectResponse
    {
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'rule_type'     => ['required', 'in:' . implode(',', ThreeSixtyRelationshipRule::RULE_TYPES)],
            'source_ids'    => ['nullable', 'array'],
            'source_ids.*'  => ['integer'],
            'target_ids'    => ['nullable', 'array'],
            'target_ids.*'  => ['integer'],
            'direction'     => ['required', 'in:' . implode(',', ThreeSixtyRelationshipRule::DIRECTIONS)],
            'include_peers' => ['boolean'],
            'is_active'     => ['boolean'],
        ]);

        if ($request->input('rule_type') === 'individual_staff') {
            $request->validate([
                'target_ids'   => ['required', 'array', 'min:1'],
                'target_ids.*' => ['integer', 'exists:users,id'],
                'source_ids'   => ['required', 'array', 'min:1'],
                'source_ids.*' => ['integer', 'exists:users,id'],
            ], [
                'target_ids.required' => 'Please select the staff member to be appraised.',
                'target_ids.min'      => 'Please select the staff member to be appraised.',
                'source_ids.required' => 'Please select at least one appraiser / evaluator.',
                'source_ids.min'      => 'Please select at least one appraiser / evaluator.',
            ]);
        }

        $rule->update($validated);

        return redirect()->back()->with('success', 'Rule updated successfully.');
    }

    public function destroyRule(ThreeSixtyRelationshipRule $rule): RedirectResponse
    {
        $rule->delete();

        return redirect()->back()->with('success', 'Rule deleted successfully.');
    }

    // ─────────────────────────────────────
    // Generate Evaluations
    // ─────────────────────────────────────

    public function generateEvaluations(ThreeSixtyCycle $cycle): RedirectResponse
    {
        if ($cycle->status !== 'open') {
            return redirect()->back()->withErrors(['error' => 'Evaluations can only be generated for open cycles.']);
        }

        $result = $this->assignmentService->generateForCycle($cycle);

        return redirect()->back()->with('success',
            "Generated {$result['created']} new evaluations ({$result['skipped']} skipped, {$result['rules_processed']} rules processed)."
        );
    }
}
