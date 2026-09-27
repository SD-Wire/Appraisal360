<?php

namespace App\Services;

use App\Models\CoreValue;
use App\Models\Department;
use App\Models\Region;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\ThreeSixtyEvaluationRating;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

class ThreeSixtyFeedbackReportService
{
    public const RELATIONSHIP_LABELS = [
        'supervisor_to_subordinate' => 'Immediate Supervisor',
        'subordinate_to_supervisor' => 'Direct Report',
        'branch_peer'               => 'Branch Peer',
        'department_peer'           => 'Department Peer',
        'cross_department'          => 'Cross-Department Peer',
        'bm_peer'                   => 'Branch Manager Peer',
        'hod_to_bm'                 => 'HOD to Branch Manager',
        'bm_to_hod'                 => 'Branch Manager to HOD',
        'bm_to_support_staff'       => 'Branch Manager to Support Staff',
    ];

    /**
     * Build the paginated 360 Feedback Summary & Core Value Questions Comments report.
     * Evaluator identities are strictly anonymized.
     */
    public static function buildReport(array $filters): array
    {
        $cycleId = ! empty($filters['cycle_id']) ? (int) $filters['cycle_id'] : null;
        $regionId = ! empty($filters['region_id']) ? (int) $filters['region_id'] : null;
        $departmentId = ! empty($filters['department_id']) ? (int) $filters['department_id'] : null;
        $teamId = ! empty($filters['team_id']) ? (int) $filters['team_id'] : null;
        $evaluateeId = ! empty($filters['evaluatee_id']) ? (int) $filters['evaluatee_id'] : null;
        $relationshipType = ! empty($filters['relationship_type']) ? (string) $filters['relationship_type'] : null;
        $search = ! empty($filters['search']) ? trim((string) $filters['search']) : null;
        $onlyWithComments = filter_var($filters['only_with_comments'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $perPage = ! empty($filters['per_page']) ? max(5, min(100, (int) $filters['per_page'])) : 10;
        $page = ! empty($filters['page']) ? (int) $filters['page'] : 1;

        // Active Core Values with questions
        $coreValues = CoreValue::where('is_active', true)
            ->with(['questions' => fn ($q) => $q->where('is_active', true)->orderBy('order')])
            ->orderBy('order')
            ->get();

        if (! $cycleId) {
            return [
                'stats'       => self::emptyStats(),
                'evaluatees'  => new LengthAwarePaginator([], 0, $perPage, 1),
                'core_values' => self::formatCoreValuesMeta($coreValues),
            ];
        }

        // Base query for evaluatees who have completed evaluations in this cycle
        $evaluateesQuery = User::query()
            ->whereHas('evaluationsAsEvaluatee', function ($q) use ($cycleId, $relationshipType) {
                $q->where('three_sixty_cycle_id', $cycleId)
                    ->where('status', 'completed');
                if ($relationshipType) {
                    $q->where('relationship_type', $relationshipType);
                }
            });

        // 1. Filter per individual (evaluatee)
        if ($evaluateeId) {
            $evaluateesQuery->where('id', $evaluateeId);
        }

        // 2. Filter per department
        if ($departmentId) {
            $evaluateesQuery->where('department_id', $departmentId);
        }

        // 3. Filter per branch (team)
        if ($teamId) {
            $evaluateesQuery->where('current_team_id', $teamId);
        }

        // 4. Filter per region (via evaluatee's current branch/team)
        if ($regionId) {
            $evaluateesQuery->whereHas('currentTeam', fn ($q) => $q->where('region_id', $regionId));
        }

        // 5. Keyword search (evaluatee name, employee_no, job_title)
        if ($search) {
            $evaluateesQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('employee_no', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%");
            });
        }

        // 6. Only with comments toggle
        if ($onlyWithComments) {
            $evaluateesQuery->whereHas('evaluationsAsEvaluatee', function ($q) use ($cycleId, $relationshipType) {
                $q->where('three_sixty_cycle_id', $cycleId)
                    ->where('status', 'completed');
                if ($relationshipType) {
                    $q->where('relationship_type', $relationshipType);
                }
                $q->where(function ($sq) {
                    $sq->whereNotNull('feedback_summary')
                        ->where('feedback_summary', '!=', '')
                        ->orWhereNotNull('core_value_comments')
                        ->orWhereHas('ratings', fn ($rq) => $rq->whereNotNull('comment')->where('comment', '!=', ''));
                });
            });
        }

        // Calculate overall stats across all matching evaluatees
        $matchingEvaluateeIds = (clone $evaluateesQuery)->pluck('id');
        $stats = self::computeStats($matchingEvaluateeIds, $cycleId, $relationshipType);

        // Paginate evaluatees list to accommodate large enterprise datasets
        $paginatedUsers = $evaluateesQuery
            ->with([
                'department:id,name',
                'currentTeam:id,name,type,region_id',
                'currentTeam.region:id,name',
            ])
            ->orderBy('name')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Load evaluations for the users on the CURRENT page only (performant & memory safe)
        $currentPageUserIds = $paginatedUsers->pluck('id');

        $evaluations = ThreeSixtyEvaluation::where('three_sixty_cycle_id', $cycleId)
            ->whereIn('evaluatee_id', $currentPageUserIds)
            ->where('status', 'completed')
            ->when($relationshipType, fn ($q) => $q->where('relationship_type', $relationshipType))
            ->with([
                'ratings' => fn ($q) => $q->with('question:id,core_value_id,question,description,weight,order'),
            ])
            ->orderBy('submitted_at', 'asc')
            ->get();

        // Format each evaluatee with ANONYMIZED reviewers and structured Core Values + Questions
        $formattedItems = $paginatedUsers->getCollection()->map(function (User $user) use ($evaluations, $coreValues) {
            $userEvals = $evaluations->where('evaluatee_id', $user->id)->values();

            return self::formatSingleEvaluatee($user, $userEvals, $coreValues);
        });

        $paginatedUsers->setCollection($formattedItems);

        return [
            'stats'       => $stats,
            'evaluatees'  => $paginatedUsers,
            'core_values' => self::formatCoreValuesMeta($coreValues),
        ];
    }

    /**
     * Format a single evaluatee with anonymous reviewers.
     * Evaluator names, emails, and user IDs are completely excluded.
     */
    public static function formatSingleEvaluatee(User $user, $userEvals, $coreValues): array
    {
        // Build anonymous reviewer mapping for this evaluatee
        // e.g. "Reviewer 1 (Immediate Supervisor)", "Reviewer 2 (Branch Peer)"
        $reviewerMap = [];
        $reviewerIndex = 1;
        $reviewersSummary = [];

        foreach ($userEvals as $eval) {
            $relLabel = self::RELATIONSHIP_LABELS[$eval->relationship_type]
                ?? ucwords(str_replace('_', ' ', $eval->relationship_type));

            $reviewerMap[$eval->id] = [
                'label'              => "Reviewer {$reviewerIndex} ({$relLabel})",
                'relationship_type'  => $eval->relationship_type,
                'relationship_label' => $relLabel,
            ];
            $reviewerIndex++;

            $reviewersSummary[$relLabel] = ($reviewersSummary[$relLabel] ?? 0) + 1;
        }

        // 1. Overall Qualitative Feedback Summaries
        $feedbackSummaries = [];
        foreach ($userEvals as $eval) {
            $summaryText = trim($eval->feedback_summary ?? '');
            if ($summaryText !== '') {
                $reviewer = $reviewerMap[$eval->id];
                $feedbackSummaries[] = [
                    'evaluation_id'      => $eval->id,
                    'reviewer_label'     => $reviewer['label'],
                    'relationship_type'  => $reviewer['relationship_type'],
                    'relationship_label' => $reviewer['relationship_label'],
                    'score'              => $eval->score !== null ? (float) $eval->score : null,
                    'feedback_summary'   => $summaryText,
                    'submitted_at'       => $eval->submitted_at?->format('d M Y'),
                ];
            }
        }

        // 2. Core Values and Question Comments
        $coreValuesData = [];
        $totalCommentsOnEvaluatee = count($feedbackSummaries);

        foreach ($coreValues as $cv) {
            $cvQuestions = [];
            $cvSupervisorComments = [];

            // A. Supervisory comments for this core value (from supervisor_to_subordinate evaluation)
            foreach ($userEvals as $eval) {
                if ($eval->relationship_type === 'supervisor_to_subordinate' && ! empty($eval->core_value_comments)) {
                    $comments = is_array($eval->core_value_comments) ? $eval->core_value_comments : [];
                    $commentText = trim($comments[$cv->id] ?? $comments[(string) $cv->id] ?? '');
                    if ($commentText !== '') {
                        $totalCommentsOnEvaluatee++;
                        $cvSupervisorComments[] = [
                            'reviewer_label' => 'Immediate Supervisor',
                            'comment'        => $commentText,
                            'submitted_at'   => $eval->submitted_at?->format('d M Y'),
                        ];
                    }
                }
            }

            // B. Each question under this core value with its scores and comments
            foreach ($cv->questions as $question) {
                $qRatings = $userEvals->flatMap(fn ($e) => $e->ratings)
                    ->where('core_value_question_id', $question->id);

                $scores = $qRatings->whereNotNull('score')->pluck('score');
                $avgScore = $scores->isNotEmpty() ? round($scores->avg(), 2) : null;
                $responseCount = $scores->count();

                $qComments = [];
                foreach ($qRatings as $rating) {
                    $commentText = trim($rating->comment ?? '');
                    if ($commentText !== '') {
                        $totalCommentsOnEvaluatee++;
                        $reviewer = $reviewerMap[$rating->three_sixty_evaluation_id] ?? [
                            'label'              => 'Anonymous Reviewer',
                            'relationship_label' => 'Colleague',
                        ];

                        $qComments[] = [
                            'reviewer_label'     => $reviewer['label'],
                            'relationship_label' => $reviewer['relationship_label'],
                            'score'              => (int) $rating->score,
                            'comment'            => $commentText,
                            'submitted_at'       => $rating->created_at?->format('d M Y'),
                        ];
                    }
                }

                $cvQuestions[] = [
                    'id'             => $question->id,
                    'question'       => $question->question,
                    'description'    => $question->description,
                    'weight'         => $question->weight,
                    'order'          => $question->order,
                    'response_count' => $responseCount,
                    'avg_score'      => $avgScore,
                    'comments'       => $qComments,
                ];
            }

            $coreValuesData[] = [
                'id'                  => $cv->id,
                'name'                => $cv->name,
                'description'         => $cv->description,
                'weight'              => $cv->weight,
                'supervisor_comments' => $cvSupervisorComments,
                'questions'           => $cvQuestions,
            ];
        }

        $overallScore = $userEvals->whereNotNull('score')->avg('score');

        return [
            'user' => [
                'id'          => $user->id,
                'name'        => $user->name,
                'employee_no' => $user->employee_no ?? '—',
                'job_title'   => $user->job_title ?? '—',
                'department'  => $user->department?->name ?? '—',
                'branch'      => $user->currentTeam?->name ?? '—',
                'region'      => $user->currentTeam?->region?->name ?? '—',
            ],
            'evaluations_count'   => $userEvals->count(),
            'reviewers_summary'   => $reviewersSummary,
            'overall_score'       => $overallScore !== null ? round((float) $overallScore, 2) : null,
            'has_comments'        => $totalCommentsOnEvaluatee > 0,
            'feedback_summaries'  => $feedbackSummaries,
            'core_values'         => $coreValuesData,
        ];
    }

    /**
     * Fetch all records matching the filter for Excel/PDF export (anonymized).
     */
    public static function getAllForExport(array $filters): array
    {
        $cycleId = ! empty($filters['cycle_id']) ? (int) $filters['cycle_id'] : null;
        $regionId = ! empty($filters['region_id']) ? (int) $filters['region_id'] : null;
        $departmentId = ! empty($filters['department_id']) ? (int) $filters['department_id'] : null;
        $teamId = ! empty($filters['team_id']) ? (int) $filters['team_id'] : null;
        $evaluateeId = ! empty($filters['evaluatee_id']) ? (int) $filters['evaluatee_id'] : null;
        $relationshipType = ! empty($filters['relationship_type']) ? (string) $filters['relationship_type'] : null;
        $search = ! empty($filters['search']) ? trim((string) $filters['search']) : null;
        $onlyWithComments = filter_var($filters['only_with_comments'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $coreValues = CoreValue::where('is_active', true)
            ->with(['questions' => fn ($q) => $q->where('is_active', true)->orderBy('order')])
            ->orderBy('order')
            ->get();

        if (! $cycleId) {
            return [];
        }

        $query = User::query()
            ->whereHas('evaluationsAsEvaluatee', function ($q) use ($cycleId, $relationshipType) {
                $q->where('three_sixty_cycle_id', $cycleId)
                    ->where('status', 'completed');
                if ($relationshipType) {
                    $q->where('relationship_type', $relationshipType);
                }
            });

        if ($evaluateeId) {
            $query->where('id', $evaluateeId);
        }
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }
        if ($teamId) {
            $query->where('current_team_id', $teamId);
        }
        if ($regionId) {
            $query->whereHas('currentTeam', fn ($q) => $q->where('region_id', $regionId));
        }
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('employee_no', 'like', "%{$search}%")
                    ->orWhere('job_title', 'like', "%{$search}%");
            });
        }
        if ($onlyWithComments) {
            $query->whereHas('evaluationsAsEvaluatee', function ($q) use ($cycleId, $relationshipType) {
                $q->where('three_sixty_cycle_id', $cycleId)
                    ->where('status', 'completed');
                if ($relationshipType) {
                    $q->where('relationship_type', $relationshipType);
                }
                $q->where(function ($sq) {
                    $sq->whereNotNull('feedback_summary')
                        ->where('feedback_summary', '!=', '')
                        ->orWhereNotNull('core_value_comments')
                        ->orWhereHas('ratings', fn ($rq) => $rq->whereNotNull('comment')->where('comment', '!=', ''));
                });
            });
        }

        $users = $query->with([
            'department:id,name',
            'currentTeam:id,name,type,region_id',
            'currentTeam.region:id,name',
        ])->orderBy('name')->get();

        $userIds = $users->pluck('id');

        $evaluations = ThreeSixtyEvaluation::where('three_sixty_cycle_id', $cycleId)
            ->whereIn('evaluatee_id', $userIds)
            ->where('status', 'completed')
            ->when($relationshipType, fn ($q) => $q->where('relationship_type', $relationshipType))
            ->with([
                'ratings' => fn ($q) => $q->with('question:id,core_value_id,question,description,weight,order'),
            ])
            ->orderBy('submitted_at', 'asc')
            ->get();

        return $users->map(fn (User $u) => self::formatSingleEvaluatee($u, $evaluations->where('evaluatee_id', $u->id)->values(), $coreValues))->values()->all();
    }

    private static function computeStats($evaluateeIds, int $cycleId, ?string $relationshipType): array
    {
        if ($evaluateeIds->isEmpty()) {
            return self::emptyStats();
        }

        $evalsBase = ThreeSixtyEvaluation::where('three_sixty_cycle_id', $cycleId)
            ->whereIn('evaluatee_id', $evaluateeIds)
            ->where('status', 'completed')
            ->when($relationshipType, fn ($q) => $q->where('relationship_type', $relationshipType));

        $totalEvaluations = (clone $evalsBase)->count();
        $totalFeedbackSummaries = (clone $evalsBase)
            ->whereNotNull('feedback_summary')
            ->where('feedback_summary', '!=', '')
            ->count();

        $avgScore = (clone $evalsBase)->whereNotNull('score')->avg('score');

        $evalIds = (clone $evalsBase)->pluck('id');

        $totalQuestionComments = ThreeSixtyEvaluationRating::whereIn('three_sixty_evaluation_id', $evalIds)
            ->whereNotNull('comment')
            ->where('comment', '!=', '')
            ->count();

        $totalCoreValueComments = 0;
        $evalsWithCv = (clone $evalsBase)->whereNotNull('core_value_comments')->get(['core_value_comments']);
        foreach ($evalsWithCv as $e) {
            if (is_array($e->core_value_comments)) {
                foreach ($e->core_value_comments as $c) {
                    if (trim((string) $c) !== '') {
                        $totalCoreValueComments++;
                    }
                }
            }
        }

        return [
            'total_evaluatees_reviewed' => $evaluateeIds->count(),
            'total_evaluations'         => $totalEvaluations,
            'total_feedback_summaries'  => $totalFeedbackSummaries,
            'total_core_value_comments' => $totalCoreValueComments,
            'total_question_comments'   => $totalQuestionComments,
            'avg_360_score'             => $avgScore !== null ? round((float) $avgScore, 2) : null,
        ];
    }

    private static function formatCoreValuesMeta($coreValues): array
    {
        return $coreValues->map(fn ($cv) => [
            'id'          => $cv->id,
            'name'        => $cv->name,
            'description' => $cv->description,
            'weight'      => $cv->weight,
            'questions'   => $cv->questions->map(fn ($q) => [
                'id'          => $q->id,
                'question'    => $q->question,
                'description' => $q->description,
                'weight'      => $q->weight,
                'order'       => $q->order,
            ])->values()->all(),
        ])->values()->all();
    }

    private static function emptyStats(): array
    {
        return [
            'total_evaluatees_reviewed' => 0,
            'total_evaluations'         => 0,
            'total_feedback_summaries'  => 0,
            'total_core_value_comments' => 0,
            'total_question_comments'   => 0,
            'avg_360_score'             => null,
        ];
    }
}
