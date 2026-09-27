<?php

namespace App\Policies;

use App\Models\KpiEntry;
use App\Models\User;

class KpiEntryPolicy
{
    public function view(User $user, KpiEntry $entry): bool
    {
        return $user->id === $entry->user_id ||
            $user->id === $entry->current_approver_id ||
            $user->can('kpi.view-all-branches');
    }

    public function update(User $user, KpiEntry $entry): bool
    {
        return $user->id === $entry->user_id && in_array($entry->status, ['draft', 'supervisor_returned', 'hr_returned']);
    }

    public function reviewAsSupervisor(User $user, KpiEntry $entry): bool
    {
        return in_array($entry->status, ['submitted', 'hr_returned'])
            && $user->id === $entry->current_approver_id;
    }

    public function reviewAsHr(User $user, KpiEntry $entry): bool
    {
        return $entry->status === 'supervisor_approved' &&
            $user->can('kpi.approve-hr') &&
            $user->isHrbpForRegion($entry->team->region);
    }

    public function evaluateSelf(User $user, KpiEntry $entry): bool
    {
        return $user->id === $entry->user_id
            && $entry->status === 'hr_approved'
            && in_array($entry->evaluation_status, ['pending', 'supervisor_returned'])
            && $entry->cycle?->phase === 'evaluation';
    }

    public function reviewEvaluationAsSupervisor(User $user, KpiEntry $entry): bool
    {
        $isSupervisor = $user->id === $entry->current_approver_id
            || $entry->user->resolveSupervisorForKpi()?->id === $user->id
            || $entry->user->supervisor_id === $user->id;

        return $isSupervisor
            && in_array($entry->evaluation_status, ['self_submitted', 'completed']);
    }

    public function viewStaffEvaluationReview(User $user, KpiEntry $entry): bool
    {
        return $entry->current_approver_id === $user->id
            || $entry->user->resolveSupervisorForKpi()?->id === $user->id
            || $entry->user->supervisor_id === $user->id
            || KpiEntry::query()
                ->where('kpi_cycle_id', $entry->kpi_cycle_id)
                ->where('user_id', $entry->user_id)
                ->where(function ($q) use ($user) {
                    $q->where('current_approver_id', $user->id)
                        ->orWhereIn('evaluation_status', ['self_submitted', 'completed']);
                })
                ->exists();
    }
}
