<?php

namespace App\Services;

use App\Models\CoreValue;
use App\Models\Department;
use App\Models\KpiAppraisalComment;
use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\Team;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class PerformanceReportService
{
    /**
     * Individual performance per core value question (average score + supervisor comment).
     */
    public static function individualCoreValueReport(int $userId, int $cycleId): array
    {
        $evaluations = ThreeSixtyEvaluation::where('evaluatee_id', $userId)
            ->where('three_sixty_cycle_id', $cycleId)
            ->where('status', 'completed')
            ->with(['ratings', 'evaluator:id,name'])
            ->get();

        $coreValues = CoreValue::where('is_active', true)
            ->with(['questions' => fn($q) => $q->where('is_active', true)->orderBy('order')])
            ->orderBy('order')
            ->get();

        $report = [];

        foreach ($coreValues as $cv) {
            $cvData = [
                'id'                 => $cv->id,
                'name'               => $cv->name,
                'weight'             => $cv->weight,
                'questions'          => [],
                'avg_score'          => null,
                'supervisor_comment' => null,
            ];

            $cvScores = [];

            foreach ($cv->questions as $question) {
                $questionScores = $evaluations->flatMap(fn($e) => $e->ratings)
                    ->where('core_value_question_id', $question->id)
                    ->whereNotNull('score')
                    ->pluck('score');

                $avg = $questionScores->isNotEmpty()
                    ? round($questionScores->avg(), 2)
                    : null;

                $cvData['questions'][] = [
                    'id'          => $question->id,
                    'question'    => $question->question,
                    'weight'      => $question->weight,
                    'avg_score'   => $avg,
                    'respondents' => $questionScores->count(),
                ];

                if ($avg !== null) {
                    $cvScores[] = $avg;
                }
            }

            $cvData['avg_score'] = count($cvScores) > 0
                ? round(array_sum($cvScores) / count($cvScores), 2)
                : null;

            $supervisorEval = $evaluations
                ->where('relationship_type', 'supervisor_to_subordinate')
                ->first();

            if ($supervisorEval && !empty($supervisorEval->core_value_comments)) {
                $cvData['supervisor_comment'] = $supervisorEval->core_value_comments[$cv->id] ?? null;
            }

            $report[] = $cvData;
        }

        return $report;
    }

    /**
     * Org-wide core value ranking.
     */
    public static function orgCoreValueRanking(int $cycleId): array
    {
        $coreValues = CoreValue::where('is_active', true)
            ->with(['questions' => fn($q) => $q->where('is_active', true)])
            ->orderBy('order')
            ->get();

        $ranking = [];

        foreach ($coreValues as $cv) {
            $questionIds = $cv->questions->pluck('id');

            $avgScore = DB::table('three_sixty_evaluation_ratings as r')
                ->join('three_sixty_evaluations as e', 'r.three_sixty_evaluation_id', '=', 'e.id')
                ->where('e.three_sixty_cycle_id', $cycleId)
                ->where('e.status', 'completed')
                ->whereIn('r.core_value_question_id', $questionIds)
                ->whereNotNull('r.score')
                ->avg('r.score');

            $respondents = DB::table('three_sixty_evaluation_ratings as r')
                ->join('three_sixty_evaluations as e', 'r.three_sixty_evaluation_id', '=', 'e.id')
                ->where('e.three_sixty_cycle_id', $cycleId)
                ->where('e.status', 'completed')
                ->whereIn('r.core_value_question_id', $questionIds)
                ->whereNotNull('r.score')
                ->distinct('e.evaluatee_id')
                ->count('e.evaluatee_id');

            $ranking[] = [
                'id'          => $cv->id,
                'name'        => $cv->name,
                'weight'      => $cv->weight,
                'avg_score'   => $avgScore !== null ? round((float) $avgScore, 2) : null,
                'respondents' => $respondents,
            ];
        }

        usort($ranking, fn($a, $b) => ($b['avg_score'] ?? 0) <=> ($a['avg_score'] ?? 0));

        return $ranking;
    }

    /**
     * KPI performance report for a single user in a cycle.
     */
    public static function individualKpiReport(int $userId, int $cycleId): array
    {
        $entries = KpiEntry::where('user_id', $userId)
            ->where('kpi_cycle_id', $cycleId)
            ->whereNotNull('evaluation_status')
            ->orderBy('title')
            ->get();

        $totalWeight = $entries->sum('weight');

        return $entries->map(function (KpiEntry $entry) use ($totalWeight) {
            $selfScore       = $entry->self_rating;
            $supervisorScore = $entry->supervisor_rating;
            $effectiveScore  = $supervisorScore ?? $selfScore;
            $weightedScore   = ($totalWeight > 0 && $effectiveScore !== null)
                ? round(($effectiveScore / 5) * ($entry->weight / $totalWeight) * 100, 2)
                : null;

            return [
                'id'                 => $entry->id,
                'title'              => $entry->title,
                'description'        => $entry->description,
                'target'             => $entry->target,
                'actual_result'      => $entry->actual_result,
                'weight'             => $entry->weight,
                'self_rating'        => $selfScore,
                'self_comment'       => $entry->self_comment,
                'supervisor_rating'  => $supervisorScore,
                'supervisor_comment' => $entry->supervisor_comment,
                'evaluation_status'  => $entry->evaluation_status,
                'weighted_score'     => $weightedScore,
            ];
        })->values()->all();
    }

    /**
     * Summary per unit/branch/department.
     */
    public static function unitSummary(
        int $kpiCycleId,
        int $threeSixtyCycleId,
        float $kpiWeight = 70,
        float $threeSixtyWeight = 30
    ): array
    {
        $teamIds = KpiEntry::where('kpi_cycle_id', $kpiCycleId)
            ->whereNotNull('team_id')
            ->distinct()
            ->pluck('team_id');

        $summary = [];

        foreach ($teamIds as $teamId) {
            $team = Team::find($teamId);
            if (!$team) {
                continue;
            }

            $userIds = KpiEntry::where('kpi_cycle_id', $kpiCycleId)
                ->where('team_id', $teamId)
                ->distinct()
                ->pluck('user_id');

            $memberCount = $userIds->count();
            $kpiScores   = [];

            foreach ($userIds as $uid) {
                $entries     = KpiEntry::where('user_id', $uid)
                    ->where('kpi_cycle_id', $kpiCycleId)
                    ->whereNotNull('evaluation_status')
                    ->get();
                $totalWeight = $entries->sum('weight');
                if ($totalWeight <= 0) {
                    continue;
                }
                $weighted = 0;
                foreach ($entries as $e) {
                    $score = $e->supervisor_rating ?? $e->self_rating;
                    if ($score !== null) {
                        $weighted += ($score / 5) * ($e->weight / $totalWeight) * 100;
                    }
                }
                $kpiScores[] = round($weighted, 2);
            }

            $avgKpiScore = count($kpiScores) > 0
                ? round(array_sum($kpiScores) / count($kpiScores), 2)
                : null;

            $threeSixtyScores = ThreeSixtyEvaluation::where('three_sixty_cycle_id', $threeSixtyCycleId)
                ->whereIn('evaluatee_id', $userIds)
                ->where('status', 'completed')
                ->whereNotNull('score')
                ->pluck('score');

            $avg360 = $threeSixtyScores->isNotEmpty()
                ? round($threeSixtyScores->avg(), 2)
                : null;

            $combined = null;
            if ($avgKpiScore !== null && $avg360 !== null) {
                $threeSixtyPercent = ($avg360 / 5) * 100;
                $totalRatio = $kpiWeight + $threeSixtyWeight;
                $combined = round(
                    (($avgKpiScore * $kpiWeight) + ($threeSixtyPercent * $threeSixtyWeight)) / ($totalRatio > 0 ? $totalRatio : 100),
                    2
                );
            } elseif ($avgKpiScore !== null) {
                $combined = $avgKpiScore;
            } elseif ($avg360 !== null) {
                $combined = round(($avg360 / 5) * 100, 2);
            }

            $summary[] = [
                'team_id'        => $teamId,
                'team_name'      => $team->name,
                'team_type'      => $team->type ?? null,
                'member_count'   => $memberCount,
                'avg_kpi_score'  => $avgKpiScore,
                'avg_360_score'  => $avg360,
                'combined_score' => $combined,
            ];
        }

        usort($summary, fn($a, $b) => ($b['combined_score'] ?? 0) <=> ($a['combined_score'] ?? 0));

        return $summary;
    }

    /**
     * Excel-like Detailed 360 Individual Report.
     */
    public static function detailedIndividual360Report(int $userId, int $cycleId): array
    {
        $targetUser = \App\Models\User::find($userId);
        if (!$targetUser) return [];

        $coreValues = CoreValue::where('is_active', true)
            ->with(['questions' => fn($q) => $q->where('is_active', true)->orderBy('order')])
            ->orderBy('order')
            ->get();

        // Get all ratings in this cycle to calculate org averages and rankings
        $allRatings = DB::table('three_sixty_evaluation_ratings as r')
            ->join('three_sixty_evaluations as e', 'r.three_sixty_evaluation_id', '=', 'e.id')
            ->where('e.three_sixty_cycle_id', $cycleId)
            ->where('e.status', 'completed')
            ->whereNotNull('r.score')
            ->select('e.evaluatee_id', 'r.core_value_question_id', 'r.score')
            ->get();

        // Calculate overall weighted score for each evaluatee to determine ranking among ranked staff
        $uniqueEvaluateeIds = $allRatings->pluck('evaluatee_id')->unique();
        $totalStaffRanked = $uniqueEvaluateeIds->count();
        $evaluateeScores = [];

        foreach ($uniqueEvaluateeIds as $empId) {
            $empWeighted = 0;
            $empCvCount = 0;
            foreach ($coreValues as $cv) {
                $qIds = $cv->questions->pluck('id');
                $ratingsForCv = $allRatings->where('evaluatee_id', $empId)->whereIn('core_value_question_id', $qIds);
                if ($ratingsForCv->isNotEmpty()) {
                    $avgCv = $ratingsForCv->avg('score');
                    $empWeighted += ($avgCv * ($cv->weight / 100));
                    $empCvCount++;
                }
            }
            if ($empCvCount > 0) {
                $evaluateeScores[$empId] = round($empWeighted, 4);
            }
        }

        arsort($evaluateeScores);
        $overallRank = null;
        if (isset($evaluateeScores[$userId])) {
            $currentRank = 1;
            foreach ($evaluateeScores as $empId => $score) {
                if ($empId == $userId) {
                    $overallRank = $currentRank;
                    break;
                }
                $currentRank++;
            }
        }

        // User's supervisor evaluation to get comments
        $supervisorEval = ThreeSixtyEvaluation::where('evaluatee_id', $userId)
            ->where('three_sixty_cycle_id', $cycleId)
            ->where('relationship_type', 'supervisor_to_subordinate')
            ->where('status', 'completed')
            ->first();

        // Staff's comments on their 360 appraisal (including audit logs)
        $staffCommentRecord = \App\Models\ThreeSixtyStaffAppraisalComment::with(['logs.actor'])
            ->where('three_sixty_cycle_id', $cycleId)
            ->where('user_id', $userId)
            ->first();
        $paramComments = $staffCommentRecord?->parameter_comments ?? [];

        $report = [];
        $totalParametersScore = 0;
        $totalParametersPeer = 0;
        
        $totalUnweightedCoreValuesScore = 0;
        $totalUnweightedCoreValuesPeer = 0;
        $coreValueCount = 0;

        $weightedCoreValuesScore = 0;
        $weightedCoreValuesPeer = 0;

        foreach ($coreValues as $cvIndex => $cv) {
            $sectionData = [
                'section_name' => "Section " . ($cvIndex + 1),
                'core_value_name' => $cv->name,
                'weight' => $cv->weight,
                'questions' => [],
                'section_actual_score' => null,
                'section_peer_average' => null,
            ];

            $cvScores = [];
            $cvPeerScores = [];

            foreach ($cv->questions as $qIndex => $question) {
                $qRatings = $allRatings->where('core_value_question_id', $question->id);
                $evalAverages = [];
                
                foreach ($qRatings->groupBy('evaluatee_id') as $empId => $ratings) {
                    $evalAverages[$empId] = $ratings->avg('score');
                }

                $actualScore = $evalAverages[$userId] ?? null;
                $peerAverage = count($evalAverages) > 0 ? collect($evalAverages)->avg() : null;
                
                $ranking = null;
                if ($actualScore !== null) {
                    arsort($evalAverages);
                    $rank = 1;
                    foreach ($evalAverages as $empId => $avg) {
                        if ($empId == $userId) {
                            $ranking = $rank;
                            break;
                        }
                        $rank++;
                    }
                }

                $diversion = ($actualScore !== null && $peerAverage !== null) 
                    ? $actualScore - $peerAverage 
                    : null;
                
                $statisticalComment = null;
                if ($diversion !== null) {
                    if ($diversion < -0.25) $statisticalComment = '-0.25 average - Pls address issue';
                    elseif ($diversion < -0.1) $statisticalComment = 'Below average';
                    elseif ($diversion < 0.25) $statisticalComment = 'Average';
                    elseif ($diversion < 0.4) $statisticalComment = 'Above Average';
                    else $statisticalComment = 'Far above average - Keep up';
                }

                $sectionData['questions'][] = [
                    'id'                  => $question->id,
                    'number'              => ($cvIndex + 1) . '.' . ($qIndex + 1),
                    'parameter'           => $question->name ?? '', // Use name if exists, else blank
                    'parameter_detail'    => $question->question,
                    'actual_score'        => $actualScore !== null ? round($actualScore, 2) : null,
                    'ranking'             => $ranking,
                    'peer_average'        => $peerAverage !== null ? round($peerAverage, 2) : null,
                    'diversion'           => $diversion !== null ? round($diversion, 2) : null,
                    'statistical_comment' => $statisticalComment,
                    'staff_comment'       => $paramComments[$question->id] ?? $paramComments[(string) $question->id] ?? '', 
                ];

                if ($actualScore !== null) {
                    $cvScores[] = $actualScore;
                    $totalParametersScore += $actualScore;
                }
                if ($peerAverage !== null) {
                    $cvPeerScores[] = $peerAverage;
                    $totalParametersPeer += $peerAverage;
                }
            }

            $sectionData['section_actual_score'] = count($cvScores) > 0 ? array_sum($cvScores) / count($cvScores) : null;
            $sectionData['section_peer_average'] = count($cvPeerScores) > 0 ? array_sum($cvPeerScores) / count($cvPeerScores) : null;
            
            $sectionData['section_diversion'] = ($sectionData['section_actual_score'] !== null && $sectionData['section_peer_average'] !== null)
                ? $sectionData['section_actual_score'] - $sectionData['section_peer_average']
                : null;
            
            $sectionData['section_statistical_comment'] = null;
            if ($sectionData['section_diversion'] !== null) {
                $div = $sectionData['section_diversion'];
                if ($div < -0.25) $sectionData['section_statistical_comment'] = '-0.25 average - Pls address issue';
                elseif ($div < -0.1) $sectionData['section_statistical_comment'] = 'Below average';
                elseif ($div < 0.25) $sectionData['section_statistical_comment'] = 'Average';
                elseif ($div < 0.4) $sectionData['section_statistical_comment'] = 'Above Average';
                else $sectionData['section_statistical_comment'] = 'Far above average - Keep up';
            }

            if ($sectionData['section_actual_score'] !== null) {
                $totalUnweightedCoreValuesScore += $sectionData['section_actual_score'];
                $weightedCoreValuesScore += ($sectionData['section_actual_score'] * ($cv->weight / 100));
                $coreValueCount++;
            }
            if ($sectionData['section_peer_average'] !== null) {
                $totalUnweightedCoreValuesPeer += $sectionData['section_peer_average'];
                $weightedCoreValuesPeer += ($sectionData['section_peer_average'] * ($cv->weight / 100));
            }

            $report[] = $sectionData;
        }

        $totalDiv = $totalParametersScore - $totalParametersPeer;
        $unweightedDiv = ($coreValueCount > 0 ? ($totalUnweightedCoreValuesScore / $coreValueCount) : 0) - ($coreValueCount > 0 ? ($totalUnweightedCoreValuesPeer / $coreValueCount) : 0);
        $weightedDiv = $weightedCoreValuesScore - $weightedCoreValuesPeer;

        $getStatComment = function($div) {
            if ($div === null) return null;
            if ($div < -0.25) return '-0.25 average - Pls address issue';
            if ($div < -0.1) return 'Below average';
            if ($div < 0.25) return 'Average';
            if ($div < 0.4) return 'Above Average';
            return 'Far above average - Keep up';
        };

        // Format audit logs for staff comments
        $auditLogs = [];
        if ($staffCommentRecord && $staffCommentRecord->relationLoaded('logs')) {
            foreach ($staffCommentRecord->logs as $log) {
                $auditLogs[] = [
                    'id'         => $log->id,
                    'actor_name' => $log->actor?->name ?? 'Authorized User',
                    'actor_role' => $log->actor_role ?? 'System',
                    'action'     => $log->action,
                    'details'    => $log->details,
                    'created_at' => $log->created_at?->format('d M Y, H:i'),
                ];
            }
        }

        // Resolve staff, supervisor, and regional HRBP for report footer sign-off
        $staff = $targetUser;
        $supervisor = $staff->supervisor ?? $staff->resolveSupervisorForKpi();

        $team = ($staff->currentTeam && ! $staff->currentTeam->is_personal)
            ? $staff->currentTeam
            : ($staff->teams()->where('is_personal', false)->first() ?? $staff->currentTeam);

        $teamName = ($team && ! $team->is_personal) ? $team->name : ($staff->department?->name ?? 'Head Office');
        $region = $team?->region;
        $regionalHrbp = $region?->hrbps()->first();
        if (! $regionalHrbp) {
            $regionalHrbp = User::whereHas('roles', fn($q) => $q->where('name', 'HR Business Partner'))->first();
        }

        $cycle = ThreeSixtyCycle::find($cycleId);
        $isSubmitted = $staffCommentRecord && $staffCommentRecord->status === 'submitted';

        $signOff = [
            'staff' => [
                'name'         => $staff->name,
                'employee_no'  => $staff->employee_no ?? '—',
                'job_title'    => $staff->job_title ?? 'Staff Member',
                'department'   => $staff->department?->name ?? '—',
                'branch'       => $teamName,
                'team'         => $teamName,
                'is_signed'    => $isSubmitted,
                'signed_at'    => $isSubmitted ? ($staffCommentRecord->submitted_at?->format('d M Y, H:i') ?? date('d M Y, H:i')) : null,
            ],
            'supervisor' => [
                'name'         => $supervisor?->name ?? 'Immediate Supervisor',
                'employee_no'  => $supervisor?->employee_no ?? '—',
                'job_title'    => $supervisor?->job_title ?? 'Supervisor',
                'is_signed'    => $isSubmitted,
                'signed_at'    => $isSubmitted ? ($staffCommentRecord->submitted_at?->format('d M Y') ?? date('d M Y')) : null,
            ],
            'hrbp' => [
                'name'         => $regionalHrbp?->name ?? 'Regional HR Business Partner',
                'employee_no'  => $regionalHrbp?->employee_no ?? '—',
                'job_title'    => $regionalHrbp?->job_title ?? 'HR Business Partner',
                'region_name'  => $region?->name ?? ($teamName ?? 'Head Office / Corporate'),
                'is_presigned' => true,
                'presigned_at' => $cycle?->period_end ? \Carbon\Carbon::parse($cycle->period_end)->format('d M Y') : date('d M Y'),
                'stamp_code'   => 'HRBP-PRESIGN-' . strtoupper(substr(md5(($region?->id ?? 1) . '-' . $cycleId . '-' . ($regionalHrbp?->id ?? 1)), 0, 8)),
            ],
        ];

        return [
            'user' => [
                'id'              => $targetUser->id,
                'name'            => $targetUser->name,
                'job_title'       => $targetUser->job_title,
                'employee_no'     => $targetUser->employee_no,
                'team_name'       => $teamName,
                'department_name' => $staff->department?->name ?? null,
                'branch_name'     => $teamName,
            ],
            'total_staff_ranked' => $totalStaffRanked,
            'overall_rank' => $overallRank,
            'sections' => $report,
            'staff_comment' => [
                'has_submitted'      => $isSubmitted,
                'status'             => $staffCommentRecord?->status ?? 'pending',
                'overall_comment'    => $staffCommentRecord?->overall_comment ?? '',
                'parameter_comments' => $paramComments,
                'submitted_at'       => $staffCommentRecord?->submitted_at?->format('d M Y, H:i'),
                'audit_logs'         => $auditLogs,
            ],
            'sign_off' => $signOff,
            'totals' => [
                'total_parameters_score' => round($totalParametersScore, 2),
                'total_parameters_peer' => round($totalParametersPeer, 2),
                'total_parameters_diversion' => round($totalDiv, 2),
                'total_parameters_stat' => $getStatComment($totalDiv),

                'total_unweighted_score' => $coreValueCount > 0 ? round($totalUnweightedCoreValuesScore / $coreValueCount, 2) : 0,
                'total_unweighted_peer' => $coreValueCount > 0 ? round($totalUnweightedCoreValuesPeer / $coreValueCount, 2) : 0,
                'total_unweighted_diversion' => round($unweightedDiv, 2),
                'total_unweighted_stat' => $getStatComment($unweightedDiv),

                'weighted_score' => round($weightedCoreValuesScore, 2),
                'weighted_rank' => $overallRank,
                'weighted_peer' => round($weightedCoreValuesPeer, 2),
                'weighted_diversion' => round($weightedDiv, 2),
                'weighted_stat' => $getStatComment($weightedDiv),
            ]
        ];
    }

    /**
     * Top 5 and Bottom (Last) 5 Ranking of Staff on each Core Value organization-wide.
     */
    public static function topStaffRankingPerCoreValue(int $threeSixtyCycleId, int $limit = 5): array
    {
        $coreValues = CoreValue::where('is_active', true)
            ->with(['questions' => fn($q) => $q->where('is_active', true)])
            ->orderBy('order')
            ->get();

        $results = [];

        foreach ($coreValues as $cv) {
            $questionIds = $cv->questions->pluck('id');

            if ($questionIds->isEmpty()) {
                continue;
            }

            $allStaffScores = DB::table('three_sixty_evaluation_ratings as r')
                ->join('three_sixty_evaluations as e', 'r.three_sixty_evaluation_id', '=', 'e.id')
                ->join('users as u', 'e.evaluatee_id', '=', 'u.id')
                ->leftJoin('departments as d', 'u.department_id', '=', 'd.id')
                ->leftJoin('teams as t', 'u.current_team_id', '=', 't.id')
                ->where('e.three_sixty_cycle_id', $threeSixtyCycleId)
                ->where('e.status', 'completed')
                ->whereIn('r.core_value_question_id', $questionIds)
                ->whereNotNull('r.score')
                ->groupBy('u.id', 'u.name', 'u.employee_no', 'u.job_title', 'd.name', 't.name')
                ->select(
                    'u.id as user_id',
                    'u.name as user_name',
                    'u.employee_no',
                    'u.job_title',
                    'd.name as department_name',
                    't.name as branch_name',
                    DB::raw('ROUND(AVG(r.score), 2) as avg_score'),
                    DB::raw('COUNT(DISTINCT e.id) as review_count')
                )
                ->orderByDesc('avg_score')
                ->get();

            $totalEvaluated = $allStaffScores->count();
            $rankedStaff = [];
            $rank = 1;
            foreach ($allStaffScores as $row) {
                $rankedStaff[] = [
                    'rank'            => $rank++,
                    'user_id'         => $row->user_id,
                    'user_name'       => $row->user_name,
                    'employee_no'     => $row->employee_no,
                    'job_title'       => $row->job_title,
                    'department_name' => $row->department_name ?? '—',
                    'branch_name'     => $row->branch_name ?? '—',
                    'avg_score'       => (float) $row->avg_score,
                    'review_count'    => (int) $row->review_count,
                ];
            }

            $bottomLimit = 3;
            $topStaff = array_slice($rankedStaff, 0, $limit);
            $bottomStaff = [];
            if ($totalEvaluated > 0) {
                $bottomStaff = array_values(array_slice($rankedStaff, -min($bottomLimit, $totalEvaluated)));
            }

            $results[] = [
                'core_value_id'   => $cv->id,
                'core_value_name' => $cv->name,
                'weight'          => $cv->weight,
                'total_staff'     => $totalEvaluated,
                'top_staff'       => $topStaff,
                'bottom_staff'    => $bottomStaff,
            ];
        }

        return $results;
    }

    /**
     * KPI performance report for all members in a branch or department.
     */
    public static function branchDepartmentKpiReport(?int $departmentId, ?int $teamId, int $kpiCycleId, ?int $userId = null): array
    {
        $query = User::query()->whereHas('kpiEntries', function ($q) use ($kpiCycleId) {
            $q->where('kpi_cycle_id', $kpiCycleId);
        });

        if ($userId) {
            $query->where('id', $userId);
        }
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }
        if ($teamId) {
            $query->where('current_team_id', $teamId);
        }

        $users = $query->with([
            'department:id,name',
            'currentTeam:id,name,type',
            'kpiEntries' => fn($q) => $q->where('kpi_cycle_id', $kpiCycleId)->orderBy('title')
        ])->orderBy('name')->get();

        $report = [];

        foreach ($users as $u) {
            $entries = $u->kpiEntries;
            $totalWeight = $entries->sum('weight');
            $kpiCount = $entries->count();

            $selfRatings = $entries->whereNotNull('self_rating')->pluck('self_rating');
            $supRatings = $entries->whereNotNull('supervisor_rating')->pluck('supervisor_rating');

            $avgSelf = $selfRatings->isNotEmpty() ? round($selfRatings->avg(), 2) : null;
            $avgSup = $supRatings->isNotEmpty() ? round($supRatings->avg(), 2) : null;

            $weightedScore = 0;
            if ($totalWeight > 0) {
                foreach ($entries as $e) {
                    $score = $e->supervisor_rating ?? $e->self_rating;
                    if ($score !== null) {
                        $weightedScore += ($score / 5) * ($e->weight / $totalWeight) * 100;
                    }
                }
                $weightedScore = round($weightedScore, 2);
            } else {
                $weightedScore = null;
            }

            $report[] = [
                'user_id'         => $u->id,
                'user_name'       => $u->name,
                'employee_no'     => $u->employee_no,
                'job_title'       => $u->job_title,
                'department_name' => $u->department?->name ?? '—',
                'branch_name'     => $u->currentTeam?->name ?? '—',
                'kpi_count'       => $kpiCount,
                'avg_self_rating' => $avgSelf,
                'avg_sup_rating'  => $avgSup,
                'weighted_score'  => $weightedScore,
                'kpi_entries'     => $entries->map(fn($e) => [
                    'id'                 => $e->id,
                    'title'              => $e->title,
                    'description'        => $e->description,
                    'target'             => $e->target,
                    'actual_result'      => $e->actual_result,
                    'weight'             => $e->weight,
                    'self_rating'        => $e->self_rating,
                    'self_comment'       => $e->self_comment,
                    'supervisor_rating'  => $e->supervisor_rating,
                    'supervisor_comment' => $e->supervisor_comment,
                    'status'             => $e->evaluation_status ?? $e->status,
                    'weighted_score'     => ($totalWeight > 0 && ($e->supervisor_rating ?? $e->self_rating) !== null)
                        ? round(((float)($e->supervisor_rating ?? $e->self_rating) / 5) * ((float)$e->weight / $totalWeight) * 100, 2)
                        : null,
                ])->values()->all(),
                'appraisal_data'  => self::kpiAppraisalData($u->id, $kpiCycleId),
            ];
        }

        return $report;
    }

    /**
     * 360 appraisal breakdown for all members in a branch or department.
     */
    public static function branchDepartment360Report(?int $departmentId, ?int $teamId, int $threeSixtyCycleId, ?int $userId = null): array
    {
        $query = User::query()->whereHas('evaluationsAsEvaluatee', function ($q) use ($threeSixtyCycleId) {
            $q->where('three_sixty_cycle_id', $threeSixtyCycleId)
              ->where('status', 'completed');
        });

        if ($userId) {
            $query->where('id', $userId);
        }
        if ($departmentId) {
            $query->where('department_id', $departmentId);
        }
        if ($teamId) {
            $query->where('current_team_id', $teamId);
        }

        $users = $query->with(['department:id,name', 'currentTeam:id,name'])
            ->orderBy('name')
            ->get();

        $coreValues = CoreValue::where('is_active', true)->with('questions')->orderBy('order')->get();

        $report = [];

        foreach ($users as $u) {
            $evals = ThreeSixtyEvaluation::where('evaluatee_id', $u->id)
                ->where('three_sixty_cycle_id', $threeSixtyCycleId)
                ->where('status', 'completed')
                ->with('ratings')
                ->get();

            $overallScore = $evals->whereNotNull('score')->avg('score');

            $cvBreakdown = [];
            foreach ($coreValues as $cv) {
                $questionIds = $cv->questions->pluck('id');
                $cvScore = $evals->flatMap(fn($e) => $e->ratings)
                    ->whereIn('core_value_question_id', $questionIds)
                    ->whereNotNull('score')
                    ->avg('score');

                $cvBreakdown[] = [
                    'core_value_id'   => $cv->id,
                    'core_value_name' => $cv->name,
                    'weight'          => $cv->weight,
                    'score'           => $cvScore !== null ? round((float)$cvScore, 2) : null,
                ];
            }

            $report[] = [
                'user_id'          => $u->id,
                'user_name'        => $u->name,
                'employee_no'      => $u->employee_no,
                'job_title'        => $u->job_title,
                'department_name'  => $u->department?->name ?? '—',
                'branch_name'      => $u->currentTeam?->name ?? '—',
                'reviews_received' => $evals->count(),
                'overall_score'    => $overallScore !== null ? round((float)$overallScore, 2) : null,
                'overall_percent'  => $overallScore !== null ? round(((float)$overallScore / 5) * 100, 2) : null,
                'core_values'      => $cvBreakdown,
            ];
        }

        return [
            'core_values' => $coreValues->map(fn($cv) => ['id' => $cv->id, 'name' => $cv->name, 'weight' => $cv->weight])->values()->all(),
            'members'     => $report,
        ];
    }

    /**
     * Combined Performance Report (Weighted KPI + 360 Appraisal) per individual or branch/department.
     */
    public static function combinedPerformanceReport(
        ?int $departmentId,
        ?int $teamId,
        ?int $userId,
        int $kpiCycleId,
        int $threeSixtyCycleId,
        float $kpiWeight = 70,
        float $threeSixtyWeight = 30
    ): array {
        $query = User::query();

        if ($userId) {
            $query->where('id', $userId);
        } else {
            if ($departmentId) {
                $query->where('department_id', $departmentId);
            }
            if ($teamId) {
                $query->where('current_team_id', $teamId);
            }
        }

        $users = $query->with(['department:id,name', 'currentTeam:id,name'])
            ->orderBy('name')
            ->get();

        $report = [];

        foreach ($users as $u) {
            // KPI Score
            $kpiEntries = KpiEntry::where('user_id', $u->id)
                ->where('kpi_cycle_id', $kpiCycleId)
                ->get();
            $totalKpiWeight = $kpiEntries->sum('weight');
            $kpiScore = null;
            if ($totalKpiWeight > 0) {
                $weightedSum = 0;
                foreach ($kpiEntries as $entry) {
                    $score = $entry->supervisor_rating ?? $entry->self_rating;
                    if ($score !== null) {
                        $weightedSum += ($score / 5) * ($entry->weight / $totalKpiWeight) * 100;
                    }
                }
                $kpiScore = round($weightedSum, 2);
            }

            // 360 Score
            $threeSixtyScore = ThreeSixtyEvaluation::where('evaluatee_id', $u->id)
                ->where('three_sixty_cycle_id', $threeSixtyCycleId)
                ->where('status', 'completed')
                ->whereNotNull('score')
                ->avg('score');

            $threeSixtyPercent = $threeSixtyScore !== null
                ? round(($threeSixtyScore / 5) * 100, 2)
                : null;

            // Combined Weighted Score
            $combinedScore = null;
            $tier = 'Not Evaluated';

            if ($kpiScore !== null && $threeSixtyPercent !== null) {
                $totalWeightRatio = $kpiWeight + $threeSixtyWeight;
                $combinedScore = round(
                    (($kpiScore * $kpiWeight) + ($threeSixtyPercent * $threeSixtyWeight)) / ($totalWeightRatio > 0 ? $totalWeightRatio : 100),
                    2
                );
            } elseif ($kpiScore !== null) {
                $combinedScore = $kpiScore;
            } elseif ($threeSixtyPercent !== null) {
                $combinedScore = $threeSixtyPercent;
            }

            if ($combinedScore !== null) {
                if ($combinedScore >= 90) {
                    $tier = 'Exceptional (Exceeds All Expectations)';
                } elseif ($combinedScore >= 80) {
                    $tier = 'Very Good (Exceeds Expectations)';
                } elseif ($combinedScore >= 70) {
                    $tier = 'Good (Meets Expectations)';
                } elseif ($combinedScore >= 50) {
                    $tier = 'Average (Needs Improvement)';
                } else {
                    $tier = 'Unsatisfactory (Below Expectation)';
                }
            }

            $report[] = [
                'user_id'             => $u->id,
                'user_name'           => $u->name,
                'employee_no'         => $u->employee_no,
                'job_title'           => $u->job_title,
                'department_name'     => $u->department?->name ?? '—',
                'branch_name'         => $u->currentTeam?->name ?? '—',
                'kpi_score'           => $kpiScore,
                'three_sixty_raw'     => $threeSixtyScore !== null ? round((float)$threeSixtyScore, 2) : null,
                'three_sixty_percent' => $threeSixtyPercent,
                'kpi_weight'          => $kpiWeight,
                'three_sixty_weight'  => $threeSixtyWeight,
                'combined_score'      => $combinedScore,
                'performance_tier'    => $tier,
            ];
        }

        // Sort by combined score descending
        usort($report, fn($a, $b) => ($b['combined_score'] ?? -1) <=> ($a['combined_score'] ?? -1));

        return $report;
    }

    /**
     * Resolve KPI appraisal comments and sign-off metadata for a user in a KPI cycle.
     */
    public static function kpiAppraisalData(int $userId, int $cycleId): array
    {
        $comment = KpiAppraisalComment::where('kpi_cycle_id', $cycleId)
            ->where('user_id', $userId)
            ->first();

        $staff = User::with(['department', 'currentTeam.region', 'teams.region'])->find($userId);
        if (!$staff) {
            return [
                'comment' => null,
                'sign_off' => null,
            ];
        }

        $supervisor = $staff->supervisor ?? $staff->resolveSupervisorForKpi();

        $team = ($staff->currentTeam && ! $staff->currentTeam->is_personal)
            ? $staff->currentTeam
            : ($staff->teams()->where('is_personal', false)->first() ?? $staff->currentTeam);

        $teamName = ($team && ! $team->is_personal) ? $team->name : ($staff->department?->name ?? 'Head Office');
        $region = $team?->region;
        $regionalHrbp = $region?->hrbps()->first();
        if (! $regionalHrbp) {
            try {
                $regionalHrbp = User::role('HR Business Partner')->first();
            } catch (\Throwable) {
                $regionalHrbp = null;
            }
        }

        $signOff = [
            'staff' => [
                'name'         => $staff->name,
                'employee_no'  => $staff->employee_no ?? '—',
                'job_title'    => $staff->job_title ?? 'Staff Member',
                'department'   => $staff->department?->name ?? '—',
                'branch'       => $teamName,
                'team'         => $teamName,
            ],
            'supervisor' => [
                'name'         => $supervisor?->name ?? 'Immediate Supervisor',
                'employee_no'  => $supervisor?->employee_no ?? '—',
                'job_title'    => $supervisor?->job_title ?? 'Supervisor',
            ],
            'hrbp' => [
                'name'         => $regionalHrbp?->name ?? 'Regional HR Business Partner',
                'employee_no'  => $regionalHrbp?->employee_no ?? '—',
                'job_title'    => $regionalHrbp?->job_title ?? 'HR Business Partner',
                'region_name'  => $region?->name ?? ($teamName ?? 'Head Office / Corporate'),
                'stamp_code'   => 'HRBP-KPI-' . strtoupper(substr(md5(($region?->id ?? 1) . '-' . $cycleId . '-' . ($regionalHrbp?->id ?? 1)), 0, 8)),
            ],
        ];

        return [
            'comment' => $comment ? [
                'id'                            => $comment->id,
                'kpi_cycle_id'                  => $comment->kpi_cycle_id,
                'user_id'                       => $comment->user_id,
                'supervisor_positives'          => $comment->supervisor_positives,
                'supervisor_areas_to_improve'   => $comment->supervisor_areas_to_improve,
                'supervisor_concluding_remarks' => $comment->supervisor_concluding_remarks,
                'staff_achievement_reasons'     => $comment->staff_achievement_reasons,
                'staff_future_commitment'       => $comment->staff_future_commitment,
                'staff_training_requests'       => $comment->staff_training_requests,
                'status'                        => $comment->status,
                'staff_submitted_at'            => $comment->staff_submitted_at?->format('d M Y, H:i'),
                'supervisor_submitted_at'       => $comment->supervisor_submitted_at?->format('d M Y, H:i'),
            ] : null,
            'sign_off' => $signOff,
        ];
    }
}
