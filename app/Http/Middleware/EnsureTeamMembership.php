<?php

namespace App\Http\Middleware;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Closure;

class EnsureTeamMembership
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, ?string $minimumRole = null): Response
    {
        [$user, $team] = [$request->user(), $this->team($request)];

        abort_if(!$user || !$team, 403);

        // Bind the resolved model back onto the route so downstream code
        // (controllers, FormRequests, policies) gets a Team, not a string.
        $request->route()->setParameter('current_team', $team);

        $isSuperAdmin = $user->isSuperAdmin();
        $isHrbp = $user->isHrbp();

        $canAccessTeam = $isSuperAdmin
            || $user->belongsToTeam($team)
            || ($isHrbp && ($user->hrRegions->isEmpty() || $user->isHrbpForRegion($team->region)));

        if (!$canAccessTeam) {
            abort(403, 'You are not a member of this team.');
        }

        if (!$isSuperAdmin && !$isHrbp) {
            $membership = $user->teamMemberships()->where('team_id', $team->id)->first();
            abort_if($membership?->suspended_at !== null, 403, __('Your access to this team has been suspended.'));
            $this->ensureTeamMemberHasRequiredRole($user, $team, $minimumRole);
        }

        if ($request->route('current_team') && !$user->isCurrentTeam($team)) {
            $user->switchTeam($team);
        }

        return $next($request);
    }

    /**
     * Ensure the given user has at least the given role, if applicable.
     */
    protected function ensureTeamMemberHasRequiredRole(User $user, Team $team, ?string $minimumRole): void
    {
        if ($minimumRole === null) {
            return;
        }

        $role = $user->teamRole($team);

        $requiredRole = TeamRole::tryFrom($minimumRole);

        abort_if(
            $requiredRole === null ||
                $role === null ||
                !$role->isAtLeast($requiredRole),
            403,
        );
    }

    /**
     * Get the team associated with the request.
     */
    protected function team(Request $request): ?Team
    {
        $team = $request->route('current_team') ?? $request->route('team');

        if (is_string($team)) {
            $team = Team::where('slug', $team)->first();
        }

        return $team;
    }
}
