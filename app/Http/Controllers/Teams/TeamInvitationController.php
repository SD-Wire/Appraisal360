<?php

namespace App\Http\Controllers\Teams;

use App\Actions\Teams\AcceptTeamInvitation;
use App\Enums\TeamRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Teams\CreateTeamInvitationRequest;
use App\Http\Requests\Teams\RespondToTeamInvitationRequest;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Notifications\Teams\TeamInvitation as TeamInvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class TeamInvitationController extends Controller
{
    /**
     * Store a newly created invitation.
     */
    public function store(CreateTeamInvitationRequest $request, Team $team): RedirectResponse
    {
        Gate::authorize('inviteMember', $team);

        $orgRole = $request->validated('org_role');

        $invitation = $team->invitations()->create([
            'email' => $request->validated('email'),
            'org_role' => $orgRole,
            'department_id' => $request->validated('department_id'),
            'role' => $this->teamRoleFor($orgRole),
            'invited_by' => $request->user()->id,
            'expires_at' => now()->addDays(3),
        ]);

        if (!app()->isProduction()) {
            TeamInvitationNotification::dumpToLog($invitation);
        }

        try {
            Notification::route('mail', $invitation->email)
                ->notify(new TeamInvitationNotification($invitation));
        } catch (\Throwable $e) {
            if (app()->isProduction()) {
                throw $e;
            }
            \Illuminate\Support\Facades\Log::warning("Could not dispatch invitation email via mailer in test environment: {$e->getMessage()}");
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation sent.')]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    public function resend(Team $team, TeamInvitation $invitation): RedirectResponse
    {
        abort_unless($invitation->team_id === $team->id, 404);

        Gate::authorize('inviteMember', $team);

        $invitation->update(['expires_at' => now()->addDays(3)]);

        if (!app()->isProduction()) {
            TeamInvitationNotification::dumpToLog($invitation);
        }

        try {
            Notification::route('mail', $invitation->email)
                ->notify(new TeamInvitationNotification($invitation));
        } catch (\Throwable $e) {
            if (app()->isProduction()) {
                throw $e;
            }
            \Illuminate\Support\Facades\Log::warning("Could not resend invitation email via mailer in test environment: {$e->getMessage()}");
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation resent.')]);
        return to_route('teams.edit', ['team' => $team->slug]);
    }

    /**
     * Cancel the specified invitation.
     */
    public function destroy(Team $team, TeamInvitation $invitation): RedirectResponse
    {
        abort_unless($invitation->team_id === $team->id, 404);

        Gate::authorize('cancelInvitation', $team);

        $invitation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation cancelled.')]);

        return to_route('teams.edit', ['team' => $team->slug]);
    }

    public function accept(
        RespondToTeamInvitationRequest $request,
        TeamInvitation $invitation,
        AcceptTeamInvitation $acceptTeamInvitation,
    ): RedirectResponse {
        $acceptTeamInvitation->handle($request->user(), $invitation);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation accepted.')]);

        return to_route('dashboard');
    }

    public function decline(RespondToTeamInvitationRequest $request, TeamInvitation $invitation): RedirectResponse
    {
        $invitation->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation declined.')]);

        return to_route('dashboard');
    }

    private function teamRoleFor(string $orgRole): TeamRole
    {
        return match ($orgRole) {
            'Branch Manager', 'HOD', 'RM', 'RSTL' => TeamRole::Admin,
            default => TeamRole::Member,
        };
    }
}
