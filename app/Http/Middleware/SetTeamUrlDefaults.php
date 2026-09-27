<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Response;

class SetTeamUrlDefaults
{
    /**
     * Set the default URL parameters for team-based routes.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $currentTeam = $user->currentTeam;

            if (!$currentTeam) {
                $fallback = $user->fallbackTeam();
                if ($fallback) {
                    $user->switchTeam($fallback);
                    $currentTeam = $fallback;
                }
            }

            if ($currentTeam) {
                URL::defaults([
                    'current_team' => $currentTeam->slug,
                    'team' => $currentTeam->slug,
                ]);
            }
        }

        return $next($request);
    }
}
