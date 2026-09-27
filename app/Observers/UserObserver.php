<?php

namespace App\Observers;

use App\Models\User;

class UserObserver
{
    public function saved(User $user): void
    {
        if (($user->hasRole('HOD') || $user->hasRole('Branch Manager')) && !$user->supervisor_id) {
            report_a_warning:  // replace with your logging/notification of choice
            \Log::warning("User {$user->id} ({$user->name}) holds a supervisory role but has no supervisor_id set.");
        }
    }
}
