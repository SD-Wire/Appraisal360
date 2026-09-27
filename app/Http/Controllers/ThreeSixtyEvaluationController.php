<?php

namespace App\Http\Controllers;

use App\Models\CoreValue;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\ThreeSixtyEvaluationRating;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ThreeSixtyEvaluationController extends Controller
{
    /**
     * List all 360° evaluation assignments for the authenticated user (current active cycle).
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // 1. Fetch all open/active cycles
        $activeCycles = ThreeSixtyCycle::where('status', 'open')
            ->orderByDesc('period_start')
            ->get();

        // If no open cycles, check fallback cycles where the user has evaluations
        if ($activeCycles->isEmpty()) {
            $availableCycles = ThreeSixtyCycle::whereHas('evaluations', fn($q) => $q->where('evaluator_id', $user->id))
                ->orderByDesc('period_start')
                ->limit(5)
                ->get();
        } else {
            $availableCycles = $activeCycles;
        }

        // 2. Compute evaluation assignment statistics for each available cycle
        $evaluationCounts = ThreeSixtyEvaluation::where('evaluator_id', $user->id)
            ->whereIn('three_sixty_cycle_id', $availableCycles->pluck('id'))
            ->select('three_sixty_cycle_id', 'status', DB::raw('count(*) as count'))
            ->groupBy('three_sixty_cycle_id', 'status')
            ->get()
            ->groupBy('three_sixty_cycle_id')
            ->map(function ($rows) {
                return [
                    'total'     => (int) $rows->sum('count'),
                    'completed' => (int) $rows->where('status', 'completed')->sum('count'),
                    'pending'   => (int) $rows->where('status', 'pending')->sum('count'),
                ];
            });

        // 3. Determine selected cycle
        $selectedCycleId = $request->query('cycle_id');
        $cycle = null;
        if ($selectedCycleId) {
            $cycle = $availableCycles->firstWhere('id', (int) $selectedCycleId);
        }

        if (! $cycle) {
            // Prefer an active cycle where the staff has pending evaluations
            $cycle = $availableCycles->first(function ($c) use ($evaluationCounts) {
                $counts = $evaluationCounts->get($c->id);
                return $counts && $counts['pending'] > 0;
            }) ?? $availableCycles->first();
        }

        $assignments = [];
        $stats       = ['total' => 0, 'completed' => 0, 'pending' => 0];

        if ($cycle) {
            $rows = ThreeSixtyEvaluation::where('evaluator_id', $user->id)
                ->where('three_sixty_cycle_id', $cycle->id)
                ->with([
                    'evaluatee:id,name,email,job_title,department_id,current_team_id',
                    'evaluatee.department:id,name,code',
                    'evaluatee.currentTeam:id,name,type',
                ])
                ->orderBy('relationship_type')
                ->get();

            $stats['total']     = $rows->count();
            $stats['completed'] = $rows->where('status', 'completed')->count();
            $stats['pending']   = $rows->where('status', 'pending')->count();

            $assignments = $rows->map(fn ($e) => [
                'id'                => $e->id,
                'relationship_type' => $e->relationship_type,
                'status'            => $e->status,
                'score'             => $e->score !== null ? (float) $e->score : null,
                'submitted_at'      => $e->submitted_at?->toDateTimeString(),
                'evaluatee'         => [
                    'id'        => $e->evaluatee->id,
                    'name'      => $e->evaluatee->name,
                    'email'     => $e->evaluatee->email,
                    'job_title' => $e->evaluatee->job_title,
                    'dept_name' => $e->evaluatee->department?->name,
                    'team_name' => $e->evaluatee->currentTeam?->name,
                ],
            ])->values();
        }

        $activeCyclesData = $availableCycles->map(function ($c) use ($evaluationCounts) {
            $counts = $evaluationCounts->get($c->id) ?? ['total' => 0, 'completed' => 0, 'pending' => 0];

            return [
                'id'                    => $c->id,
                'name'                  => $c->name,
                'period_start'          => $c->period_start->toDateString(),
                'period_end'            => $c->period_end->toDateString(),
                'evaluation_deadline'   => $c->evaluation_deadline->toDateString(),
                'status'                => $c->status,
                'days_remaining'        => max(0, now()->startOfDay()->diffInDays($c->evaluation_deadline->startOfDay(), false)),
                'total_assignments'     => $counts['total'],
                'completed_assignments' => $counts['completed'],
                'pending_assignments'   => $counts['pending'],
            ];
        })->values();

        return Inertia::render('three-sixty/MyEvaluations', [
            'cycle'        => $cycle ? [
                'id'                  => $cycle->id,
                'name'                => $cycle->name,
                'period_start'        => $cycle->period_start->toDateString(),
                'period_end'          => $cycle->period_end->toDateString(),
                'evaluation_deadline' => $cycle->evaluation_deadline->toDateString(),
                'status'              => $cycle->status,
                'days_remaining'      => max(0, now()->startOfDay()->diffInDays($cycle->evaluation_deadline->startOfDay(), false)),
            ] : null,
            'activeCycles' => $activeCyclesData,
            'assignments'  => $assignments,
            'stats'        => $stats,
        ]);
    }

    /**
     * Display a specific 360 evaluation form for the authenticated user to fill out.
     */
    public function show(Request $request, Team $current_team, ThreeSixtyEvaluation $evaluation): Response
    {
        $user = $request->user();

        // Ensure current user is the evaluator
        if ($evaluation->evaluator_id !== $user->id) {
            abort(403, 'You are not authorized to access this evaluation.');
        }

        $evaluation->load([
            'cycle',
            'evaluatee:id,name,email,job_title,department_id,current_team_id',
            'evaluatee.department:id,name,code',
            'evaluatee.currentTeam:id,name,type',
            'ratings',
        ]);

        $coreValues = CoreValue::where('is_active', true)
            ->with(['questions' => fn($q) => $q->where('is_active', true)->orderBy('order')])
            ->orderBy('order')
            ->get();

        // Key existing ratings by core_value_question_id for easy form prepopulation
        $existingRatings = $evaluation->ratings->keyBy('core_value_question_id');

        return Inertia::render('three-sixty/Evaluate', [
            'evaluation'      => $evaluation,
            'coreValues'      => $coreValues,
            'existingRatings' => $existingRatings,
        ]);
    }

    /**
     * Save ratings (draft or finalized submission) for a 360 evaluation.
     */
    public function submit(Request $request, Team $current_team, ThreeSixtyEvaluation $evaluation): RedirectResponse
    {
        $user = $request->user();

        if ($evaluation->evaluator_id !== $user->id) {
            abort(403, 'You are not authorized to submit this evaluation.');
        }

        if ($evaluation->status === 'completed') {
            return redirect()->back()->withErrors(['error' => 'This evaluation has already been completed and locked.']);
        }

        $validated = $request->validate([
            'ratings'                   => ['required', 'array'],
            'core_value_comments'       => ['nullable', 'array'],
            'core_value_comments.*'     => ['nullable', 'string', 'max:2000'],
            'ratings.*.question_id'     => ['required', 'exists:core_value_questions,id'],
            'ratings.*.core_value_id'   => ['required', 'exists:core_values,id'],
            'ratings.*.score'           => ['required', 'integer', 'min:1', 'max:5'],
            'ratings.*.comment'         => ['nullable', 'string', 'max:1000'],
            'feedback_summary'          => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($evaluation, $validated) {
            $totalScore = 0;
            $count = 0;

            foreach ($validated['ratings'] as $item) {
                ThreeSixtyEvaluationRating::updateOrCreate(
                    [
                        'three_sixty_evaluation_id' => $evaluation->id,
                        'core_value_question_id'    => $item['question_id'],
                    ],
                    [
                        'core_value_id' => $item['core_value_id'],
                        'score'         => $item['score'],
                        'comment'       => $item['comment'] ?? null,
                    ]
                );

                $totalScore += $item['score'];
                $count++;
            }

            $avgScore = $count > 0 ? round($totalScore / $count, 2) : null;

            $updateData = [
                'status'           => 'completed',
                'score'            => $avgScore,
                'feedback_summary' => $validated['feedback_summary'] ?? null,
                'submitted_at'     => now(),
            ];

            // Persist supervisor comments per core value (supervisor_to_subordinate only)
            if ($evaluation->relationship_type === 'supervisor_to_subordinate'
                && !empty($validated['core_value_comments'])) {
                $updateData['core_value_comments'] = $validated['core_value_comments'];
            }

            $evaluation->update($updateData);
        });

        return redirect()->route('three-sixty.evaluations.index', [
            'current_team' => $current_team,
            'cycle_id'     => $evaluation->three_sixty_cycle_id,
        ])
            ->with('success', "360° appraisal for {$evaluation->evaluatee->name} submitted and locked successfully.");
    }

    /**
     * Save progress / draft ratings and return later.
     */
    public function saveDraft(Request $request, Team $current_team, ThreeSixtyEvaluation $evaluation): RedirectResponse
    {
        $user = $request->user();

        if ($evaluation->evaluator_id !== $user->id) {
            abort(403, 'You are not authorized to update this evaluation.');
        }

        if ($evaluation->status === 'completed') {
            return redirect()->back()->withErrors(['error' => 'This evaluation has already been completed and locked.']);
        }

        $validated = $request->validate([
            'ratings'                 => ['nullable', 'array'],
            'core_value_comments'     => ['nullable', 'array'],
            'core_value_comments.*'   => ['nullable', 'string', 'max:2000'],
            'ratings.*.question_id'   => ['required', 'exists:core_value_questions,id'],
            'ratings.*.core_value_id' => ['required', 'exists:core_values,id'],
            'ratings.*.score'         => ['nullable', 'integer', 'min:0', 'max:5'],
            'ratings.*.comment'       => ['nullable', 'string', 'max:1000'],
            'feedback_summary'        => ['nullable', 'string', 'max:2000'],
        ]);

        DB::transaction(function () use ($evaluation, $validated) {
            if (!empty($validated['ratings'])) {
                foreach ($validated['ratings'] as $item) {
                    $score = !empty($item['score']) && $item['score'] >= 1 && $item['score'] <= 5 ? (int) $item['score'] : null;
                    $comment = !empty($item['comment']) ? trim($item['comment']) : null;

                    if ($score !== null || $comment !== null) {
                        ThreeSixtyEvaluationRating::updateOrCreate(
                            [
                                'three_sixty_evaluation_id' => $evaluation->id,
                                'core_value_question_id'    => $item['question_id'],
                            ],
                            [
                                'core_value_id' => $item['core_value_id'],
                                'score'         => $score,
                                'comment'       => $comment,
                            ]
                        );
                    }
                }
            }

            $draftData = [
                'status'           => 'in_progress',
                'feedback_summary' => $validated['feedback_summary'] ?? $evaluation->feedback_summary,
            ];

            if ($evaluation->relationship_type === 'supervisor_to_subordinate'
                && !empty($validated['core_value_comments'])) {
                $draftData['core_value_comments'] = $validated['core_value_comments'];
            }

            $evaluation->update($draftData);
        });

        return redirect()->route('three-sixty.evaluations.index', [
            'current_team' => $current_team,
            'cycle_id'     => $evaluation->three_sixty_cycle_id,
        ])
            ->with('success', "Progress saved for {$evaluation->evaluatee->name}. You can return and complete this appraisal anytime before the deadline.");
    }
}
