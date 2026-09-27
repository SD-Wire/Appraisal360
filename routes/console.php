<?php

use App\Models\TeamInvitation;
use Illuminate\Support\Facades\Schedule;

Schedule::call(function () {
    TeamInvitation::query()
        ->whereNotNull('expires_at')
        ->where('expires_at', '<', now())
        ->delete();
})->daily()->description('Delete expired team invitations');

Schedule::command('appraisals:send-daily-reminders')
    ->dailyAt('08:00')
    ->description('Send automated daily reminders to users with incomplete assigned appraisals');

Artisan::command('teams:dump-invitations {email?} {--test : Generate and dump a sample test invitation email to logs}', function (?string $email = null) {
    if ($this->option('test')) {
        $team = \App\Models\Team::first() ?? new \App\Models\Team(['name' => 'Sample Branch', 'slug' => 'sample-branch']);
        $inviter = \App\Models\User::first() ?? new \App\Models\User(['name' => 'Admin User', 'email' => 'admin@progressive.co.ke']);

        $invitation = new TeamInvitation([
            'email' => $email ?? 'test.member@progressive.co.ke',
            'role' => \App\Enums\TeamRole::Member,
            'org_role' => 'Branch Staff',
            'invited_by' => $inviter->id ?? 1,
            'expires_at' => now()->addDays(3),
        ]);
        $invitation->code = \Illuminate\Support\Str::random(64);
        $invitation->setRelation('team', $team);
        $invitation->setRelation('inviter', $inviter);

        \App\Notifications\Teams\TeamInvitation::dumpToLog($invitation);

        $this->info("Sample test invitation dumped to logs and console:");
        $this->line("• [{$team->name}] To: {$invitation->email}");
        $this->line("  Role: " . ($invitation->org_role ?? 'Member'));
        $this->line("  Accept URL: " . route('login', ['invitation' => $invitation->code]));
        $this->line("  Expires: " . $invitation->expires_at->toDateTimeString());
        $this->info("\n✓ Successfully dumped sample invitation to storage/logs/laravel.log.");
        return;
    }

    $query = TeamInvitation::query()->with(['team', 'inviter'])->whereNull('accepted_at');

    if ($email) {
        $query->where('email', $email);
    }

    $invitations = $query->latest()->get();

    if ($invitations->isEmpty()) {
        $this->warn('No pending team invitations found' . ($email ? " for {$email}" : '') . '. Use --test to generate and dump a sample test invitation.');
        return;
    }

    $this->info("Found {$invitations->count()} pending invitation(s). Dumping to logs and console:\n");

    foreach ($invitations as $invitation) {
        \App\Notifications\Teams\TeamInvitation::dumpToLog($invitation);
        $this->line("• [{$invitation->team?->name}] To: {$invitation->email}");
        $this->line("  Role: " . ($invitation->org_role ?? $invitation->role?->value));
        $this->line("  Accept URL: " . route('login', ['invitation' => $invitation->code]));
        $this->line("  Expires: " . ($invitation->expires_at?->toDateTimeString() ?? 'N/A') . "\n");
    }

    $this->info("All invitations dumped to storage/logs/laravel.log.");
})->purpose('Dump pending team invitation emails to logs for test environment usage');
