<?php

namespace App\Services;

use App\Models\KpiCycle;
use App\Models\KpiEntry;
use App\Models\ThreeSixtyCycle;
use App\Models\ThreeSixtyEvaluation;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class KpiEvaluationService
{
    public function startEvaluationPhase(KpiCycle $cycle): void
    {
        if ($cycle->phase === 'evaluation') {
            return;
        }

        DB::transaction(function () use ($cycle) {
            $cycle->update(['phase' => 'evaluation']);

            KpiEntry::query()
                ->where('kpi_cycle_id', $cycle->id)
                ->where('status', 'hr_approved')
                ->whereNull('evaluation_status')
                ->update(['evaluation_status' => 'pending']);
        });
    }

    public function saveSelfScore(KpiEntry $entry, array $data): KpiEntry
    {
        $entry->update([
            'self_rating' => $data['self_rating'],
            'actual_result' => $data['actual_result'] ?? null,
            'self_comment' => $data['self_comment'] ?? null,
        ]);

        return $entry->fresh();
    }

    public function submitSelfEvaluation(User $user, KpiCycle $cycle): Collection
    {
        $entries = KpiEntry::query()
            ->where('kpi_cycle_id', $cycle->id)
            ->where('user_id', $user->id)
            ->where('status', 'hr_approved')
            ->whereIn('evaluation_status', ['pending', 'supervisor_returned'])
            ->get();

        if ($entries->isEmpty()) {
            throw new \RuntimeException('No KPIs are ready for evaluation submission.');
        }

        $incomplete = $entries->filter(
            fn (KpiEntry $e) => $e->self_rating === null || blank($e->actual_result) || blank($e->self_comment)
        );

        if ($incomplete->isNotEmpty()) {
            throw new \RuntimeException(
                'All KPIs must have a self-rating, actual result, and comment before submitting.'
            );
        }

        $supervisor = $user->resolveSupervisorForKpi();

        if (! $supervisor) {
            throw new \RuntimeException('No supervisor is assigned. Contact HR before submitting your evaluation.');
        }

        return DB::transaction(function () use ($entries, $supervisor, $user) {
            foreach ($entries as $entry) {
                $entry->update([
                    'evaluation_status' => 'self_submitted',
                    'current_approver_id' => $supervisor?->id,
                    'evaluation_submitted_at' => now(),
                ]);

                $entry->logs()->create([
                    'actor_id' => $user->id,
                    'stage' => 'evaluation',
                    'action' => 'self_submitted',
                    'comment' => $entry->self_comment,
                ]);
            }

            return $entries->fresh();
        });
    }

    public function supervisorApprove(
        KpiEntry $entry,
        User $actor,
        int $supervisorRating,
        ?string $comment = null
    ): KpiEntry {
        return DB::transaction(function () use ($entry, $actor, $supervisorRating, $comment) {
            $entry->update([
                'supervisor_rating' => $supervisorRating,
                'supervisor_comment' => $comment,
                'evaluation_status' => 'completed',
                'current_approver_id' => null,
            ]);

            $entry->logs()->create([
                'actor_id' => $actor->id,
                'stage' => 'evaluation',
                'action' => 'supervisor_approved',
                'comment' => $comment,
            ]);

            return $entry;
        });
    }

    public function supervisorReturn(KpiEntry $entry, User $actor, string $comment): KpiEntry
    {
        return DB::transaction(function () use ($entry, $actor, $comment) {
            $entry->update([
                'evaluation_status' => 'supervisor_returned',
                'current_approver_id' => $entry->user_id,
                'supervisor_rating' => null,
                'supervisor_comment' => $comment,
            ]);

            $entry->logs()->create([
                'actor_id' => $actor->id,
                'stage' => 'evaluation',
                'action' => 'supervisor_returned',
                'comment' => $comment,
            ]);

            return $entry;
        });
    }

    /**
     * Compute weighted KPI score from supervisor ratings (falls back to self-rating).
     */
    public static function computeWeightedScore(Collection $entries): ?float
    {
        $scored = $entries->filter(fn (KpiEntry $e) => $e->supervisor_rating ?? $e->self_rating);

        if ($scored->isEmpty()) {
            return null;
        }

        $totalWeight = $scored->sum('weight');

        if ($totalWeight === 0) {
            return null;
        }

        $weightedSum = $scored->sum(
            fn (KpiEntry $e) => ($e->supervisor_rating ?? $e->self_rating) * $e->weight
        );

        return round($weightedSum / $totalWeight, 2);
    }

    /**
     * Average 360° score for this user in the 360 cycle linked to the KPI cycle.
     * Combined with {@see computeWeightedScore} when overall performance is calculated.
     */
    public static function threeSixtyAverageForUser(User $user, KpiCycle $cycle): ?float
    {
        $tsCycle = ThreeSixtyCycle::query()
            ->where('kpi_cycle_id', $cycle->id)
            ->first();

        if (! $tsCycle) {
            return null;
        }

        $avg = ThreeSixtyEvaluation::query()
            ->where('three_sixty_cycle_id', $tsCycle->id)
            ->where('evaluatee_id', $user->id)
            ->where('status', 'completed')
            ->whereNotNull('score')
            ->avg('score');

        return $avg !== null ? round((float) $avg, 2) : null;
    }
}
