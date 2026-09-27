<?php

namespace App\Console\Commands;

use App\Notifications\PendingAppraisalDailyReminder;
use App\Services\PendingAppraisalsReportService;
use Illuminate\Console\Command;

class SendPendingAppraisalReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'appraisals:send-daily-reminders 
                            {--user= : Specific User ID to target}
                            {--dry-run : Simulate sending without dispatching actual notifications}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send daily automated reminder emails to users with incomplete assigned appraisals before the submission deadline';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $targetUserId = $this->option('user') ? (int) $this->option('user') : null;
        $isDryRun = (bool) $this->option('dry-run');

        $this->info("Scanning users with incomplete assigned appraisals (360 Appraisal and KPI Evaluation)...");

        $recipients = PendingAppraisalsReportService::getEligibleReminderRecipients($targetUserId);

        if ($recipients->isEmpty()) {
            $this->info("✓ No users eligible for appraisal reminders today (all completed or submission deadlines have passed).");
            return self::SUCCESS;
        }

        $this->info("Found {$recipients->count()} user(s) with remaining appraisals within active submission deadlines.\n");

        $sentCount = 0;

        foreach ($recipients as $item) {
            $user = $item['user'];
            $data = $item['data'];

            $this->line("• User: [{$user->id}] {$user->name} <{$user->email}>");
            $this->line("  Department: " . ($user->department?->name ?? 'N/A') . " | Branch: " . ($user->currentTeam?->name ?? 'N/A'));
            $this->line("  Completed: {$data['total_completed']} | Remaining: {$data['total_remaining']}");
            $this->line("  Deadline:  " . ($data['earliest_deadline'] ?? 'N/A') . " (" . ($data['days_left'] ?? 0) . " days left)");
            $this->line("  Appraisees remaining: " . implode(', ', $data['all_appraisees_remaining']));

            if ($isDryRun) {
                $this->comment("  [DRY-RUN] Email not sent.\n");
            } else {
                $teamSlug = $user->currentTeam?->slug ?? 'default';
                $actionUrl = url("/{$teamSlug}/dashboard");

                $user->notify(new PendingAppraisalDailyReminder($data, $actionUrl));
                $sentCount++;
                $this->info("  ✓ Reminder email sent successfully.\n");
            }
        }

        if ($isDryRun) {
            $this->warn("Completed dry run. {$recipients->count()} user(s) would be notified.");
        } else {
            $this->info("✓ Completed. Successfully sent reminders to {$sentCount} user(s).");
        }

        return self::SUCCESS;
    }
}
