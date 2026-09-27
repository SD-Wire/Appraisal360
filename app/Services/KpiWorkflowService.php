<?php

namespace App\Services;

use App\Models\KpiEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class KpiWorkflowService
{
    public function submit(KpiEntry $entry): KpiEntry
    {
        $supervisor = $entry->user->resolveSupervisorForKpi();

        if (($entry->user->hasRole('HOD') || $entry->user->hasRole('Branch Manager')) && !$supervisor) {
            throw new \RuntimeException("{$entry->user->name} has no supervisor assigned — cannot route KPI for review.");
        }

        return DB::transaction(function () use ($entry, $supervisor) {
            $entry->update([
                'status' => 'submitted',
                'current_approver_id' => $supervisor?->id,
                'submitted_at' => now(),
            ]);

            $entry->logs()->create([
                'actor_id' => $entry->user_id,
                'stage' => 'supervisor',
                'action' => 'submitted',
            ]);

            return $entry;
        });
    }

    public function supervisorApprove(KpiEntry $entry, User $actor, ?string $comment = null): KpiEntry
    {
        $region = $entry->team->region;
        // Assign to whichever regional HRBP currently has the lightest open queue.
        $hr = $region
            ?->hrbps()
            ->withCount(['kpiEntries as open_reviews' => fn($q) => $q->where('status', 'supervisor_approved')])
            ->orderBy('open_reviews')
            ->first();

        if (! $hr) {
            try {
                $hr = User::role('HR Business Partner')->first();
            } catch (\Throwable) {
                $hr = null;
            }
        }
        return DB::transaction(function () use ($entry, $actor, $comment, $hr) {
            $entry->update([
                'status' => 'supervisor_approved',
                'current_approver_id' => $hr?->id,
            ]);

            $entry->logs()->create([
                'actor_id' => $actor->id,
                'stage' => 'supervisor',
                'action' => 'approved',
                'comment' => $comment,
            ]);

            return $entry;
        });
    }

    public function supervisorReturn(KpiEntry $entry, User $actor, string $comment): KpiEntry
    {
        $entry->update(['status' => 'supervisor_returned', 'current_approver_id' => $entry->user_id]);
        $entry->logs()->create([
            'actor_id' => $actor->id,
            'stage' => 'supervisor',
            'action' => 'returned',
            'comment' => $comment,
        ]);

        return $entry;
    }

    public function hrApprove(KpiEntry $entry, User $actor, ?string $comment = null): KpiEntry
    {
        $entry->update([
            'status' => 'hr_approved',
            'current_approver_id' => null,
            'finalized_at' => now(),
        ]);

        $entry->logs()->create([
            'actor_id' => $actor->id,
            'stage' => 'hr',
            'action' => 'approved',
            'comment' => $comment,
        ]);

        return $entry;
    }

    public function hrReturn(KpiEntry $entry, User $actor, string $comment): KpiEntry
    {
        $supervisor = $entry->user->resolveSupervisorForKpi();

        $entry->update(['status' => 'hr_returned', 'current_approver_id' => $supervisor?->id]);
        $entry->logs()->create([
            'actor_id' => $actor->id,
            'stage' => 'hr',
            'action' => 'returned',
            'comment' => $comment,
        ]);

        return $entry;
    }
}
