<?php

namespace App\Notifications\Teams;

use App\Models\TeamInvitation as TeamInvitationModel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

class TeamInvitation extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public TeamInvitationModel $invitation)
    {
        //
    }

    /**
     * Determine if the notification should be queued.
     * In test and local environments, process synchronously to log immediately.
     */
    public function shouldQueue(object $notifiable, string $channel): bool
    {
        return app()->isProduction();
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $team = $this->invitation->team;
        $inviter = $this->invitation->inviter;
        $role = $this->invitation->role;
        $acceptUrl = route('login', ['invitation' => $this->invitation->code]);

        if (!app()->isProduction()) {
            static::dumpToLog($this->invitation, $notifiable);
        }

        return (new MailMessage)
            ->subject(__("You've been invited to join :teamName — Progressive Credit", ['teamName' => $team?->name ?? 'Team']))
            ->markdown('emails.team-invitation', [
                'teamName' => $team?->name ?? 'Team',
                'inviterName' => $inviter?->name ?? 'A team administrator',
                'inviterEmail' => $inviter?->email ?? '',
                'roleLabel' => method_exists($role, 'label') ? $role->label() : ucfirst($this->invitation->role?->value ?? 'Member'),
                'acceptUrl' => $acceptUrl,
            ]);
    }

    /**
     * Dump team invitation email details to the application log for test environment usage.
     */
    public static function dumpToLog(TeamInvitationModel $invitation, ?object $notifiable = null): void
    {
        $invitation->loadMissing(['team', 'inviter']);
        $team = $invitation->team;
        $inviter = $invitation->inviter;
        $role = $invitation->role;
        $recipientEmail = $notifiable?->routes['mail'] ?? $notifiable?->email ?? $invitation->email;
        $acceptUrl = route('login', ['invitation' => $invitation->code]);
        $registerUrl = route('register', ['invitation' => $invitation->code]);
        $roleLabel = method_exists($role, 'label') ? $role->label() : ucfirst($invitation->role?->value ?? 'Member');
        $subject = __("You've been invited to join :teamName — Progressive Credit", ['teamName' => $team?->name ?? 'Team']);

        $border = str_repeat('=', 78);
        $divider = str_repeat('-', 78);

        $logOutput = implode(PHP_EOL, [
            $border,
            '📨 [TEST ENVIRONMENT] TEAM INVITATION EMAIL DUMP',
            $border,
            "Recipient:        {$recipientEmail}",
            "Subject:          {$subject}",
            "Team:             " . ($team?->name ?? 'N/A') . " (Slug: " . ($team?->slug ?? 'N/A') . ")",
            "Role:             {$roleLabel} (Org Role: " . ($invitation->org_role ?? 'N/A') . ")",
            "Invited By:       " . ($inviter?->name ?? 'Administrator') . " (" . ($inviter?->email ?? 'N/A') . ")",
            "Invitation Code:  {$invitation->code}",
            "Accept/Login URL: {$acceptUrl}",
            "Register URL:     {$registerUrl}",
            "Expires At:       " . ($invitation->expires_at?->toDateTimeString() ?? 'N/A'),
            $divider,
            "Email Body Preview:",
            "  Hello,",
            "  " . ($inviter?->name ?? 'A team administrator') . " has invited you to join {$team?->name} on Appraise360.",
            "  To accept and log in: {$acceptUrl}",
            $border,
        ]);

        Log::info($logOutput);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'invitation_id' => $this->invitation->id,
            'team_id' => $this->invitation->team_id,
            'team_name' => $this->invitation->team?->name,
            'role' => $this->invitation->role?->value,
        ];
    }
}
