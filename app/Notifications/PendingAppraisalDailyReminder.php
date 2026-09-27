<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class PendingAppraisalDailyReminder extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public array $appraisalData,
        public ?string $customActionUrl = null,
        public ?string $managerNote = null
    ) {}

    public function shouldQueue(object $notifiable, string $channel): bool
    {
        return app()->isProduction();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $userName = $this->appraisalData['name'] ?? $notifiable->name ?? 'Staff Member';
        $totalCompleted = $this->appraisalData['total_completed'] ?? 0;
        $totalRemaining = $this->appraisalData['total_remaining'] ?? 0;
        $earliestDeadline = $this->appraisalData['earliest_deadline'] ?? null;
        $daysLeft = $this->appraisalData['days_left'] ?? null;
        $appraiseesRemaining = $this->appraisalData['all_appraisees_remaining'] ?? [];

        $defaultTeamSlug = $notifiable->currentTeam?->slug ?? 'default';
        $actionUrl = $this->customActionUrl ?: url("/{$defaultTeamSlug}/dashboard");

        if (!app()->isProduction()) {
            static::dumpToLog($notifiable, $this->appraisalData, $actionUrl);
        }

        return (new MailMessage)
            ->subject(__("Appraisal Action Required: :remaining Outstanding Appraisal(s) — Progressive Credit", [
                'remaining' => $totalRemaining,
            ]))
            ->markdown('emails.pending-appraisal-reminder', [
                'userName'            => $userName,
                'totalCompleted'      => $totalCompleted,
                'totalRemaining'      => $totalRemaining,
                'earliestDeadline'    => $earliestDeadline,
                'daysLeft'            => $daysLeft,
                'appraiseesRemaining' => $appraiseesRemaining,
                'actionUrl'           => $actionUrl,
                'managerNote'         => $this->managerNote,
            ]);
    }

    /**
     * Dump email details to application logs in development / test environments.
     */
    public static function dumpToLog(object $notifiable, array $data, string $actionUrl): void
    {
        $recipient = $notifiable->email ?? 'unknown@progressive.co.ke';
        $remaining = $data['total_remaining'] ?? 0;
        $deadline = $data['earliest_deadline'] ?? 'N/A';
        $appraisees = implode(', ', $data['all_appraisees_remaining'] ?? []);

        $border = str_repeat('=', 78);
        $divider = str_repeat('-', 78);

        $logOutput = "\n{$border}\n"
            . "  PROGRESSIVE CREDIT — AUTOMATED DAILY APPRAISAL REMINDER\n"
            . "{$divider}\n"
            . "  Recipient:    {$notifiable->name} <{$recipient}>\n"
            . "  Completed:    {$data['total_completed']}\n"
            . "  Remaining:    {$remaining}\n"
            . "  Deadline:     {$deadline} (" . ($data['days_left'] ?? 0) . " days left)\n"
            . "  Appraisees:   {$appraisees}\n"
            . "  Action Link:  {$actionUrl}\n"
            . "{$border}\n";

        Log::info($logOutput);
    }
}
